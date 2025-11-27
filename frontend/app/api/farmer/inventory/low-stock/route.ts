import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLowStockAlerts } from "@/lib/inventory";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        farmerProfile: true,
      },
    });

    if (!user || !user.farmerProfile || user.role !== "FARMER") {
      return createErrorResponse({ message: "Farmer profile not found" }, 403);
    }

    const lowStockItems = await getLowStockAlerts(user.farmerProfile.id);

    return createSuccessResponse(
      {
        items: lowStockItems,
        count: lowStockItems.length,
        outOfStock: lowStockItems.filter((item) => item.isOutOfStock).length,
        lowStock: lowStockItems.filter(
          (item) => item.isLowStock && !item.isOutOfStock,
        ).length,
      },
      "Low stock alerts fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    return createErrorResponse(error);
  }
}
