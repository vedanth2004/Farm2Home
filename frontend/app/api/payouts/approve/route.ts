import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EarningsStatus } from "@prisma/client";

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

    const { payoutId } = await request.json();

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

    // Update payout status to PAID and set approvedAt
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        approvedAt: new Date(),
      },
    });

    // Update all pending earnings for this farmer to PAID
    if (payout.farmerId) {
      await prisma.earnings.updateMany({
        where: {
          farmerId: payout.farmerId,
          status: EarningsStatus.PENDING,
        },
        data: {
          status: EarningsStatus.PAID,
        },
      });
    }

    return NextResponse.json({
      success: true,
      payout: updatedPayout,
      message: "Payout approved successfully",
    });
  } catch (error) {
    console.error("Error approving payout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
