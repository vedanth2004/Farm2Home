import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customer-predictions
 * Get customer predictions with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access predictions
    await requirePermission("read:analytics");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category");
    const customerId = searchParams.get("customerId");

    const where: any = {};
    if (category) {
      where.predictedCategory = category;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const [predictions, total] = await Promise.all([
      prisma.customerPrediction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          predictionProbability: "desc",
        },
      }),
      prisma.customerPrediction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: predictions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customer predictions:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer predictions" },
      { status: 500 },
    );
  }
}
