import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { Prisma, NotificationChannel } from "@prisma/client";

// POST - Request delivery approval from customer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a pickup agent
    await requirePermission("write:pickup");

    const { pickupJobId, agentNotes } = await request.json();

    if (!pickupJobId) {
      return NextResponse.json(
        { error: "Pickup job ID is required" },
        { status: 400 },
      );
    }

    // Verify the pickup job belongs to this agent
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) {
      return NextResponse.json(
        { error: "Pickup agent profile not found" },
        { status: 404 },
      );
    }

    const pickupJob = await prisma.pickupJob.findFirst({
      where: {
        id: pickupJobId,
        agentId: agentProfile.id,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!pickupJob) {
      return NextResponse.json(
        { error: "Pickup job not found or not assigned to you" },
        { status: 404 },
      );
    }

    // Check if pickup job is in correct status
    if (pickupJob.status !== "PICKED_UP") {
      return NextResponse.json(
        {
          error:
            "Pickup job must be in PICKED_UP status to request delivery approval",
        },
        { status: 400 },
      );
    }

    // Check if there's already a pending approval
    const existingApproval = await prisma.deliveryApproval.findFirst({
      where: {
        pickupJobId: pickupJobId,
        status: "PENDING",
      },
    });

    if (existingApproval) {
      return NextResponse.json(
        { error: "Delivery approval already requested for this pickup job" },
        { status: 400 },
      );
    }

    // Create delivery approval request
    const deliveryApproval = await prisma.deliveryApproval.create({
      data: {
        pickupJobId: pickupJobId,
        agentNotes: agentNotes || null,
        status: "PENDING",
      },
    });

    // Update pickup job status
    await prisma.pickupJob.update({
      where: { id: pickupJobId },
      data: { status: "DELIVERY_REQUESTED" },
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: pickupJob.order.customerId,
        type: "DELIVERY_APPROVAL_REQUEST",
        channel: NotificationChannel.INAPP,
        payload: {
          title: "Delivery Completion Request",
          message: `Pickup agent has completed delivery for order #${pickupJob.orderId.slice(-8)}. Please confirm delivery and payment receipt.`,
          pickupJobId: pickupJobId,
          approvalId: deliveryApproval.id,
          orderId: pickupJob.orderId,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      approval: deliveryApproval,
      message: "Delivery approval requested successfully",
    });
  } catch (error) {
    console.error("Error requesting delivery approval:", error);
    return NextResponse.json(
      { error: "Failed to request delivery approval" },
      { status: 500 },
    );
  }
}

// GET - Get delivery approval requests for pickup agent
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a pickup agent
    await requirePermission("read:pickup");

    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) {
      return NextResponse.json(
        { error: "Pickup agent profile not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get delivery approvals for this agent's pickup jobs
    const approvals = await prisma.deliveryApproval.findMany({
      where: {
        pickupJob: {
          agentId: agentProfile.id,
        },
        ...(status && { status: status as any }),
      },
      include: {
        pickupJob: {
          include: {
            order: {
              include: {
                customer: true,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      approvals,
    });
  } catch (error) {
    console.error("Error fetching delivery approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery approvals" },
      { status: 500 },
    );
  }
}
