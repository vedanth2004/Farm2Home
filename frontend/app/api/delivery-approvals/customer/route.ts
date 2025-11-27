import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { Prisma, NotificationChannel } from "@prisma/client";

// POST - Approve or reject delivery
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a customer
    await requirePermission("write:orders");

    const { approvalId, action, customerNotes } = await request.json();

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: "Approval ID and action are required" },
        { status: 400 },
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    // Get the delivery approval
    const approval = await prisma.deliveryApproval.findUnique({
      where: { id: approvalId },
      include: {
        pickupJob: {
          include: {
            order: {
              include: {
                customer: true,
                shippingAddress: true,
              },
            },
            agent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "Delivery approval not found" },
        { status: 404 },
      );
    }

    // Verify the customer owns this order
    if (approval.pickupJob.order.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only approve deliveries for your own orders" },
        { status: 403 },
      );
    }

    // Check if approval is still pending
    if (approval.status !== "PENDING") {
      return NextResponse.json(
        { error: "This delivery approval has already been processed" },
        { status: 400 },
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const timestampField = action === "approve" ? "approvedAt" : "rejectedAt";

    // Update the approval
    const updatedApproval = await prisma.deliveryApproval.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        customerNotes: customerNotes || null,
        [timestampField]: new Date(),
      },
    });

    // Update pickup job status based on action
    if (action === "approve") {
      await prisma.pickupJob.update({
        where: { id: approval.pickupJobId },
        data: { status: "DELIVERED" },
      });

      // Update order status to delivered
      await prisma.order.update({
        where: { id: approval.pickupJob.orderId },
        data: { status: "DELIVERED" },
      });

      // Create notification for pickup agent
      await prisma.notification.create({
        data: {
          userId: approval.pickupJob.agent.userId,
          type: "DELIVERY_APPROVED",
          channel: NotificationChannel.INAPP,
          payload: {
            title: "Delivery Confirmed",
            message: `Customer has confirmed delivery completion and payment receipt for order #${approval.pickupJob.orderId.slice(-8)}`,
            pickupJobId: approval.pickupJobId,
            orderId: approval.pickupJob.orderId,
          } as Prisma.InputJsonValue,
        },
      });
    } else {
      // If rejected, keep pickup job in HANDED_TO_CR status
      // The agent can request approval again or handle the rejection
      await prisma.notification.create({
        data: {
          userId: approval.pickupJob.agent.userId,
          type: "DELIVERY_REJECTED",
          channel: NotificationChannel.INAPP,
          payload: {
            title: "Delivery Not Confirmed",
            message: `Customer has not confirmed delivery completion for order #${approval.pickupJob.orderId.slice(-8)}`,
            pickupJobId: approval.pickupJobId,
            orderId: approval.pickupJob.orderId,
            customerNotes: customerNotes,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      approval: updatedApproval,
      message: `Delivery ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error processing delivery approval:", error);
    return NextResponse.json(
      { error: "Failed to process delivery approval" },
      { status: 500 },
    );
  }
}

// GET - Get pending delivery approvals for customer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a customer
    await requirePermission("read:orders");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get delivery approvals for customer's orders
    const approvals = await prisma.deliveryApproval.findMany({
      where: {
        pickupJob: {
          order: {
            customerId: session.user.id,
          },
        },
        ...(status && { status: status as any }),
      },
      include: {
        pickupJob: {
          include: {
            order: {
              include: {
                items: {
                  include: {
                    listing: {
                      include: {
                        product: {
                          include: {
                            farmer: {
                              include: {
                                user: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                shippingAddress: true,
              },
            },
            agent: {
              include: {
                user: true,
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
