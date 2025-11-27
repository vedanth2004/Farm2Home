import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only pickup agents can view their jobs
    if (session.user.role !== UserRole.PICKUP_AGENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get agent profile
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) {
      return NextResponse.json(
        { error: "Agent profile not found" },
        { status: 404 },
      );
    }

    const pickupJobs = await prisma.pickupJob.findMany({
      where: { agentId: agentProfile.id },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            items: {
              include: {
                listing: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: pickupJobs,
    });
  } catch (error) {
    console.error("Error fetching pickup jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch pickup jobs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only pickup agents can create jobs (though this is usually done by the system)
    if (session.user.role !== UserRole.PICKUP_AGENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, pickupEta, dropoffEta } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Get agent profile
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) {
      return NextResponse.json(
        { error: "Agent profile not found" },
        { status: 404 },
      );
    }

    // Create pickup job
    const pickupJob = await prisma.pickupJob.create({
      data: {
        orderId,
        agentId: agentProfile.id,
        status: "REQUESTED",
        pickupEta: pickupEta ? new Date(pickupEta) : null,
        dropoffEta: dropoffEta ? new Date(dropoffEta) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: pickupJob,
    });
  } catch (error) {
    console.error("Error creating pickup job:", error);
    return NextResponse.json(
      { error: "Failed to create pickup job" },
      { status: 500 },
    );
  }
}
