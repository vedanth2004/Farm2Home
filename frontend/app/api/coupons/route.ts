import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

// GET - Get coupons (public for valid ones, admin for all)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const all = searchParams.get("all") === "true";

    // If code provided, validate coupon
    if (code) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!coupon) {
        return createErrorResponse({ message: "Invalid coupon code" }, 404);
      }

      const now = new Date();
      if (
        !coupon.isActive ||
        coupon.validFrom > now ||
        coupon.validTo < now ||
        (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      ) {
        return createErrorResponse(
          { message: "Coupon is not valid or expired" },
          400,
        );
      }

      // Return coupon with validation metadata
      return createSuccessResponse(
        {
          ...coupon,
          isValid: true,
        },
        "Coupon found",
      );
    }

    // Admin can see all coupons
    if (session?.user && (session.user as any).role === "ADMIN" && all) {
      const coupons = await prisma.coupon.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      return createSuccessResponse(coupons, "Coupons fetched successfully");
    }

    // Public: only active and valid coupons
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validTo: { gte: now },
        OR: [
          { usageLimit: null },
          {
            usageLimit: {
              gt: prisma.coupon.fields.usedCount,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return createSuccessResponse(coupons, "Coupons fetched successfully");
  } catch (error) {
    console.error("💥 API: Error fetching coupons:", error);
    return createErrorResponse(error);
  }
}

// POST - Create coupon (Admin only)
export async function POST(request: NextRequest) {
  try {
    await requirePermission("write:coupons");

    const body = await request.json();
    const {
      code,
      name,
      description,
      discountPercent,
      minPurchase,
      maxDiscount,
      validFrom,
      validTo,
      usageLimit,
      categories, // Array of category names
      applicableTo, // Array of user IDs for referral bonuses
      referralCode, // Optional referral code
    } = body;

    if (!code || !name || !discountPercent || !validFrom || !validTo) {
      return createErrorResponse(
        {
          message:
            "code, name, discountPercent, validFrom, and validTo are required",
        },
        400,
      );
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return createErrorResponse(
        { message: "Discount percent must be between 0 and 100" },
        400,
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountPercent: parseFloat(discountPercent),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        categories: categories && Array.isArray(categories) ? categories : [],
        applicableTo:
          applicableTo && Array.isArray(applicableTo) ? applicableTo : [],
        referralCode: referralCode || null,
      },
    });

    return createSuccessResponse(coupon, "Coupon created successfully");
  } catch (error) {
    console.error("💥 API: Error creating coupon:", error);
    return createErrorResponse(error);
  }
}
