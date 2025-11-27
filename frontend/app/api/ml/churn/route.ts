import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use churn prediction
    if (!can(session.user.role, "write:analytics")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "customer_id",
      "last_purchase_date",
      "total_orders",
      "avg_gap_days",
      "total_spend",
      "spend_trend",
      "days_since_last_order",
      "category_preference",
    ];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Validate spend_trend
    const validTrends = ["increasing", "stable", "decreasing"];
    if (!validTrends.includes(body.spend_trend)) {
      return NextResponse.json(
        { error: "spend_trend must be one of: increasing, stable, decreasing" },
        { status: 400 },
      );
    }

    // Call FastAPI service
    const response = await fetch(`${ML_SERVICE_URL}/predict_churn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: body.customer_id,
        last_purchase_date: body.last_purchase_date,
        total_orders: parseInt(body.total_orders),
        avg_gap_days: parseFloat(body.avg_gap_days),
        total_spend: parseFloat(body.total_spend),
        spend_trend: body.spend_trend,
        days_since_last_order: parseInt(body.days_since_last_order),
        category_preference: body.category_preference,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "ML service error", message: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Churn prediction error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

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

    // Fetch all predictions from FastAPI
    const response = await fetch(`${ML_SERVICE_URL}/admin/churn`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "ML service error", message: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching churn predictions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
