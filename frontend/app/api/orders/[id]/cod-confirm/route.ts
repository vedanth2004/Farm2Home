/**
 * COD Cash Collection Confirmation API
 * Allows pickup agents or CRs to mark cash as collected for COD orders
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { createActivityLog } from "@/lib/activity-log";
import { NotificationChannel, Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;
    const { amount, notes } = await request.json();

    // Get the order
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
        pickupJob: {
          include: {
            agent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify order is COD (paymentStatus = PENDING)
    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This order is not a COD order" },
        { status: 400 },
      );
    }

    // Verify cash not already collected
    if (order.cashCollected) {
      return NextResponse.json(
        { error: "Cash has already been collected for this order" },
        { status: 400 },
      );
    }

    // Verify user has permission (Pickup Agent or CR only)
    if (
      session.user.role !== UserRole.PICKUP_AGENT &&
      session.user.role !== UserRole.CR &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        { error: "Only pickup agents or CRs can confirm cash collection" },
        { status: 403 },
      );
    }

    // For pickup agents, verify they're assigned to this order
    if (session.user.role === UserRole.PICKUP_AGENT) {
      const agentProfile = await prisma.pickupAgentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!agentProfile) {
        return NextResponse.json(
          { error: "Pickup agent profile not found" },
          { status: 404 },
        );
      }

      if (!order.pickupJob || order.pickupJob.agentId !== agentProfile.id) {
        return NextResponse.json(
          {
            error:
              "You can only confirm cash collection for orders assigned to you",
          },
          { status: 403 },
        );
      }
    }

    // Verify amount matches order total (with tolerance for rounding)
    const orderTotal =
      Number(order.totalAmount) - Number(order.discountAmount || 0);
    const providedAmount = Number(amount) || orderTotal;

    if (Math.abs(providedAmount - orderTotal) > 1) {
      // Allow 1 rupee difference for rounding
      return NextResponse.json(
        {
          error: `Amount mismatch. Expected ₹${orderTotal.toFixed(2)}, received ₹${providedAmount.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Update order and create earnings in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Mark cash as collected
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          cashCollected: true,
          cashCollectedBy: session.user.id,
          cashCollectedAt: new Date(),
          paymentStatus: "SUCCESS",
        },
        include: {
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
      });

      // Create earnings for farmers
      for (const item of updated.items) {
        const farmerPrice =
          Number(item.farmerPrice) || Number(item.listing.farmerPrice) || 0;

        if (farmerPrice > 0 && item.listing.product.farmerId) {
          await tx.earnings.create({
            data: {
              farmerId: item.listing.product.farmerId,
              orderId: orderId,
              orderItemId: item.id,
              amount: farmerPrice * item.quantity,
              status: "PENDING",
            },
          });
        }
      }

      // Create payment record for COD
      await tx.payment.create({
        data: {
          orderId: orderId,
          gateway: "RAZORPAY", // Using RAZORPAY enum for COD too (could add COD enum later)
          gatewayOrderId: `COD-${orderId}`,
          gatewayPaymentId: `COD-${orderId}-${Date.now()}`,
          status: "SUCCESS",
          amount: orderTotal,
        },
      });

      return updated;
    });

    // Process loyalty points after COD confirmation
    setImmediate(async () => {
      try {
        const { earnPointsForOrder, processReferralBonus } = await import(
          "@/lib/loyalty"
        );
        await earnPointsForOrder(updatedOrder.customerId, orderId, orderTotal);

        // Check if this is user's first successful order
        const userOrderCount = await prisma.order.count({
          where: {
            customerId: updatedOrder.customerId,
            paymentStatus: "SUCCESS",
          },
        });
        if (userOrderCount === 1) {
          await processReferralBonus(updatedOrder.customerId, orderId);
        }
      } catch (loyaltyError) {
        console.warn(
          `Failed to process loyalty points for COD order ${orderId}:`,
          loyaltyError,
        );
      }
    });

    // Log activity
    await createActivityLog({
      userId: session.user.id,
      userRole: session.user.role,
      action: "COD_CASH_COLLECTED",
      entityType: "Order",
      entityId: orderId,
      oldValue: {
        cashCollected: false,
        paymentStatus: "PENDING",
      },
      newValue: {
        cashCollected: true,
        paymentStatus: "SUCCESS",
        collectedAmount: providedAmount,
      },
      metadata: {
        collectedBy: session.user.id,
        notes: notes || null,
      },
    });

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        type: "COD_PAYMENT_RECEIVED",
        channel: NotificationChannel.INAPP,
        payload: {
          title: "Payment Received",
          message: `Cash payment of ₹${providedAmount.toFixed(2)} has been received for order #${orderId.slice(-8)}`,
          orderId: orderId,
          amount: providedAmount,
        } as Prisma.InputJsonValue,
      },
    });

    // Notify farmers
    const farmerIds = new Set(
      order.items.map((item) => item.listing.product.farmerId),
    );

    for (const farmerId of Array.from(farmerIds)) {
      const farmerProfile = await prisma.farmerProfile.findUnique({
        where: { id: farmerId },
        select: { userId: true },
      });

      if (farmerProfile) {
        await prisma.notification.create({
          data: {
            userId: farmerProfile.userId,
            type: "ORDER_PAYMENT_RECEIVED",
            channel: NotificationChannel.INAPP,
            payload: {
              title: "Order Payment Received",
              message: `Payment received for order #${orderId.slice(-8)}`,
              orderId: orderId,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cash collection confirmed successfully",
      order: {
        id: updatedOrder.id,
        cashCollected: updatedOrder.cashCollected,
        cashCollectedAt: updatedOrder.cashCollectedAt,
        paymentStatus: updatedOrder.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error confirming COD cash collection:", error);
    return NextResponse.json(
      { error: "Failed to confirm cash collection" },
      { status: 500 },
    );
  }
}
