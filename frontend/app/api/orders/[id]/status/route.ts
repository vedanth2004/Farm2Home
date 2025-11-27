import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { Prisma, NotificationChannel } from "@prisma/client";
import { validateTransition, canCancelOrder } from "@/lib/fsm/order-fsm";
import { logOrderStatusChange, createActivityLog } from "@/lib/activity-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();
    const orderId = params.id;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    // Validate status enum
    const validStatuses = [
      "CREATED",
      "PAID",
      "PICKUP_ASSIGNED",
      "PICKED_UP",
      "AT_CR",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the order to check permissions
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            listing: {
              include: {
                product: {
                  include: {
                    farmer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate status transition using FSM
    try {
      validateTransition(order.status, status as any, order.paymentStatus);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Invalid status transition" },
        { status: 400 },
      );
    }

    // For cancellation, use FSM validation
    if (status === "CANCELLED") {
      if (!canCancelOrder(order.status, order.paymentStatus)) {
        return NextResponse.json(
          {
            error: `Cannot cancel order in ${order.status} status with payment ${order.paymentStatus}`,
          },
          { status: 400 },
        );
      }
    }

    // Check permissions based on user role
    const userRole = session.user.role;
    console.log("User role:", userRole, "User ID:", session.user.id);
    let canUpdate = false;

    switch (userRole) {
      case "ADMIN":
        canUpdate = true; // Admins can update any order
        break;
      case "CUSTOMER":
        canUpdate = order.customerId === session.user.id; // Customers can update their own orders
        break;
      case "FARMER":
        // Farmers can update orders containing their products
        canUpdate = order.items.some(
          (item) => item.listing.product.farmerId === session.user.id,
        );
        break;
      case "PICKUP_AGENT":
        // Pickup agents can update orders assigned to them
        console.log("Checking pickup agent permissions...");
        const agentProfile = await prisma.pickupAgentProfile.findUnique({
          where: { userId: session.user.id },
        });

        console.log("Agent profile found:", !!agentProfile);

        if (agentProfile) {
          console.log("Agent profile ID:", agentProfile.id);
          const pickupJob = await prisma.pickupJob.findFirst({
            where: {
              orderId: orderId,
              agentId: agentProfile.id,
            },
          });
          console.log("Pickup job found:", !!pickupJob);
          canUpdate = !!pickupJob;
        }
        break;
      case "CR":
        // CRs can update orders in their area
        canUpdate = true; // For now, allow CRs to update any order
        break;
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Store old status for activity log
    const oldStatus = order.status;
    const oldPaymentStatus = order.paymentStatus;

    // Update the order status with inventory management
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Handle inventory based on status change
      if (status === "CANCELLED" && order.status !== "CANCELLED") {
        // Restore inventory for cancelled orders
        for (const item of order.items) {
          await tx.productListing.update({
            where: { id: item.listingId },
            data: {
              availableQty: {
                increment: item.quantity,
              },
            },
          });

          // Create inventory transaction record for cancellation
          await tx.inventoryTransaction.create({
            data: {
              listingId: item.listingId,
              delta: item.quantity, // Positive delta for restoration
              reason: "ORDER_CANCEL",
            },
          });
        }

        // Cancel earnings if order was paid
        if (order.paymentStatus === "SUCCESS") {
          await tx.earnings.updateMany({
            where: {
              orderId: orderId,
              status: "PENDING",
            },
            data: {
              status: "CANCELLED",
            },
          });
        }
      }

      // Update the order status
      return await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          customer: true,
          items: {
            include: {
              listing: {
                include: {
                  product: {
                    include: {
                      farmer: true,
                    },
                  },
                },
              },
            },
          },
          shippingAddress: true,
        },
      });
    });

    // Log activity
    await logOrderStatusChange(
      orderId,
      session.user.id,
      session.user.role,
      oldStatus,
      status,
      oldPaymentStatus,
      updatedOrder.paymentStatus,
    );

    // Create notification for relevant users
    const notificationData = {
      type: "ORDER_STATUS_UPDATE",
      channel: NotificationChannel.INAPP,
      payload: {
        title: "Order Status Updated",
        message: `Order #${orderId.slice(-8)} status updated to ${status.replace("_", " ")}`,
        orderId: orderId,
        status: status,
      } as Prisma.InputJsonValue,
    };

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        ...notificationData,
      },
    });

    // Notify farmers involved in the order
    const farmerProfileIds = new Set(
      order.items.map((item) => item.listing.product.farmerId),
    );

    // Get the actual user IDs for the farmer profiles
    const farmerProfiles = await prisma.farmerProfile.findMany({
      where: {
        id: { in: Array.from(farmerProfileIds) },
      },
      select: {
        userId: true,
      },
    });

    for (const farmerProfile of farmerProfiles) {
      await prisma.notification.create({
        data: {
          userId: farmerProfile.userId,
          ...notificationData,
        },
      });
    }

    // Notify pickup agent if assigned
    const pickupJob = await prisma.pickupJob.findFirst({
      where: { orderId: orderId },
      include: { agent: true },
    });

    if (pickupJob) {
      await prisma.notification.create({
        data: {
          userId: pickupJob.agent.userId,
          ...notificationData,
        },
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;

    // Get the order with full details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
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
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user has permission to view this order
    const userRole = session.user.role;
    let canView = false;

    switch (userRole) {
      case "ADMIN":
        canView = true;
        break;
      case "CUSTOMER":
        canView = order.customerId === session.user.id;
        break;
      case "FARMER":
        canView = order.items.some(
          (item) => item.listing.product.farmerId === session.user.id,
        );
        break;
      case "PICKUP_AGENT":
        const agentProfileForView = await prisma.pickupAgentProfile.findUnique({
          where: { userId: session.user.id },
        });

        if (agentProfileForView) {
          const pickupJob = await prisma.pickupJob.findFirst({
            where: {
              orderId: orderId,
              agentId: agentProfileForView.id,
            },
          });
          canView = !!pickupJob;
        }
        break;
      case "CR":
        canView = true; // CRs can view orders in their area
        break;
    }

    if (!canView) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}
