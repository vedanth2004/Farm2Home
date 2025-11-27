/**
 * Refund Review API (Admin only)
 * Allows admins to approve or reject refund requests
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  RefundStatus,
  NotificationChannel,
  Prisma,
  PaymentStatus,
} from "@prisma/client";
import { logRefundAction } from "@/lib/activity-log";
import { UserRole } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can review refunds
    await requirePermission("write:refunds");

    const refundId = params.id;
    const { action, adminNotes } = await request.json(); // action: "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    // Get the refund
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
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
                earnings: true,
              },
            },
          },
        },
        orderItem: {
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

    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    if (refund.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Refund is already ${refund.status.toLowerCase()}. Cannot modify.`,
        },
        { status: 400 },
      );
    }

    const newStatus =
      action === "approve" ? RefundStatus.APPROVED : RefundStatus.REJECTED;

    // Update refund status
    const updatedRefund = await prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: newStatus,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          adminNotes: adminNotes || null,
        },
      });

      if (action === "approve") {
        // Update order payment status to REFUNDED or PARTIALLY_REFUNDED
        const order = refund.order;
        const totalRefunded = await tx.refund.aggregate({
          where: {
            orderId: order.id,
            status: {
              in: ["APPROVED", "PROCESSED"],
            },
          },
          _sum: {
            amount: true,
          },
        });

        const refundedAmount = Number(totalRefunded._sum.amount || 0);
        const orderTotal =
          Number(order.totalAmount) - Number(order.discountAmount || 0);

        // Determine if full or partial refund
        const isFullRefund = refundedAmount >= orderTotal * 0.99; // 99% threshold for rounding

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: isFullRefund
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED,
          },
        });

        // Cancel or adjust earnings for refunded items
        if (refund.orderItemId) {
          // Partial refund - adjust earnings proportionally
          const orderItem = order.items.find(
            (item) => item.id === refund.orderItemId,
          );

          if (orderItem) {
            const itemTotal = Number(orderItem.unitPrice) * orderItem.quantity;
            const refundRatio = Number(refund.amount) / itemTotal;

            // Update earnings for this item
            for (const earning of orderItem.earnings) {
              if (earning.status === "PENDING") {
                await tx.earnings.update({
                  where: { id: earning.id },
                  data: {
                    amount: {
                      decrement: Number(earning.amount) * refundRatio,
                    },
                    status: "CANCELLED",
                  },
                });
              }
            }
          }
        } else {
          // Full refund - cancel all pending earnings
          await tx.earnings.updateMany({
            where: {
              orderId: order.id,
              status: "PENDING",
            },
            data: {
              status: "CANCELLED",
            },
          });
        }

        // Restore inventory for refunded items
        if (refund.orderItemId) {
          const orderItem = order.items.find(
            (item) => item.id === refund.orderItemId,
          );

          if (orderItem) {
            await tx.productListing.update({
              where: { id: orderItem.listingId },
              data: {
                availableQty: {
                  increment: orderItem.quantity,
                },
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                listingId: orderItem.listingId,
                delta: orderItem.quantity,
                reason: "REFUND",
              },
            });
          }
        } else {
          // Full refund - restore all items
          for (const item of order.items) {
            await tx.productListing.update({
              where: { id: item.listingId },
              data: {
                availableQty: {
                  increment: item.quantity,
                },
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                listingId: item.listingId,
                delta: item.quantity,
                reason: "REFUND",
              },
            });
          }
        }
      }

      return updated;
    });

    // Log activity
    await logRefundAction(
      refundId,
      refund.orderId,
      session.user.id,
      UserRole.ADMIN,
      action.toUpperCase() as any,
      {
        adminNotes,
      },
    );

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: refund.requestedBy,
        type: `REFUND_${newStatus}`,
        channel: NotificationChannel.INAPP,
        payload: {
          title:
            action === "approve"
              ? "Refund Approved"
              : "Refund Request Rejected",
          message:
            action === "approve"
              ? `Your refund request of ₹${Number(refund.amount).toFixed(2)} has been approved and will be processed shortly.`
              : `Your refund request has been rejected. ${adminNotes || ""}`,
          refundId: refundId,
          orderId: refund.orderId,
          amount: Number(refund.amount),
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      refund: updatedRefund,
      message: `Refund ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error reviewing refund:", error);
    return NextResponse.json(
      { error: "Failed to review refund" },
      { status: 500 },
    );
  }
}
