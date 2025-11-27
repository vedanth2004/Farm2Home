/**
 * Admin Approval Requests API
 * GET: Get pending approvals
 * PATCH: Approve/reject requests
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit-log";

// GET - Get pending approval requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("write:users");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const role = searchParams.get("role");

    const where: any = {
      status: status as any,
    };

    if (role) {
      where.role = role;
    }

    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayId: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            farmerProfile: {
              select: {
                govtId: true,
                upiId: true,
              },
            },
            pickupAgentProfile: {
              select: {
                vehicleType: true,
                serviceAreas: true,
              },
            },
            crProfile: {
              select: {
                serviceAreas: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: approvals,
    });
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 },
    );
  }
}

// PATCH - Approve or reject a request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("write:users");

    const { requestId, status, adminNotes } = await request.json();

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "requestId and status are required" },
        { status: 400 },
      );
    }

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        { error: "Status must be APPROVED or REJECTED" },
        { status: 400 },
      );
    }

    // Get the approval request
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 },
      );
    }

    // Update the approval request
    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: status as any,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null,
      },
    });

    // Update user account status accordingly
    await prisma.user.update({
      where: { id: approval.userId },
      data: {
        accountStatus: status === "APPROVED" ? "APPROVED" : "REJECTED",
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      displayId: (session.user as any).displayId,
      role: session.user.role,
      action: `APPROVAL_${status}`,
      entityType: "ApprovalRequest",
      entityId: requestId,
      oldValue: { status: approval.status },
      newValue: { status, adminNotes },
      metadata: {
        targetUserId: approval.userId,
        targetDisplayId: approval.displayId,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      { error: "Failed to update approval" },
      { status: 500 },
    );
  }
}
