import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parsePagination, createPaginatedResponse } from "@/lib/pagination";
import { cache, cacheKeys } from "@/lib/cache";
import { filterFarmersByDistance } from "@/lib/geocoding-distance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Filter parameters
    const category = searchParams.get("category");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const farmerId = searchParams.get("farmerId");
    const searchQuery = searchParams.get("search");

    // Sorting parameters
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Pagination - use standardized utility (default 100 for customer browsing)
    const pagination = parsePagination(request, 100);
    const cacheKey = cacheKeys.products(
      pagination.page!,
      pagination.limit!,
      JSON.stringify({
        category,
        minPrice,
        maxPrice,
        farmerId,
        searchQuery,
        sortBy,
        sortOrder,
      }),
    );

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return createSuccessResponse(
        cached,
        "Products fetched successfully (cached)",
      );
    }

    // For customers, filter products by distance (50km from customer to farmer)
    let visibleFarmerIds: string[] | undefined;
    if (userId && session?.user?.role !== "ADMIN") {
      // Get customer's address to find their pincode
      const customer = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (customer?.addresses?.[0]?.postalCode) {
        // Filter farmers within 50km of customer using Haversine formula
        // Customer can only see products from farmers within 50km
        visibleFarmerIds = await filterFarmersByDistance(
          customer.addresses[0].postalCode,
        );
      }
    }

    // Build where clause
    const where: any = {
      listings: {
        some: {
          isActive: true,
        },
      },
    };

    // For customers, only show products from farmers within 50km
    if (visibleFarmerIds !== undefined) {
      if (visibleFarmerIds.length === 0) {
        // No farmers within range, return empty results
        const emptyResponse = createPaginatedResponse([], 0, pagination);
        return createSuccessResponse(
          {
            ...emptyResponse,
            filters: {
              categories: [],
              minPrice: 0,
              maxPrice: 0,
            },
          },
          "No products available in your area",
        );
      }

      // If specific farmerId is requested, ensure it's in the visible list
      if (farmerId) {
        if (!visibleFarmerIds.includes(farmerId)) {
          // Requested farmer is not within 50km, return empty
          const emptyResponse = createPaginatedResponse([], 0, pagination);
          return createSuccessResponse(
            {
              ...emptyResponse,
              filters: {
                categories: [],
                minPrice: 0,
                maxPrice: 0,
              },
            },
            "This farmer is not available in your area",
          );
        }
        // Farmer is visible, filter by specific farmer
        where.farmerId = farmerId;
      } else {
        // No specific farmer requested, show all visible farmers
        where.farmerId = { in: visibleFarmerIds };
      }
    } else {
      // Admin or no distance filtering - apply farmerId filter if provided
      if (farmerId) {
        where.farmerId = farmerId;
      }
    }

    if (category && category !== "all") {
      where.category = {
        equals: category,
        mode: "insensitive",
      };
    }

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { category: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: "desc" };

    console.log("🔍 API: Fetching products with filters:", {
      category,
      minPrice,
      maxPrice,
      farmerId,
      searchQuery,
      sortBy,
      sortOrder,
      page: pagination.page,
      limit: pagination.limit,
    });

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          farmer: {
            include: {
              user: {
                include: {
                  addresses: {
                    take: 1,
                  },
                },
              },
            },
          },
          listings: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            // Don't limit - we want all listings for products with same name
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Get reviews for products to calculate ratings
    const productIds = products.map((p) => p.id);
    const reviews = await prisma.review.findMany({
      where: {
        targetType: "PRODUCT",
        targetId: { in: productIds },
        isModerated: true,
      },
      select: {
        targetId: true,
        rating: true,
      },
    });

    // Calculate average ratings
    const ratingsMap = new Map<string, { sum: number; count: number }>();
    reviews.forEach((review) => {
      const existing = ratingsMap.get(review.targetId) || { sum: 0, count: 0 };
      ratingsMap.set(review.targetId, {
        sum: existing.sum + review.rating,
        count: existing.count + 1,
      });
    });

    // Get wishlist items for user
    let wishlistProductIds: string[] = [];
    if (userId) {
      const wishlistItems = await prisma.wishlistItem.findMany({
        where: { userId },
        select: { productId: true },
      });
      wishlistProductIds = wishlistItems.map((item) => item.productId);
    }

    // Process products with price filtering and sorting
    let processedProducts = products.map((product) => {
      const activeListing = product.listings[0];
      const price = activeListing
        ? Number(activeListing.storePrice || activeListing.pricePerUnit)
        : 0;

      const ratingData = ratingsMap.get(product.id);
      const averageRating = ratingData ? ratingData.sum / ratingData.count : 0;
      const reviewCount = ratingData?.count || 0;

      return {
        ...product,
        price,
        averageRating,
        reviewCount,
        isInWishlist: wishlistProductIds.includes(product.id),
      };
    });

    // Apply price filters
    if (minPrice) {
      processedProducts = processedProducts.filter(
        (p) => p.price >= parseFloat(minPrice),
      );
    }
    if (maxPrice) {
      processedProducts = processedProducts.filter(
        (p) => p.price <= parseFloat(maxPrice),
      );
    }

    // Apply sorting
    if (sortBy === "price") {
      processedProducts.sort((a, b) => {
        const diff = a.price - b.price;
        return sortOrder === "asc" ? diff : -diff;
      });
    } else if (sortBy === "popularity") {
      processedProducts.sort((a, b) => {
        const diff = (b.reviewCount || 0) - (a.reviewCount || 0);
        return sortOrder === "asc" ? -diff : diff;
      });
    } else if (sortBy === "rating") {
      processedProducts.sort((a, b) => {
        const diff = (b.averageRating || 0) - (a.averageRating || 0);
        return sortOrder === "asc" ? -diff : diff;
      });
    }

    // Get unique categories
    const categories = await prisma.product.findMany({
      where: {
        listings: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    console.log(
      `📦 API: Found ${processedProducts.length} products (total: ${total})`,
    );

    // Create paginated response
    const response = createPaginatedResponse(
      processedProducts,
      total,
      pagination,
    );

    // Add filters to response
    const finalResponse = {
      ...response,
      filters: {
        categories: categories.map((c) => c.category),
        minPrice:
          processedProducts.length > 0
            ? Math.min(...processedProducts.map((p) => p.price))
            : 0,
        maxPrice:
          processedProducts.length > 0
            ? Math.max(...processedProducts.map((p) => p.price))
            : 0,
      },
    };

    // Cache for 1 minute
    cache.set(cacheKey, finalResponse, 60 * 1000);

    return createSuccessResponse(
      finalResponse,
      "Products fetched successfully",
    );
  } catch (error) {
    console.error("💥 API: Error fetching products:", error);
    return createErrorResponse(error);
  }
}
