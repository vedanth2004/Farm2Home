import { NextRequest, NextResponse } from "next/server";
import { Prisma, NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;

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

    // Check if user has permission to delete this order
    const userRole = session.user.role;
    let canDelete = false;

    switch (userRole) {
      case "ADMIN":
        canDelete = true; // Admins can delete any order
        break;
      case "CUSTOMER":
        canDelete =
          order.customerId === session.user.id &&
          order.status === "CREATED" &&
          order.paymentStatus === "PENDING"; // Customers can only delete their own pending orders
        break;
      default:
        canDelete = false;
    }

    if (!canDelete) {
      return NextResponse.json(
        {
          error: "Insufficient permissions or order cannot be deleted",
        },
        { status: 403 },
      );
    }

    // Create notification for relevant users BEFORE deletion
    const notificationData = {
      type: "ORDER_DELETED",
      channel: NotificationChannel.INAPP,
      payload: {
        title: "Order Deleted",
        message: `Order #${orderId.slice(-8)} has been deleted`,
        orderId: orderId,
      } as Prisma.InputJsonValue,
    };

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

    // Create notifications with error handling
    try {
      for (const farmerProfile of farmerProfiles) {
        await prisma.notification.create({
          data: {
            userId: farmerProfile.userId,
            ...notificationData,
          },
        });
      }

      // Notify pickup agent if assigned (before deletion)
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
    } catch (notificationError) {
      console.error("Error creating notifications:", notificationError);
      // Continue with deletion even if notifications fail
    }

    // Delete the order and related data with inventory restoration
    await prisma.$transaction(async (tx) => {
      // First, restore inventory for all order items
      for (const item of order.items) {
        // Restore inventory (increase available quantity)
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

      // Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId: orderId },
      });

      // Delete pickup job if exists
      await tx.pickupJob.deleteMany({
        where: { orderId: orderId },
      });

      // Delete payments if exist
      await tx.payment.deleteMany({
        where: { orderId: orderId },
      });

      // Delete the order
      await tx.order.delete({
        where: { id: orderId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}
