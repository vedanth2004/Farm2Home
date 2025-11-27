/**
 * Dynamic/Seasonal Pricing Logic
 * Applies pricing rules based on season, demand, bulk discounts, etc.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface PricingContext {
  productId?: string;
  farmerId?: string;
  category?: string;
  quantity: number;
  basePrice: number;
  currentDate?: Date;
}

/**
 * Calculate final price after applying all applicable pricing rules
 */
export async function calculateDynamicPrice(context: PricingContext): Promise<{
  finalPrice: number;
  originalPrice: number;
  discount: number;
  appliedRules: string[];
}> {
  const { productId, farmerId, category, quantity, basePrice, currentDate } =
    context;
  const now = currentDate || new Date();

  // Get all active pricing rules that match the context
  const rules = await prisma.pricingRule.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validTo: { gte: now },
      OR: [
        { type: "SEASONAL_DISCOUNT" },
        { type: "BULK_DISCOUNT" },
        { type: "DEMAND_BASED" },
        { type: "TIME_BASED" },
        ...(category ? [{ type: "CATEGORY_DISCOUNT" as const, category }] : []),
        ...(farmerId ? [{ type: "FARMER_SPECIFIC" as const, farmerId }] : []),
        ...(productId ? [{ productId }] : []),
      ],
    },
    orderBy: {
      priority: "desc",
    },
  });

  // Filter rules that actually match
  const applicableRules = rules.filter((rule) => {
    // Check category match
    if (rule.category && rule.category !== category) {
      return false;
    }

    // Check product match
    if (rule.productId && rule.productId !== productId) {
      return false;
    }

    // Check farmer match
    if (rule.farmerId && rule.farmerId !== farmerId) {
      return false;
    }

    // Check quantity requirement
    if (rule.minQuantity && quantity < rule.minQuantity) {
      return false;
    }

    // Check additional conditions (if any)
    if (rule.conditions) {
      // Parse conditions - this is a simplified version
      // In production, you'd have more complex condition evaluation
      try {
        const conditions = rule.conditions as any;
        if (conditions.season) {
          const currentSeason = getCurrentSeason(now);
          if (conditions.season !== currentSeason) {
            return false;
          }
        }
      } catch (e) {
        // Ignore condition parsing errors
      }
    }

    return true;
  });

  let finalPrice = basePrice;
  let totalDiscount = 0;
  const appliedRules: string[] = [];

  // Apply rules (highest priority first)
  // Note: In production, you might want to limit to one rule per type
  for (const rule of applicableRules.slice(0, 3)) {
    // Limit to 3 rules to prevent over-discounting
    let discount = 0;

    if (rule.discountPercent) {
      discount = (basePrice * Number(rule.discountPercent)) / 100;
    } else if (rule.fixedPrice) {
      discount = basePrice - Number(rule.fixedPrice);
      discount = Math.max(0, discount);
    }

    if (discount > 0) {
      finalPrice = Math.max(0, finalPrice - discount);
      totalDiscount += discount;
      appliedRules.push(rule.name);
    }
  }

  return {
    finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
    originalPrice: basePrice,
    discount: Math.round(totalDiscount * 100) / 100,
    appliedRules,
  };
}

/**
 * Get current season based on date
 */
function getCurrentSeason(date: Date): string {
  const month = date.getMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) {
    return "SPRING";
  } else if (month >= 6 && month <= 8) {
    return "SUMMER";
  } else if (month >= 9 && month <= 11) {
    return "AUTUMN";
  } else {
    return "WINTER";
  }
}

/**
 * Create a seasonal pricing rule
 */
export async function createSeasonalRule(data: {
  name: string;
  description?: string;
  category?: string;
  season: string;
  discountPercent: number;
  validFrom: Date;
  validTo: Date;
}): Promise<any> {
  return prisma.pricingRule.create({
    data: {
      name: data.name,
      description: data.description,
      type: "SEASONAL_DISCOUNT",
      category: data.category,
      discountPercent: data.discountPercent,
      validFrom: data.validFrom,
      validTo: data.validTo,
      conditions: {
        season: data.season,
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Create a bulk discount rule
 */
export async function createBulkDiscountRule(data: {
  name: string;
  description?: string;
  category?: string;
  minQuantity: number;
  discountPercent: number;
  validFrom: Date;
  validTo: Date;
}): Promise<any> {
  return prisma.pricingRule.create({
    data: {
      name: data.name,
      description: data.description,
      type: "BULK_DISCOUNT",
      category: data.category,
      minQuantity: data.minQuantity,
      discountPercent: data.discountPercent,
      validFrom: data.validFrom,
      validTo: data.validTo,
    },
  });
}
