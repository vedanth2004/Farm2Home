import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const productId = params.id;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
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
          // Get all active listings for this product
        },
        _count: {
          select: {
            wishlistItems: true,
          },
        },
      },
    });

    if (!product) {
      return createErrorResponse({ message: "Product not found" }, 404);
    }

    // Find all products with the same name from different farmers (within customer's visible range)
    let allProductsWithSameName: any[] = [product];

    if (session?.user?.role !== "ADMIN") {
      // Get customer's location to filter farmers
      if (userId) {
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
          const { filterFarmersByDistance } = await import(
            "@/lib/geocoding-distance"
          );
          const visibleFarmerIds = await filterFarmersByDistance(
            customer.addresses[0].postalCode,
          );

          if (visibleFarmerIds.length > 0) {
            // Get all products with same name from visible farmers
            const sameNameProducts = await prisma.product.findMany({
              where: {
                name: {
                  equals: product.name,
                  mode: "insensitive",
                },
                farmerId: { in: visibleFarmerIds },
                id: { not: productId }, // Exclude current product
              },
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
                },
              },
            });

            allProductsWithSameName = [product, ...sameNameProducts];
          }
        }
      }
    } else {
      // Admin can see all products with same name
      const sameNameProducts = await prisma.product.findMany({
        where: {
          name: {
            equals: product.name,
            mode: "insensitive",
          },
          id: { not: productId },
        },
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
          },
        },
      });

      allProductsWithSameName = [product, ...sameNameProducts];
    }

    // Get approved reviews and calculate rating
    const reviews = await prisma.review.findMany({
      where: {
        productId: productId,
        targetType: "PRODUCT",
        status: "APPROVED",
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Use product's stored averageRating or calculate from reviews
    let averageRating = product.averageRating || 0;
    if (reviews.length > 0 && product.averageRating === 0) {
      averageRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    }

    // Get farmer rating
    const farmerReviews = await prisma.review.findMany({
      where: {
        targetType: "FARMER",
        targetId: product.farmerId,
        isModerated: true,
      },
    });
    const farmerRating =
      farmerReviews.length > 0
        ? farmerReviews.reduce((sum, r) => sum + r.rating, 0) /
          farmerReviews.length
        : 0;

    // Check if in wishlist
    let isInWishlist = false;
    if (userId) {
      const wishlistItem = await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
      isInWishlist = !!wishlistItem;
    }

    // Calculate expected delivery time (simple estimate: 2-3 days)
    const expectedDeliveryDays = 2; // Can be enhanced with distance calculation

    const activeListing = product.listings[0];
    const price = activeListing
      ? Number(activeListing.storePrice || activeListing.pricePerUnit)
      : 0;

    // Format all products with same name (showing all farmers offering it)
    const availableFarmers = allProductsWithSameName
      .map((p) => ({
        productId: p.id,
        farmer: {
          id: p.farmer.id,
          name: p.farmer.user.name,
          verified: p.farmer.verified,
          location: p.farmer.user.addresses?.[0]
            ? `${p.farmer.user.addresses[0].city || ""}, ${p.farmer.user.addresses[0].state || ""}`
            : "Location not available",
        },
        listings: p.listings.map((listing: any) => ({
          id: listing.id,
          price: Number(listing.storePrice || listing.pricePerUnit),
          farmerPrice: Number(listing.farmerPrice || listing.pricePerUnit),
          availableQty: listing.availableQty,
          createdAt: listing.createdAt,
        })),
        // Best price listing
        bestPrice:
          p.listings.length > 0
            ? Math.min(
                ...p.listings.map((l: any) =>
                  Number(l.storePrice || l.pricePerUnit),
                ),
              )
            : 0,
      }))
      .sort((a, b) => a.bestPrice - b.bestPrice); // Sort by best price

    return createSuccessResponse({
      ...product,
      price,
      averageRating: product.averageRating || averageRating,
      reviewCount: product.totalReviews || reviews.length,
      reviews: reviews.slice(0, 10), // Latest 10 reviews
      farmerRating,
      farmerReviewCount: farmerReviews.length,
      isInWishlist,
      expectedDeliveryDays,
      availableQty: activeListing?.availableQty || 0,
      // New field: all farmers offering this product
      availableFarmers: availableFarmers,
      hasMultipleFarmers: availableFarmers.length > 1,
    });
  } catch (error) {
    console.error("💥 API: Error fetching product:", error);
    return createErrorResponse(error);
  }
}
