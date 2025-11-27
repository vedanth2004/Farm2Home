/**
 * Enhanced Coupon Validation API
 * Validates coupons with category-based discounts, min/max order values, and referral checks
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { code, orderTotal, items, userId } = await request.json();

    if (!code) {
      return createErrorResponse({ message: "Coupon code is required" }, 400);
    }

    // Get coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return createErrorResponse({ message: "Invalid coupon code" }, 404);
    }

    const now = new Date();

    // Basic validation
    if (!coupon.isActive) {
      return createErrorResponse({ message: "Coupon is not active" }, 400);
    }

    if (coupon.validFrom > now || coupon.validTo < now) {
      return createErrorResponse(
        { message: "Coupon is expired or not yet valid" },
        400,
      );
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return createErrorResponse(
        { message: "Coupon usage limit reached" },
        400,
      );
    }

    // Validate minimum purchase
    if (coupon.minPurchase && orderTotal < Number(coupon.minPurchase)) {
      return createErrorResponse(
        {
          message: `Minimum purchase of ₹${Number(coupon.minPurchase).toFixed(2)} required`,
          minPurchase: Number(coupon.minPurchase),
        },
        400,
      );
    }

    // Category-based discount validation
    if (coupon.categories && coupon.categories.length > 0 && items) {
      // Check if order contains items from allowed categories
      const itemCategories = new Set<string>();
      for (const item of items) {
        if (item.category) {
          itemCategories.add(item.category);
        }
      }

      const hasValidCategory = coupon.categories.some((cat) =>
        itemCategories.has(cat),
      );

      if (!hasValidCategory) {
        return createErrorResponse(
          {
            message: `This coupon is only valid for products in: ${coupon.categories.join(", ")}`,
            allowedCategories: coupon.categories,
          },
          400,
        );
      }
    }

    // Referral code validation (if applicable)
    if (coupon.referralCode && userId) {
      // Check if user has already used a referral coupon
      const existingReferralOrder = await prisma.order.findFirst({
        where: {
          customerId: userId,
          couponCode: {
            startsWith: "REFERRAL_",
          },
        },
      });

      if (existingReferralOrder) {
        return createErrorResponse(
          { message: "You have already used a referral code" },
          400,
        );
      }

      // Check if user is trying to use their own referral code
      if (session?.user?.id === userId) {
        // This would require a referral tracking system
        // For now, we'll allow it but could add restrictions
      }
    }

    // Calculate discount
    let discount = (orderTotal * Number(coupon.discountPercent)) / 100;

    // Apply max discount limit if set
    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
      discount = Number(coupon.maxDiscount);
    }

    // Validate discount doesn't exceed order total
    discount = Math.min(discount, orderTotal);

    return createSuccessResponse(
      {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          discountPercent: Number(coupon.discountPercent),
          minPurchase: coupon.minPurchase ? Number(coupon.minPurchase) : null,
          maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
          categories: coupon.categories || [],
        },
        discount: discount,
        finalAmount: orderTotal - discount,
      },
      "Coupon validated successfully",
    );
  } catch (error) {
    console.error("Error validating coupon:", error);
    return createErrorResponse(error);
  }
}
