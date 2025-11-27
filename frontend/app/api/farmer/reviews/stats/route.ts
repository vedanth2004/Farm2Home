import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET - Get review statistics for the logged-in farmer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    // Get farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) {
      return createErrorResponse({ message: "Farmer profile not found" }, 404);
    }

    // Get all products for this farmer
    const products = await prisma.product.findMany({
      where: { farmerId: farmerProfile.id },
      select: { id: true, name: true },
    });

    const productIds = products.map((p) => p.id);

    // Get all approved reviews for these products
    const reviews = await prisma.review.findMany({
      where: {
        productId: { in: productIds },
        status: "APPROVED",
        targetType: "PRODUCT",
      },
      select: { productId: true, rating: true },
    });

    // Calculate statistics
    const totalReviews = reviews.length;

    const allRatings = reviews.map((r) => r.rating);
    const averageRating =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
        : 0;

    // Find top rated product
    let topProduct: { name: string; avgRating: number } | null = null;
    if (reviews.length > 0 && productIds.length > 0) {
      // Group by product
      const productRatings = new Map<string, number[]>();
      reviews.forEach((r) => {
        if (r.productId) {
          if (!productRatings.has(r.productId)) {
            productRatings.set(r.productId, []);
          }
          productRatings.get(r.productId)!.push(r.rating);
        }
      });

      // Find top product
      products.forEach((product) => {
        const ratings = productRatings.get(product.id);
        if (ratings && ratings.length > 0) {
          const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
          if (!topProduct || avg > topProduct.avgRating) {
            topProduct = {
              name: product.name,
              avgRating: avg,
            };
          }
        }
      });
    }

    // Get rating trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviews = await prisma.review.findMany({
      where: {
        farmerId: farmerProfile.id,
        targetType: "PRODUCT",
        status: "APPROVED",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        rating: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by date and calculate average rating per day
    const ratingTrend = new Map<string, { count: number; sum: number }>();
    recentReviews.forEach((review) => {
      const date = new Date(review.createdAt).toISOString().split("T")[0];
      const existing = ratingTrend.get(date) || { count: 0, sum: 0 };
      ratingTrend.set(date, {
        count: existing.count + 1,
        sum: existing.sum + review.rating,
      });
    });

    const ratingTrendArray = Array.from(ratingTrend.entries())
      .map(([date, data]) => ({
        date,
        avgRating: data.sum / data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return createSuccessResponse(
      {
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        topProduct: topProduct
          ? (() => {
              const tp = topProduct as { name: string; avgRating: number };
              return {
                name: tp.name,
                avgRating: Number(tp.avgRating.toFixed(2)),
              };
            })()
          : null,
        ratingTrend: ratingTrendArray,
      },
      "Review statistics fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching farmer review stats:", error);
    return createErrorResponse(error);
  }
}
