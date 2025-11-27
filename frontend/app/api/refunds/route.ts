/**
 * Refund Management API
 * Handles refund requests from customers and admin approval/rejection
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  UserRole,
  RefundStatus,
  NotificationChannel,
  Prisma,
} from "@prisma/client";
import { createActivityLog, logRefundAction } from "@/lib/activity-log";

// POST - Customer creates a refund request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      orderId,
      orderItemId, // Optional - for partial refunds
      amount,
      reason,
      reasonDetail,
      imageUrl,
    } = await request.json();

    // Validate required fields
    if (!orderId || !amount || !reason) {
      return NextResponse.json(
        { error: "Order ID, amount, and reason are required" },
        { status: 400 },
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
        refunds: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify customer owns the order
    if (order.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only request refunds for your own orders" },
        { status: 403 },
      );
    }

    // Verify order is delivered (can't refund undelivered orders)
    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        {
          error:
            "Refunds can only be requested for delivered orders. Please contact support for cancelled orders.",
        },
        { status: 400 },
      );
    }

    // Verify payment was successful
    if (order.paymentStatus !== "SUCCESS") {
      return NextResponse.json(
        { error: "Refunds can only be requested for paid orders" },
        { status: 400 },
      );
    }

    // Verify refund amount doesn't exceed order total
    const refundAmount = Number(amount);

    let maxRefundable: number;
    if (orderItemId) {
      const item = order.items.find((item) => item.id === orderItemId);
      maxRefundable = item ? Number(item.unitPrice) * item.quantity : 0;
    } else {
      maxRefundable =
        Number(order.totalAmount) -
        Number(order.discountAmount || 0) -
        // Subtract already refunded amounts
        order.refunds
          .filter((r) => r.status === "APPROVED" || r.status === "PROCESSED")
          .reduce((sum, r) => sum + Number(r.amount), 0);
    }

    if (refundAmount > maxRefundable) {
      return NextResponse.json(
        {
          error: `Refund amount (₹${refundAmount.toFixed(2)}) exceeds maximum refundable amount (₹${maxRefundable.toFixed(2)})`,
        },
        { status: 400 },
      );
    }

    // Check if there's already a pending refund for this order/item
    const existingRefund = await prisma.refund.findFirst({
      where: {
        orderId: orderId,
        orderItemId: orderItemId || null,
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
    });

    if (existingRefund) {
      return NextResponse.json(
        {
          error:
            "There is already a pending or approved refund request for this order/item",
        },
        { status: 400 },
      );
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        orderId: orderId,
        orderItemId: orderItemId || null,
        amount: refundAmount,
        reason,
        reasonDetail: reasonDetail || null,
        imageUrl: imageUrl || null,
        status: "PENDING",
        requestedBy: session.user.id,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Log activity
    await logRefundAction(
      refund.id,
      orderId,
      session.user.id,
      UserRole.CUSTOMER,
      "REQUESTED",
      {
        amount: refundAmount,
        reason,
        orderItemId: orderItemId || null,
      },
    );

    // Notify admins
    const admins = await prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
      },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "REFUND_REQUEST",
          channel: NotificationChannel.INAPP,
          payload: {
            title: "New Refund Request",
            message: `Customer ${order.customer.name} requested a refund of ₹${refundAmount.toFixed(2)} for order #${orderId.slice(-8)}`,
            refundId: refund.id,
            orderId: orderId,
            amount: refundAmount,
            reason,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      refund,
      message: "Refund request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating refund request:", error);
    return NextResponse.json(
      { error: "Failed to create refund request" },
      { status: 500 },
    );
  }
}

// GET - List refunds (with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const orderId = url.searchParams.get("orderId");

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status as RefundStatus;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    // Role-based filtering
    if (session.user.role === UserRole.CUSTOMER) {
      where.requestedBy = session.user.id;
    } else if (session.user.role !== UserRole.ADMIN) {
      // Farmers, agents, CRs can't see refunds
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const refunds = await prisma.refund.findMany({
      where,
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        orderItem: {
          include: {
            listing: {
              include: {
                product: {
                  select: {
                    name: true,
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
      refunds,
    });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 },
    );
  }
}
