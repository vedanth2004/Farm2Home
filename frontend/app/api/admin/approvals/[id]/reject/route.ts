import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole, AccountStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/utils/audit-log";

/**
 * POST /api/admin/approvals/[id]/reject
 * Reject a user account
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== UserRole.ADMIN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = params.id;
  let rejectionReason: string | null = null;

  try {
    const body = await request.json().catch(() => ({}));
    rejectionReason = body.reason || null;
  } catch {
    // No body provided, continue without reason
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.accountStatus === AccountStatus.REJECTED) {
      return NextResponse.json(
        { error: "User is already rejected" },
        { status: 400 },
      );
    }

    // Update user status to REJECTED
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: AccountStatus.REJECTED,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        displayId: true,
      },
    });

    // Update approval request
    await prisma.approvalRequest.updateMany({
      where: { userId: userId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        adminNotes: rejectionReason || "Account rejected by admin",
      },
    });

    // Log rejection action
    await createAuditLog({
      userId: session.user.internalId || session.user.id,
      displayId: session.user.displayId || undefined,
      role: UserRole.ADMIN,
      action: "User Account Rejected",
      entityType: "User",
      entityId: userId,
      metadata: {
        rejectedUserEmail: user.email,
        rejectedUserRole: user.role,
        rejectedUserDisplayId: updatedUser.displayId,
        reason: rejectionReason,
      },
    });

    // TODO: Send rejection notification email to user
    // await sendRejectionEmail(user.email, user.name, rejectionReason);

    return NextResponse.json({
      success: true,
      message: "Account rejected",
      user: updatedUser,
      reason: rejectionReason,
    });
  } catch (error: any) {
    console.error("Error rejecting user:", error);
    return NextResponse.json(
      { error: "Failed to reject account" },
      { status: 500 },
    );
  }
}
