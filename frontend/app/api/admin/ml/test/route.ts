import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";

/**
 * GET /api/admin/ml/test
 * Simple test endpoint to verify API routing is working
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      success: true,
      message: "API route is working",
      authenticated: !!session,
      userRole: session?.user?.role || null,
      hasPermission: session
        ? can(session.user.role, "write:analytics")
        : false,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Test endpoint error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/ml/test
 * Test POST endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session.user.role, "write:analytics")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "POST test successful",
      userRole: session.user.role,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Test POST error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
