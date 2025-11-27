import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("read:reviews");

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all";

    const where: any = {};

    if (filter === "pending") {
      where.isModerated = false;
    } else if (filter === "approved") {
      where.isModerated = true;
    }

    const reviews = await prisma.review.findMany({
      where,
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

    return createSuccessResponse(reviews, "Reviews fetched successfully");
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return createErrorResponse(error);
  }
}
