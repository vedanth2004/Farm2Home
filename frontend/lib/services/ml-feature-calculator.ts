import { prisma } from "@/lib/prisma";

export interface CustomerFeatures {
  totalOrders: number;
  purchaseFrequency: number;
  avgOrderValue: number;
  lastPurchaseDaysAgo: number;
  totalItemsBought: number;
}

/**
 * Calculate ML features for a customer from their order history
 * This matches the feature engineering done in the Jupyter notebook
 */
export async function calculateCustomerFeatures(
  customerId: string,
): Promise<CustomerFeatures> {
  // Fetch all orders for this customer
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      status: {
        not: "CANCELLED", // Exclude cancelled orders
      },
    },
    include: {
      items: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Feature 1: totalOrders
  const totalOrders = orders.length;

  // Feature 2: purchaseFrequency (orders per month)
  let purchaseFrequency = 0;
  if (totalOrders > 0) {
    const firstOrder = orders[0];
    const lastOrder = orders[orders.length - 1];
    const daysDiff =
      (lastOrder.createdAt.getTime() - firstOrder.createdAt.getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      purchaseFrequency = (totalOrders / daysDiff) * 30; // Convert to monthly
    } else {
      purchaseFrequency = totalOrders; // If all orders same day
    }
  }

  // Feature 3: avgOrderValue
  const avgOrderValue =
    totalOrders > 0
      ? orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) /
        totalOrders
      : 0;

  // Feature 4: lastPurchaseDaysAgo
  const lastPurchaseDaysAgo =
    totalOrders > 0
      ? Math.floor(
          (Date.now() - orders[orders.length - 1].createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  // Feature 5: totalItemsBought
  const totalItemsBought = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  return {
    totalOrders,
    purchaseFrequency: Math.round(purchaseFrequency * 100) / 100, // Round to 2 decimals
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    lastPurchaseDaysAgo,
    totalItemsBought,
  };
}

/**
 * Calculate features for multiple customers (batch processing)
 */
export async function calculateFeaturesForMultiple(
  customerIds: string[],
): Promise<Map<string, CustomerFeatures>> {
  const featuresMap = new Map<string, CustomerFeatures>();

  // Process in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < customerIds.length; i += batchSize) {
    const batch = customerIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (customerId) => {
        try {
          const features = await calculateCustomerFeatures(customerId);
          return { customerId, features };
        } catch (error) {
          console.error(`Error calculating features for ${customerId}:`, error);
          return null;
        }
      }),
    );

    results.forEach((result) => {
      if (result) {
        featuresMap.set(result.customerId, result.features);
      }
    });
  }

  return featuresMap;
}
