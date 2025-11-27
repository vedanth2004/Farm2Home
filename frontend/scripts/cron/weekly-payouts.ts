/**
 * Weekly Farmer Payout Automation
 * Processes pending farmer earnings and creates payout requests
 * Can integrate with Razorpay Payouts API for actual disbursement
 */

import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import {
  UserRole,
  PayoutStatus,
  EarningsStatus,
  BeneficiaryType,
} from "@prisma/client";

const MIN_PAYOUT_AMOUNT = 100; // Minimum ₹100 for payout
const PAYOUT_DAY = 1; // Monday = 1, adjust as needed

interface PayoutSummary {
  farmerId: string;
  farmerUserId: string;
  totalAmount: number;
  earningsCount: number;
  earningsIds: string[];
}

export async function processWeeklyPayouts() {
  try {
    console.log("Starting weekly payout processing...");

    // Get all pending earnings
    const pendingEarnings = await prisma.earnings.findMany({
      where: {
        status: EarningsStatus.PENDING,
        order: {
          paymentStatus: "SUCCESS",
          status: {
            not: "CANCELLED",
          },
        },
      },
      include: {
        farmer: {
          include: {
            user: true,
          },
        },
        order: true,
      },
    });

    console.log(`Found ${pendingEarnings.length} pending earnings`);

    // Group earnings by farmer
    const earningsByFarmer = new Map<string, PayoutSummary>();

    for (const earning of pendingEarnings) {
      const farmerId = earning.farmerId;

      if (!earningsByFarmer.has(farmerId)) {
        earningsByFarmer.set(farmerId, {
          farmerId,
          farmerUserId: earning.farmer.userId,
          totalAmount: 0,
          earningsCount: 0,
          earningsIds: [],
        });
      }

      const summary = earningsByFarmer.get(farmerId)!;
      summary.totalAmount += Number(earning.amount);
      summary.earningsCount++;
      summary.earningsIds.push(earning.id);
    }

    console.log(`Processing payouts for ${earningsByFarmer.size} farmers`);

    const createdPayouts = [];
    const skippedFarmers = [];

    // Convert Map to Array to allow async iteration
    const farmersArray = Array.from(earningsByFarmer.entries());

    for (const [farmerId, summary] of farmersArray) {
      // Skip if below minimum payout amount
      if (summary.totalAmount < MIN_PAYOUT_AMOUNT) {
        skippedFarmers.push({
          farmerId,
          amount: summary.totalAmount,
          reason: "Below minimum payout amount",
        });
        console.log(
          `Skipping farmer ${farmerId}: Amount ₹${summary.totalAmount.toFixed(2)} below minimum ₹${MIN_PAYOUT_AMOUNT}`,
        );
        continue;
      }

      try {
        // Check if there's already a pending payout for this farmer
        const existingPayout = await prisma.payout.findFirst({
          where: {
            farmerId: farmerId,
            status: {
              in: ["PENDING", "SCHEDULED"],
            },
          },
        });

        if (existingPayout) {
          console.log(
            `Farmer ${farmerId} already has a pending payout. Skipping.`,
          );
          skippedFarmers.push({
            farmerId,
            amount: summary.totalAmount,
            reason: "Existing pending payout",
          });
          continue;
        }

        // Create payout request
        const payout = await prisma.$transaction(async (tx) => {
          // Create payout record
          const newPayout = await tx.payout.create({
            data: {
              beneficiaryType: BeneficiaryType.FARMER,
              beneficiaryId: farmerId,
              farmerId: farmerId,
              amount: summary.totalAmount,
              status: PayoutStatus.PENDING,
              requestType: "FARMER_REQUEST",
              reference: `WEEKLY-${Date.now()}-${farmerId.slice(-8)}`,
            },
          });

          // Mark earnings as part of this payout (we'll mark as PAID when payout is approved)
          // For now, we'll keep them as PENDING until payout is approved

          return newPayout;
        });

        createdPayouts.push({
          payoutId: payout.id,
          farmerId,
          amount: summary.totalAmount,
          earningsCount: summary.earningsCount,
        });

        // Log activity
        await createActivityLog({
          userId: undefined, // System action
          userRole: UserRole.ADMIN,
          action: "WEEKLY_PAYOUT_CREATED",
          entityType: "Payout",
          entityId: payout.id,
          metadata: {
            farmerId,
            amount: summary.totalAmount,
            earningsCount: summary.earningsCount,
            earningsIds: summary.earningsIds,
            reference: payout.reference,
          },
        });

        // Notify farmer
        await prisma.notification.create({
          data: {
            userId: summary.farmerUserId,
            type: "PAYOUT_CREATED",
            channel: "INAPP",
            payload: {
              title: "Payout Request Created",
              message: `A payout of ₹${summary.totalAmount.toFixed(2)} has been created and is pending admin approval.`,
              payoutId: payout.id,
              amount: summary.totalAmount,
            },
          },
        });

        console.log(
          `Created payout ${payout.id} for farmer ${farmerId}: ₹${summary.totalAmount.toFixed(2)}`,
        );
      } catch (error) {
        console.error(`Error creating payout for farmer ${farmerId}:`, error);
      }
    }

    console.log(`Weekly payout processing completed:`);
    console.log(`- Created: ${createdPayouts.length} payouts`);
    console.log(`- Skipped: ${skippedFarmers.length} farmers`);

    return {
      success: true,
      createdPayouts,
      skippedFarmers,
      totalCreated: createdPayouts.length,
      totalSkipped: skippedFarmers.length,
    };
  } catch (error) {
    console.error("Error in weekly payout processing:", error);
    throw error;
  }
}

