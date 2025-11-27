import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

/**
 * PUT - Approve a review
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    // Check admin permission
    await requirePermission("write:reviews");

    const reviewId = params.id;

    // Get review with product info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        // We'll get product info to update
      },
    });

    if (!review) {
      return createErrorResponse({ message: "Review not found" }, 404);
    }

    if (review.status === "APPROVED") {
      return createErrorResponse(
        { message: "Review is already approved" },
        400,
      );
    }

    if (!review.productId) {
      return createErrorResponse(
        { message: "Product ID not found in review" },
        400,
      );
    }

    // Start a transaction to update review and product
    await prisma.$transaction(async (tx) => {
      // Update review status
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: "APPROVED",
          isModerated: true,
          moderatedAt: new Date(),
        },
      });

      // Get all approved reviews for this product
      const approvedReviews = await tx.review.findMany({
        where: {
          productId: review.productId,
          status: "APPROVED",
        },
        select: {
          rating: true,
        },
      });

      // Calculate new average rating and total reviews
      const totalReviews = approvedReviews.length;
      const averageRating =
        approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

      // Update product with new rating and review count
      await tx.product.update({
        where: { id: review.productId! }, // Non-null assertion: we already checked above
        data: {
          averageRating: averageRating,
          totalReviews: totalReviews,
        },
      });
    });

    return createSuccessResponse(
      { id: reviewId },
      "Review approved successfully",
    );
  } catch (error) {
    console.error("Error approving review:", error);
    return createErrorResponse(error);
  }
}
