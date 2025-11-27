import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

/**
 * DELETE - Reject/Delete a review
 */
export async function DELETE(
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

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return createErrorResponse({ message: "Review not found" }, 404);
    }

    // Mark as rejected (or delete if preferred)
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "REJECTED",
        isModerated: true,
        moderatedAt: new Date(),
      },
    });

    // Alternatively, delete the review:
    // await prisma.review.delete({ where: { id: reviewId } });

    return createSuccessResponse(
      { id: reviewId },
      "Review rejected successfully",
    );
  } catch (error) {
    console.error("Error rejecting review:", error);
    return createErrorResponse(error);
  }
}
