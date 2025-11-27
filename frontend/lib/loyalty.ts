/**
 * Loyalty/Reward Points System
 * Handles point earning, redemption, and referral bonuses
 */

import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/utils/strings";

const POINTS_PER_RUPEE = 0.1; // 1 point per ₹10 spent
const REFERRAL_BONUS_POINTS = 500; // Points for successful referral
const REFERRAL_EARNER_BONUS = 200; // Points for the person who was referred
const POINTS_TO_RUPEE = 100; // 100 points = ₹1

/**
 * Earn points for completed order
 */
export async function earnPointsForOrder(
  userId: string,
  orderId: string,
  orderAmount: number,
): Promise<void> {
  const pointsEarned = Math.floor(orderAmount * POINTS_PER_RUPEE);

  if (pointsEarned <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Update user points
    await tx.user.update({
      where: { id: userId },
      data: {
        loyaltyPoints: {
          increment: pointsEarned,
        },
      },
    });

    // Create transaction record
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        orderId,
        points: pointsEarned,
        reason: "ORDER_COMPLETE",
        description: `Earned ${pointsEarned} points for order #${orderId.slice(-8)}`,
      },
    });
  });
}

/**
 * Redeem points for discount
 */
export async function redeemPoints(
  userId: string,
  pointsToRedeem: number,
  orderId?: string,
): Promise<{ success: boolean; discountAmount: number; error?: string }> {
  // Validate points
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });

  if (!user) {
    return {
      success: false,
      discountAmount: 0,
      error: "User not found",
    };
  }

  if (user.loyaltyPoints < pointsToRedeem) {
    return {
      success: false,
      discountAmount: 0,
      error: `Insufficient points. You have ${user.loyaltyPoints} points`,
    };
  }

  if (pointsToRedeem < POINTS_TO_RUPEE) {
    return {
      success: false,
      discountAmount: 0,
      error: `Minimum ${POINTS_TO_RUPEE} points required to redeem`,
    };
  }

  const discountAmount = pointsToRedeem / POINTS_TO_RUPEE;

  await prisma.$transaction(async (tx) => {
    // Deduct points
    await tx.user.update({
      where: { id: userId },
      data: {
        loyaltyPoints: {
          decrement: pointsToRedeem,
        },
      },
    });

    // Create transaction record
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        orderId: orderId || null,
        points: -pointsToRedeem, // Negative for redemption
        reason: "REDEMPTION",
        description: `Redeemed ${pointsToRedeem} points for ₹${discountAmount.toFixed(2)} discount`,
      },
    });
  });

  return {
    success: true,
    discountAmount,
  };
}

/**
 * Process referral bonus
 */
export async function processReferralBonus(
  referredUserId: string,
  firstOrderId: string,
): Promise<void> {
  const referredUser = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { referredBy: true },
  });

  if (!referredUser?.referredBy) {
    return; // No referrer
  }

  await prisma.$transaction(async (tx) => {
    // Give bonus to referrer
    await tx.user.update({
      where: { id: referredUser.referredBy ?? undefined },
      data: {
        loyaltyPoints: {
          increment: REFERRAL_BONUS_POINTS,
        },
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        userId: referredUser.referredBy!,
        orderId: firstOrderId,
        points: REFERRAL_BONUS_POINTS,
        reason: "REFERRAL",
        description: `Referral bonus for referring a new customer`,
      },
    });

    // Give bonus to referred user
    await tx.user.update({
      where: { id: referredUserId },
      data: {
        loyaltyPoints: {
          increment: REFERRAL_EARNER_BONUS,
        },
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        userId: referredUserId,
        orderId: firstOrderId,
        points: REFERRAL_EARNER_BONUS,
        reason: "REFERRAL",
        description: `Welcome bonus for joining via referral`,
      },
    });
  });
}

/**
 * Get or create referral code for user
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) {
    return user.referralCode;
  }

  // Generate unique referral code
  let referralCode: string;
  let isUnique = false;

  while (!isUnique) {
    referralCode = generateReferralCode();
    const existing = await prisma.user.findUnique({
      where: { referralCode },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: referralCode! },
  });

  return referralCode!;
}

/**
 * Apply referral code during signup
 */
export async function applyReferralCode(
  newUserId: string,
  referralCode: string,
): Promise<{ success: boolean; message: string }> {
  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true },
  });

  if (!referrer) {
    return {
      success: false,
      message: "Invalid referral code",
    };
  }

  if (referrer.id === newUserId) {
    return {
      success: false,
      message: "Cannot use your own referral code",
    };
  }

  // Check if user already has a referrer
  const user = await prisma.user.findUnique({
    where: { id: newUserId },
    select: { referredBy: true },
  });

  if (user?.referredBy) {
    return {
      success: false,
      message: "Referral code already applied",
    };
  }

  await prisma.user.update({
    where: { id: newUserId },
    data: { referredBy: referrer.id },
  });

  return {
    success: true,
    message: "Referral code applied successfully",
  };
}
