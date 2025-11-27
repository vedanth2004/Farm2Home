import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/ml/churn/customer-data?customerId=xxx
 * Fetch customer data and calculate churn features from database
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session.user.role, "read:analytics")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }

    // Verify customer exists
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, role: true },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Customer not found or invalid role" },
        { status: 404 },
      );
    }

    // Fetch all orders for this customer (paid and not cancelled)
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        paymentStatus: "SUCCESS",
        status: {
          not: "CANCELLED",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        items: {
          include: {
            listing: {
              include: {
                product: {
                  select: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate features
    const total_orders = orders.length;

    // Last purchase date
    let last_purchase_date = "";
    if (orders.length > 0) {
      const lastOrder = orders[orders.length - 1];
      last_purchase_date = lastOrder.createdAt.toISOString().split("T")[0];
    } else {
      // No orders - use customer creation date or default
      const customerData = await prisma.user.findUnique({
        where: { id: customerId },
        select: { createdAt: true },
      });
      last_purchase_date = customerData?.createdAt
        ? customerData.createdAt.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
    }

    // Days since last order
    let days_since_last_order = 0;
    if (orders.length > 0) {
      const lastOrderDate = orders[orders.length - 1].createdAt;
      const daysDiff = Math.floor(
        (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      days_since_last_order = daysDiff;
    }

    // Total spend
    const total_spend = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );

    // Average gap days between orders
    let avg_gap_days = 0;
    if (orders.length > 1) {
      const gaps: number[] = [];
      for (let i = 1; i < orders.length; i++) {
        const daysDiff = Math.floor(
          (orders[i].createdAt.getTime() - orders[i - 1].createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysDiff > 0) {
          gaps.push(daysDiff);
        }
      }
      if (gaps.length > 0) {
        avg_gap_days = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      }
    } else if (orders.length === 1) {
      // Single order - use days since that order as gap
      avg_gap_days = days_since_last_order;
    }

    // Spend trend: Compare last 3 orders vs previous 3 orders
    let spend_trend = "stable";
    if (orders.length >= 3) {
      const last3Orders = orders.slice(-3);
      const previous3Orders = orders.slice(-6, -3);

      if (previous3Orders.length > 0) {
        const last3Avg =
          last3Orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) /
          last3Orders.length;
        const prev3Avg =
          previous3Orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) /
          previous3Orders.length;

        const changePercent = ((last3Avg - prev3Avg) / prev3Avg) * 100;

        if (changePercent > 10) {
          spend_trend = "increasing";
        } else if (changePercent < -10) {
          spend_trend = "decreasing";
        } else {
          spend_trend = "stable";
        }
      }
    } else if (orders.length === 2) {
      // Compare last 2 orders
      const recent = Number(orders[1].totalAmount);
      const previous = Number(orders[0].totalAmount);
      if (recent > previous * 1.1) {
        spend_trend = "increasing";
      } else if (recent < previous * 0.9) {
        spend_trend = "decreasing";
      }
    } else if (orders.length === 1) {
      // Single order - assume stable
      spend_trend = "stable";
    }

    // Category preference: Most purchased category
    let category_preference = "Vegetables"; // Default
    if (orders.length > 0) {
      const categoryCounts: Record<string, number> = {};

      orders.forEach((order) => {
        order.items.forEach((item) => {
          const category = item.listing.product.category;
          categoryCounts[category] =
            (categoryCounts[category] || 0) + item.quantity;
        });
      });

      // Find most purchased category
      const sortedCategories = Object.entries(categoryCounts).sort(
        (a, b) => b[1] - a[1],
      );

      if (sortedCategories.length > 0) {
        category_preference = sortedCategories[0][0];
      }
    }

    return NextResponse.json({
      customer_id: customerId,
      last_purchase_date,
      total_orders,
      avg_gap_days: Math.round(avg_gap_days * 10) / 10, // Round to 1 decimal
      total_spend: Math.round(total_spend * 100) / 100, // Round to 2 decimals
      spend_trend,
      days_since_last_order,
      category_preference,
    });
  } catch (error: any) {
    console.error("Error fetching customer churn data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
