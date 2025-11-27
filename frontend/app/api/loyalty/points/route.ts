/**
 * Loyalty Points API
 * GET: Get user's current points and transaction history
 * POST: Redeem points for discount
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redeemPoints } from "@/lib/loyalty";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("read:products"); // Customers can read their own points

    const url = new URL(request.url);
    const includeTransactions = url.searchParams.get("transactions") === "true";

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        loyaltyPoints: true,
        referralCode: true,
        ...(includeTransactions
          ? {
              loyaltyTransactions: {
                orderBy: { createdAt: "desc" },
                take: 50,
              },
            }
          : {}),
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        points: user.loyaltyPoints,
        referralCode: user.referralCode,
        ...(includeTransactions && "loyaltyTransactions" in user
          ? { transactions: user.loyaltyTransactions }
          : {}),
      },
    });
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty points" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("read:products");

    const { pointsToRedeem, orderId } = await request.json();

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return NextResponse.json(
        { error: "Invalid points amount" },
        { status: 400 },
      );
    }

    const result = await redeemPoints(session.user.id, pointsToRedeem, orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to redeem points" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        discountAmount: result.discountAmount,
        pointsRedeemed: pointsToRedeem,
      },
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    return NextResponse.json(
      { error: "Failed to redeem points" },
      { status: 500 },
    );
  }
}
