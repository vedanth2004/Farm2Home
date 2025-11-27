import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { requirePermission } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requirePermission("write:reviews");

    const reviewId = params.id;
    const body = await request.json();
    const { approve } = body;

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        isModerated: true,
        moderatedAt: new Date(),
      },
    });

    if (!approve) {
      // If not approved, we can delete or mark as rejected
      await prisma.review.delete({
        where: { id: reviewId },
      });
      return createSuccessResponse(
        { message: "Review rejected and deleted" },
        "Review moderated",
      );
    }

    return createSuccessResponse(review, "Review approved successfully");
  } catch (error) {
    console.error("Error moderating review:", error);
    return createErrorResponse(error);
  }
}