/**
 * Approve and process payouts (can be called separately or integrated with Razorpay)
 */
export async function processPayoutDisbursement(payoutId: string) {
  try {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        farmer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (
      payout.status !== PayoutStatus.PENDING &&
      payout.status !== PayoutStatus.SCHEDULED
    ) {
      throw new Error(`Payout is already ${payout.status.toLowerCase()}`);
    }

    // Here you would integrate with Razorpay Payouts API
    // For now, we'll simulate the process

    const updatedPayout = await prisma.$transaction(async (tx) => {
      // Mark payout as PAID
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PAID,
          approvedAt: new Date(),
        },
      });

      // Mark all related earnings as PAID
      // Find earnings for this farmer that are still PENDING
      const earnings = await tx.earnings.findMany({
        where: {
          farmerId: payout.farmerId!,
          status: EarningsStatus.PENDING,
          order: {
            paymentStatus: "SUCCESS",
          },
        },
      });

      // Calculate how many earnings to mark as paid based on payout amount
      let remainingPayout = Number(payout.amount);

      for (const earning of earnings) {
        if (remainingPayout <= 0) break;

        const earningAmount = Number(earning.amount);
        if (earningAmount <= remainingPayout) {
          await tx.earnings.update({
            where: { id: earning.id },
            data: {
              status: EarningsStatus.PAID,
            },
          });
          remainingPayout -= earningAmount;
        }
      }

      return updated;
    });

    // Log activity
    await createActivityLog({
      userId: undefined,
      userRole: UserRole.ADMIN,
      action: "PAYOUT_PROCESSED",
      entityType: "Payout",
      entityId: payoutId,
      metadata: {
        payoutAmount: Number(payout.amount),
        farmerId: payout.farmerId,
      },
    });

    // Notify farmer
    if (!payout.farmer) {
      throw new Error("Farmer not found for payout");
    }
    await prisma.notification.create({
      data: {
        userId: payout.farmer.userId,
        type: "PAYOUT_PAID",
        channel: "INAPP",
        payload: {
          title: "Payout Processed",
          message: `Your payout of ₹${Number(payout.amount).toFixed(2)} has been processed and will be transferred to your account.`,
          payoutId: payoutId,
          amount: Number(payout.amount),
        },
      },
    });

    return {
      success: true,
      payout: updatedPayout,
    };
  } catch (error) {
    console.error("Error processing payout disbursement:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  processWeeklyPayouts()
    .then((result) => {
      console.log("Weekly payout processing completed:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Weekly payout processing failed:", error);
      process.exit(1);
    });
}
