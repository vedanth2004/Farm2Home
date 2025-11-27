import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET - Get all pending reviews
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    // Check admin permission
    await requirePermission("write:reviews");

    const reviews = await prisma.review.findMany({
      where: {
        status: "PENDING",
        targetType: "PRODUCT",
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

    // Get product and farmer info for each review
    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        if (!review.productId) return null;

        const product = await prisma.product.findUnique({
          where: { id: review.productId },
          include: {
            farmer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        return {
          ...review,
          product: product
            ? {
                id: product.id,
                name: product.name,
              }
            : null,
          farmer: product?.farmer
            ? {
                id: product.farmer.id,
                name: product.farmer.user.name,
              }
            : null,
        };
      }),
    );

    const filteredReviews = reviewsWithDetails.filter(
      (r) => r !== null,
    ) as any[];

    return createSuccessResponse(
      filteredReviews,
      "Pending reviews fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    return createErrorResponse(error);
  }
}
