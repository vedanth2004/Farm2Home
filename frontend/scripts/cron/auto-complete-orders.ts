/**
 * Cron Job: Auto-complete orders after 24 hours if customer hasn't confirmed
 * Run this via cron or a scheduled task
 */

import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { UserRole } from "@prisma/client";

const AUTO_COMPLETE_HOURS = 24;

export async function autoCompleteOrders() {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - AUTO_COMPLETE_HOURS);

  try {
    // Find orders that are DELIVERY_REQUESTED or OUT_FOR_DELIVERY
    // and delivery was requested/completed more than 24 hours ago
    // and customer hasn't confirmed
    const deliveryApprovals = await prisma.deliveryApproval.findMany({
      where: {
        status: "PENDING",
        requestedAt: {
          lt: cutoffTime,
        },
      },
      include: {
        pickupJob: {
          include: {
            order: true,
          },
        },
      },
    });

    console.log(
      `Found ${deliveryApprovals.length} pending delivery approvals older than ${AUTO_COMPLETE_HOURS} hours`,
    );

    let completedCount = 0;

    for (const approval of deliveryApprovals) {
      const order = approval.pickupJob.order;

      // Only auto-complete if order is not already DELIVERED
      if (order.status !== "DELIVERED") {
        try {
          await prisma.$transaction(async (tx) => {
            // Approve the delivery
            await tx.deliveryApproval.update({
              where: { id: approval.id },
              data: {
                status: "APPROVED",
                approvedAt: new Date(),
                customerNotes:
                  "Auto-approved after 24 hours (customer did not respond)",
              },
            });

            // Update pickup job status
            await tx.pickupJob.update({
              where: { id: approval.pickupJob.id },
              data: {
                status: "DELIVERED",
              },
            });

            // Update order status
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: "DELIVERED",
                // For COD orders, mark cash as collected if not already
                ...(order.paymentStatus === "PENDING" &&
                  !order.cashCollected && {
                    cashCollected: true,
                    cashCollectedAt: new Date(),
                    paymentStatus: "SUCCESS",
                  }),
              },
            });

            // For COD orders that are now marked as paid, create earnings
            if (order.paymentStatus === "PENDING" && !order.cashCollected) {
              // Create earnings for farmers (similar to payment success flow)
              const orderItems = await tx.orderItem.findMany({
                where: { orderId: order.id },
                include: { listing: { include: { product: true } } },
              });

              for (const item of orderItems) {
                const farmerPrice =
                  Number(item.farmerPrice) ||
                  Number(item.listing.farmerPrice) ||
                  0;

                if (farmerPrice > 0 && item.listing.product.farmerId) {
                  await tx.earnings.create({
                    data: {
                      farmerId: item.listing.product.farmerId,
                      orderId: order.id,
                      orderItemId: item.id,
                      amount: farmerPrice * item.quantity,
                      status: "PENDING",
                    },
                  });
                }
              }
            }
          });

          // Log activity
          await createActivityLog({
            userId: undefined, // System action
            userRole: UserRole.ADMIN,
            action: "ORDER_AUTO_COMPLETED",
            entityType: "Order",
            entityId: order.id,
            metadata: {
              reason:
                "Auto-completed after 24 hours without customer confirmation",
              completedAt: new Date().toISOString(),
              deliveryApprovalId: approval.id,
            },
          });

          completedCount++;
          console.log(`Auto-completed order ${order.id}`);
        } catch (error) {
          console.error(`Failed to auto-complete order ${order.id}:`, error);
        }
      }
    }

    return {
      success: true,
      completedCount,
      totalFound: deliveryApprovals.length,
    };
  } catch (error) {
    console.error("Error in auto-complete job:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  autoCompleteOrders()
    .then((result) => {
      console.log("Auto-complete completed:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Auto-complete failed:", error);
      process.exit(1);
    });
}
