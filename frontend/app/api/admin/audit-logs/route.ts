import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET - Get audit logs
 * Query params: search, role, action, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    // Check admin permission
    await requirePermission("read:logs");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (role && role !== "all") {
      where.role = role;
    }

    if (action && action !== "all") {
      where.action = {
        contains: action,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { displayId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          timestamp: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return createSuccessResponse(
      {
        data: logs,
        total,
        limit,
        offset,
      },
      "Audit logs fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return createErrorResponse(error);
  }
}
