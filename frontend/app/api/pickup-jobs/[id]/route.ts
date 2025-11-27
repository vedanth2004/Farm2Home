import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const pickupJob = await prisma.pickupJob.findFirst({
      where: {
        id: params.id,
        agentId: agentProfile.id,
      },
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
    });

    if (!pickupJob) {
      return NextResponse.json(
        { error: "Pickup job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: pickupJob,
    });
  } catch (error) {
    console.error("Error fetching pickup job:", error);
    return NextResponse.json(
      { error: "Failed to fetch pickup job" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only pickup agents can update their jobs
    if (session.user.role !== UserRole.PICKUP_AGENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, pickupEta, dropoffEta } = body;

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

    // Verify the job belongs to this agent
    const existingJob = await prisma.pickupJob.findFirst({
      where: {
        id: params.id,
        agentId: agentProfile.id,
      },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Pickup job not found" },
        { status: 404 },
      );
    }

    // Update the pickup job
    const updatedJob = await prisma.pickupJob.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(pickupEta && { pickupEta: new Date(pickupEta) }),
        ...(dropoffEta && { dropoffEta: new Date(dropoffEta) }),
      },
    });

    // If status is being updated to PICKED_UP, also update the order status
    if (status === "PICKED_UP") {
      await prisma.order.update({
        where: { id: existingJob.orderId },
        data: { status: "PICKED_UP" },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    console.error("Error updating pickup job:", error);
    return NextResponse.json(
      { error: "Failed to update pickup job" },
      { status: 500 },
    );
  }
}
