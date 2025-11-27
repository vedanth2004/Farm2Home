import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    const userId = session.user.id;

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            farmer: {
              include: {
                user: {
                  select: {
                    name: true,
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
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get ratings for products
    const productIds = wishlistItems.map((item) => item.product.id);
    const reviews = await prisma.review.findMany({
      where: {
        targetType: "PRODUCT",
        targetId: { in: productIds },
        isModerated: true,
      },
    });

    const ratingsMap = new Map<string, { sum: number; count: number }>();
    reviews.forEach((review) => {
      const existing = ratingsMap.get(review.targetId) || { sum: 0, count: 0 };
      ratingsMap.set(review.targetId, {
        sum: existing.sum + review.rating,
        count: existing.count + 1,
      });
    });

    const products = wishlistItems.map((item) => {
      const activeListing = item.product.listings[0];
      const price = activeListing
        ? Number(activeListing.storePrice || activeListing.pricePerUnit)
        : 0;
      const ratingData = ratingsMap.get(item.product.id);
      const averageRating = ratingData ? ratingData.sum / ratingData.count : 0;

      return {
        ...item.product,
        price,
        averageRating,
        reviewCount: ratingData?.count || 0,
        addedAt: item.createdAt,
      };
    });

    return createSuccessResponse(products, "Wishlist fetched successfully");
  } catch (error) {
    console.error("💥 API: Error fetching wishlist:", error);
    return createErrorResponse(error);
  }
}

// POST - Add to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    const userId = session.user.id;
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return createErrorResponse({ message: "Product ID is required" }, 400);
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      return createSuccessResponse(
        { message: "Product already in wishlist" },
        "Already in wishlist",
      );
    }

    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: true,
      },
    });

    return createSuccessResponse(wishlistItem, "Product added to wishlist");
  } catch (error) {
    console.error("💥 API: Error adding to wishlist:", error);
    return createErrorResponse(error);
  }
}

// DELETE - Remove from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");

    if (!productId) {
      return createErrorResponse({ message: "Product ID is required" }, 400);
    }

    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return createSuccessResponse(
      { message: "Product removed from wishlist" },
      "Removed successfully",
    );
  } catch (error) {
    console.error("💥 API: Error removing from wishlist:", error);
    return createErrorResponse(error);
  }
}
