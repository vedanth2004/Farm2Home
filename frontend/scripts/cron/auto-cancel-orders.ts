/**
 * Cron Job: Auto-cancel unpaid orders after 15 minutes
 * Run this via cron or a scheduled task
 */

import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { UserRole } from "@prisma/client";

const AUTO_CANCEL_MINUTES = 15;

export async function autoCancelUnpaidOrders() {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - AUTO_CANCEL_MINUTES);

  try {
    // Find orders that are CREATED with PENDING payment and older than cutoff
    const unpaidOrders = await prisma.order.findMany({
      where: {
        status: "CREATED",
        paymentStatus: "PENDING",
        createdAt: {
          lt: cutoffTime,
        },
      },
      include: {
        items: {
          include: {
            listing: true,
          },
        },
      },
    });

    console.log(
      `Found ${unpaidOrders.length} unpaid orders to cancel (older than ${AUTO_CANCEL_MINUTES} minutes)`,
    );

    let cancelledCount = 0;

    for (const order of unpaidOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Restore inventory for all items
          for (const item of order.items) {
            await tx.productListing.update({
              where: { id: item.listingId },
              data: {
                availableQty: {
                  increment: item.quantity,
                },
              },
            });

            // Create inventory transaction record
            await tx.inventoryTransaction.create({
              data: {
                listingId: item.listingId,
                delta: item.quantity,
                reason: "ORDER_CANCEL",
              },
            });
          }

          // Update order status to CANCELLED
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
            },
          });

          // Update payment status if payment record exists
          await tx.payment.updateMany({
            where: {
              orderId: order.id,
              status: "PENDING",
            },
            data: {
              status: "FAILED",
            },
          });
        });

        // Log activity
        await createActivityLog({
          userId: undefined, // System action
          userRole: UserRole.ADMIN,
          action: "ORDER_AUTO_CANCELLED",
          entityType: "Order",
          entityId: order.id,
          metadata: {
            reason: "Unpaid order auto-cancelled after 15 minutes",
            cancelledAt: new Date().toISOString(),
          },
        });

        cancelledCount++;
        console.log(`Auto-cancelled order ${order.id}`);
      } catch (error) {
        console.error(`Failed to cancel order ${order.id}:`, error);
      }
    }

    return {
      success: true,
      cancelledCount,
      totalFound: unpaidOrders.length,
    };
  } catch (error) {
    console.error("Error in auto-cancel job:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  autoCancelUnpaidOrders()
    .then((result) => {
      console.log("Auto-cancel completed:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Auto-cancel failed:", error);
      process.exit(1);
    });
}
