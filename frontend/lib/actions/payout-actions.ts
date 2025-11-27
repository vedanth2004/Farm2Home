"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function generatePayoutsFromOrders() {
  try {
    await requirePermission("write:payouts");

    // Get all completed orders that haven't been processed for payouts
    const completedOrders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
      },
      include: {
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

    const payoutsCreated = [];

    for (const order of completedOrders) {
      // Group items by farmer
      const farmerEarnings = new Map<string, number>();

      for (const item of order.items) {
        const farmerId = item.listing.product.farmerId;
        const farmerEarning =
          Number((item as any).farmerPrice || item.unitPrice) * item.quantity;

        if (farmerEarnings.has(farmerId)) {
          farmerEarnings.set(
            farmerId,
            farmerEarnings.get(farmerId)! + farmerEarning,
          );
        } else {
          farmerEarnings.set(farmerId, farmerEarning);
        }
      }

      // Create payouts for each farmer
      for (const [farmerId, amount] of Array.from(farmerEarnings.entries())) {
        // Check if payout already exists for this order and farmer
        const existingPayout = await prisma.payout.findFirst({
          where: {
            beneficiaryType: "FARMER",
            beneficiaryId: farmerId,
            reference: `Order-${order.id}`,
          },
        });

        if (!existingPayout && amount > 0) {
          const payout = await prisma.payout.create({
            data: {
              beneficiaryType: "FARMER",
              beneficiaryId: farmerId,
              amount: amount,
              status: "PENDING",
              reference: `Order-${order.id}`,
            },
          });
          payoutsCreated.push(payout);
        }
      }
    }

    return {
      success: true,
      payoutsCreated: payoutsCreated.length,
      message: `Generated ${payoutsCreated.length} new payouts`,
    };
  } catch (error) {
    console.error("Error generating payouts:", error);
    return {
      success: false,
      error: "Failed to generate payouts",
    };
  }
}

export async function getPayoutSummary() {
  try {
    const [pendingPayouts, scheduledPayouts, paidPayouts] = await Promise.all([
      prisma.payout.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payout.aggregate({
        where: { status: "SCHEDULED" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payout.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      pending: {
        amount: Number(pendingPayouts._sum.amount || 0),
        count: pendingPayouts._count.id,
      },
      scheduled: {
        amount: Number(scheduledPayouts._sum.amount || 0),
        count: scheduledPayouts._count.id,
      },
      paid: {
        amount: Number(paidPayouts._sum.amount || 0),
        count: paidPayouts._count.id,
      },
    };
  } catch (error) {
    console.error("Error getting payout summary:", error);
    return {
      pending: { amount: 0, count: 0 },
      scheduled: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 },
    };
  }
}
