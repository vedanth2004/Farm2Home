import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole, AccountStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/utils/audit-log";

/**
 * POST /api/admin/approvals/[id]/approve
 * Approve a user account
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

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmerProfile: true,
        pickupAgentProfile: true,
        crProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.accountStatus === AccountStatus.APPROVED) {
      return NextResponse.json(
        { error: "User is already approved" },
        { status: 400 },
      );
    }

    // Update user status to APPROVED
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: AccountStatus.APPROVED,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });

    // Also update farmerProfile.verified if it's a farmer
    if (user.role === UserRole.FARMER && user.farmerProfile) {
      await prisma.farmerProfile.update({
        where: { id: user.farmerProfile.id },
        data: { verified: true },
      });
    }

    // Update approval request
    await prisma.approvalRequest.updateMany({
      where: { userId: userId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    });

    // Log approval action
    await createAuditLog({
      userId: session.user.internalId || session.user.id,
      displayId: session.user.displayId || undefined,
      role: UserRole.ADMIN,
      action: "User Account Approved",
      entityType: "User",
      entityId: userId,
      metadata: {
        approvedUserEmail: user.email,
        approvedUserRole: user.role,
        approvedUserDisplayId: user.displayId,
      },
    });

    // TODO: Send notification email to user
    // await sendApprovalEmail(user.email, user.name);

    return NextResponse.json({
      success: true,
      message: "Account approved successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: "Failed to approve account" },
      { status: 500 },
    );
  }
}
