import { NextRequest, NextResponse } from "next/server";
import { calculateCustomerFeatures } from "@/lib/services/ml-feature-calculator";
import { predictCustomer } from "@/lib/ml-client";

/**
 * GET /api/customers/[id]/predict
 * Automatically calculate customer features from database and get ML prediction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const customerId = params.id;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    // Step 1: Calculate features from database
    const features = await calculateCustomerFeatures(customerId);

    // Step 2: Get prediction from ML service
    const prediction = await predictCustomer({
      totalOrders: features.totalOrders,
      purchaseFrequency: features.purchaseFrequency,
      avgOrderValue: features.avgOrderValue,
      lastPurchaseDaysAgo: features.lastPurchaseDaysAgo,
      totalItemsBought: features.totalItemsBought,
      repeatRate: 0, // Not used in current model
    });

    return NextResponse.json({
      success: true,
      customerId,
      features, // Include calculated features for transparency
      prediction,
    });
  } catch (error: any) {
    console.error("Error getting customer prediction:", error);
    return NextResponse.json(
      {
        error: "Failed to get prediction",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
