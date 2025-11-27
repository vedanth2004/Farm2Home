import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const beneficiaryType = searchParams.get("beneficiaryType");

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (beneficiaryType) {
      where.beneficiaryType = beneficiaryType;
    }

    const payouts = await prisma.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get beneficiary details for each payout
    const payoutsWithDetails = await Promise.all(
      payouts.map(async (payout) => {
        let beneficiary = null;
        let beneficiaryName = "Unknown";
        let beneficiaryEmail = "";

        try {
          switch (payout.beneficiaryType) {
            case "FARMER":
              const farmer = await prisma.farmerProfile.findUnique({
                where: { id: payout.beneficiaryId },
                include: { user: true },
              });
              if (farmer) {
                beneficiary = farmer;
                beneficiaryName = farmer.user.name;
                beneficiaryEmail = farmer.user.email;
              }
              break;

            case "CR":
              const cr = await prisma.cRProfile.findUnique({
                where: { id: payout.beneficiaryId },
                include: { user: true },
              });
              if (cr) {
                beneficiary = cr;
                beneficiaryName = cr.user.name;
                beneficiaryEmail = cr.user.email;
              }
              break;

            case "PICKUP_AGENT":
              const agent = await prisma.pickupAgentProfile.findUnique({
                where: { id: payout.beneficiaryId },
                include: { user: true },
              });
              if (agent) {
                beneficiary = agent;
                beneficiaryName = agent.user.name;
                beneficiaryEmail = agent.user.email;
              }
              break;
          }
        } catch (error) {
          console.error("Error fetching beneficiary details:", error);
        }

        return {
          ...payout,
          beneficiaryName,
          beneficiaryEmail,
          beneficiary,
        };
      }),
    );

    return NextResponse.json(payoutsWithDetails);
  } catch (error) {
    console.error("Error fetching payouts:", error);
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { beneficiaryType, beneficiaryId, amount, reference } =
      await request.json();

    if (!beneficiaryType || !beneficiaryId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const payout = await prisma.payout.create({
      data: {
        beneficiaryType,
        beneficiaryId,
        amount,
        reference: reference || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(payout, { status: 201 });
  } catch (error) {
    console.error("Error creating payout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
