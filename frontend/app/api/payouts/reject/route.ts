import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { payoutId, reason } = await request.json();

    if (!payoutId) {
      return NextResponse.json(
        { error: "Payout ID is required" },
        { status: 400 },
      );
    }

    // Get the payout
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { farmer: true },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    if (payout.status !== "PENDING") {
      return NextResponse.json(
        { error: "Payout is not in pending status" },
        { status: 400 },
      );
    }

    // Update payout status to REJECTED and set rejectedAt
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        reference: reason || "Rejected by admin",
      },
    });

    // Note: We don't change the earnings status - they remain PENDING
    // so the farmer can request payout again later

    return NextResponse.json({
      success: true,
      payout: updatedPayout,
      message: "Payout rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting payout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
