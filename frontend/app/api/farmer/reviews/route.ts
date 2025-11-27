import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET - Get all approved reviews for the logged-in farmer's products
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

    // Get all approved reviews for this farmer's products
    const reviews = await prisma.review.findMany({
      where: {
        farmerId: farmerProfile.id,
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
    });

    // Get product info for each review
    const reviewsWithProducts = await Promise.all(
      reviews.map(async (review) => {
        if (!review.productId) return null;

        const product = await prisma.product.findUnique({
          where: { id: review.productId },
          select: {
            id: true,
            name: true,
            category: true,
          },
        });

        return {
          ...review,
          product: product || null,
        };
      }),
    );

    const filteredReviews = reviewsWithProducts.filter(
      (r) => r !== null,
    ) as any[];

    return createSuccessResponse(
      filteredReviews,
      "Farmer reviews fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching farmer reviews:", error);
    return createErrorResponse(error);
  }
}
