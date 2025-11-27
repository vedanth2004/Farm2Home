import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  generatePredictionsForAllCustomers,
  generatePredictionsForActiveCustomers,
  generatePredictionAndNotify,
} from "@/lib/services/ml-prediction-notification";

/**
 * POST /api/admin/ml/generate-predictions
 * Generate predictions and send notifications for customers
 *
 * Query params:
 * - scope: "all" | "active" (default: "active")
 * - customerId: specific customer ID (optional, overrides scope)
 */
export async function POST(request: NextRequest) {
  // Ensure we always return JSON - even for errors
  const jsonResponse = (data: any, status = 200) => {
    try {
      return NextResponse.json(data, {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (responseError: any) {
      // If even JSON response fails, return plain text error
      return new NextResponse(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  };

  try {
    console.log("[ML Predictions] POST request received");

    // Check authentication first
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log(
        "[ML Predictions] Session check:",
        session ? "authenticated" : "not authenticated",
      );
    } catch (authError: any) {
      console.error("[ML Predictions] Auth error:", authError);
      return jsonResponse(
        { error: "Authentication error", message: authError.message },
        500,
      );
    }

    if (!session?.user?.id) {
      console.log("[ML Predictions] No session, returning 401");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    console.log("[ML Predictions] User role:", session.user.role);

    // Check permission without redirect (handle error manually)
    let hasPermission = false;
    try {
      hasPermission = can(session.user.role, "write:analytics");
      console.log(
        "[ML Predictions] Has write:analytics permission:",
        hasPermission,
      );
    } catch (permError: any) {
      console.error("[ML Predictions] Permission check error:", permError);
      return jsonResponse(
        { error: "Permission check failed", message: permError.message },
        500,
      );
    }

    if (!hasPermission) {
      console.log("[ML Predictions] No permission, returning 403");
      return jsonResponse(
        { error: "Forbidden", message: "Admin access required" },
        403,
      );
    }

    let scope = "active";
    let customerId: string | null = null;
    try {
      const { searchParams } = new URL(request.url);
      scope = searchParams.get("scope") || "active";
      customerId = searchParams.get("customerId");
      console.log("[ML Predictions] Scope:", scope, "CustomerId:", customerId);
    } catch (urlError: any) {
      console.error("[ML Predictions] URL parsing error:", urlError);
      return jsonResponse(
        { error: "Invalid request URL", message: urlError.message },
        400,
      );
    }

    // If specific customer ID provided, generate for that customer only
    if (customerId) {
      try {
        const result = await generatePredictionAndNotify(customerId);
        return jsonResponse({
          success: true,
          message: "Prediction generated and notification sent",
          result,
        });
      } catch (err: any) {
        return jsonResponse(
          {
            success: false,
            error: "Failed to generate prediction",
            message: err.message || "Unknown error",
          },
          500,
        );
      }
    }

    // Generate for all or active customers
    let summary;
    try {
      console.log(
        "[ML Predictions] Starting prediction generation for scope:",
        scope,
      );
      console.log(
        "[ML Predictions] ML_SERVICE_URL:",
        process.env.ML_SERVICE_URL || "http://localhost:8000",
      );

      if (scope === "all") {
        console.log(
          "[ML Predictions] Calling generatePredictionsForAllCustomers",
        );
        summary = await generatePredictionsForAllCustomers();
      } else {
        console.log(
          "[ML Predictions] Calling generatePredictionsForActiveCustomers",
        );
        summary = await generatePredictionsForActiveCustomers();
      }
      console.log("[ML Predictions] Generation complete:", {
        total: summary.total,
        successful: summary.successful,
        failed: summary.failed,
        notificationsSent: summary.notificationsSent,
      });
    } catch (genError: any) {
      console.error(
        "[ML Predictions] Error in prediction generation:",
        genError,
      );
      console.error("[ML Predictions] Error message:", genError.message);
      console.error("[ML Predictions] Error stack:", genError.stack);
      console.error("[ML Predictions] Error name:", genError.name);
      console.error("[ML Predictions] Error cause:", genError.cause);

      // Return detailed error for debugging
      return jsonResponse(
        {
          success: false,
          error: "Failed to generate predictions",
          message: genError.message || "Unknown error",
          errorType: genError.name || "Error",
          errorDetails:
            process.env.NODE_ENV === "development"
              ? {
                  stack: genError.stack,
                  cause: genError.cause,
                }
              : undefined,
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      message: `Generated predictions for ${summary.total} customers`,
      summary: {
        total: summary.total,
        successful: summary.successful,
        failed: summary.failed,
        notificationsSent: summary.notificationsSent,
        successRate:
          summary.total > 0
            ? ((summary.successful / summary.total) * 100).toFixed(2) + "%"
            : "0%",
      },
      sampleResults: summary.results.slice(0, 10),
    });
  } catch (error: any) {
    // Catch-all error handler - this should never be reached if all errors are handled above
    console.error(
      "[ML Predictions] CRITICAL: Unexpected top-level error:",
      error,
    );
    console.error("[ML Predictions] Error type:", typeof error);
    console.error("[ML Predictions] Error name:", error?.name);
    console.error("[ML Predictions] Error message:", error?.message);
    console.error("[ML Predictions] Error stack:", error?.stack);
    console.error("[ML Predictions] Error cause:", error?.cause);

    // Try to return JSON, but if that fails, return plain text
    try {
      return jsonResponse(
        {
          success: false,
          error: "Unexpected error occurred",
          message: error?.message || "Unknown error",
          errorType: error?.name || typeof error,
          errorDetails:
            process.env.NODE_ENV === "development"
              ? {
                  stack: error?.stack,
                  cause: error?.cause,
                }
              : undefined,
        },
        500,
      );
    } catch (responseError: any) {
      // Last resort - return plain text error
      console.error(
        "[ML Predictions] CRITICAL: Failed to create JSON response:",
        responseError,
      );
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Critical error",
          message: error?.message || "Failed to process request",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  }
}

/**
 * GET /api/admin/ml/generate-predictions
 * Get status or trigger generation (for testing)
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

    return NextResponse.json({
      message: "Use POST method to generate predictions",
      endpoints: {
        all: "POST /api/admin/ml/generate-predictions?scope=all",
        active: "POST /api/admin/ml/generate-predictions?scope=active",
        specific:
          "POST /api/admin/ml/generate-predictions?customerId=CUSTOMER_ID",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
