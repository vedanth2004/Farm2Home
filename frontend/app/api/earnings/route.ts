import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, EarningsStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    });

    if (!farmerProfile) {
      return NextResponse.json(
        { error: "Farmer profile not found" },
        { status: 404 },
      );
    }

    // Get earnings with related data
    const earnings = await prisma.earnings.findMany({
      where: { farmerId: farmerProfile.id },
      include: {
        order: {
          include: {
            customer: { select: { name: true, email: true } },
          },
        },
        orderItem: {
          include: {
            listing: {
              include: {
                product: { select: { name: true, baseUnit: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary
    const totalEarnings = earnings.reduce(
      (sum, earning) => sum + Number(earning.amount),
      0,
    );
    const pendingEarnings = earnings
      .filter((e) => e.status === EarningsStatus.PENDING)
      .reduce((sum, earning) => sum + Number(earning.amount), 0);
    const paidEarnings = earnings
      .filter((e) => e.status === EarningsStatus.PAID)
      .reduce((sum, earning) => sum + Number(earning.amount), 0);

    return NextResponse.json({
      earnings,
      summary: {
        totalEarnings,
        pendingEarnings,
        paidEarnings,
      },
    });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "request_payout") {
      // Get farmer profile
      const farmerProfile = await prisma.farmerProfile.findUnique({
        where: { userId: session.user.id },
        include: { user: true },
      });

      if (!farmerProfile) {
        return NextResponse.json(
          { error: "Farmer profile not found" },
          { status: 404 },
        );
      }

      // Check if farmer already has a pending payout request
      const existingPayout = await prisma.payout.findFirst({
        where: {
          farmerId: farmerProfile.id,
          status: "PENDING",
        },
      });

      if (existingPayout) {
        return NextResponse.json(
          {
            error:
              "You already have a pending payout request. Please wait for admin approval.",
          },
          { status: 400 },
        );
      }

      // Get pending earnings
      const pendingEarnings = await prisma.earnings.findMany({
        where: {
          farmerId: farmerProfile.id,
          status: EarningsStatus.PENDING,
        },
      });

      const totalPendingAmount = pendingEarnings.reduce(
        (sum, earning) => sum + Number(earning.amount),
        0,
      );

      if (totalPendingAmount <= 0) {
        return NextResponse.json(
          {
            error: "No pending earnings to request payout",
          },
          { status: 400 },
        );
      }

      // Create payout request
      const payout = await prisma.payout.create({
        data: {
          beneficiaryType: "FARMER",
          beneficiaryId: farmerProfile.id,
          amount: totalPendingAmount,
          status: "PENDING",
          requestType: "FARMER_REQUEST",
          farmerId: farmerProfile.id,
          requestedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        payout,
        message: "Payout request created successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing earnings request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
