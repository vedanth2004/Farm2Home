import { prisma } from "@/lib/prisma";

export interface InventoryValidationResult {
  isValid: boolean;
  errors: string[];
  insufficientItems: Array<{
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
}

/**
 * Validates inventory availability for order items
 */
export async function validateInventory(
  items: Array<{ productId: string; quantity: number }>,
): Promise<InventoryValidationResult> {
  const errors: string[] = [];
  const insufficientItems: InventoryValidationResult["insufficientItems"] = [];

  for (const item of items) {
    // Get the active listing for the product
    const activeListing = await prisma.productListing.findFirst({
      where: {
        productId: item.productId,
        isActive: true,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!activeListing) {
      errors.push(`Product ${item.productId} is not available`);
      insufficientItems.push({
        productId: item.productId,
        productName: "Unknown Product",
        requestedQuantity: item.quantity,
        availableQuantity: 0,
      });
      continue;
    }

    if (activeListing.availableQty < item.quantity) {
      errors.push(
        `Insufficient stock for ${activeListing.product.name}. Available: ${activeListing.availableQty}, Requested: ${item.quantity}`,
      );
      insufficientItems.push({
        productId: item.productId,
        productName: activeListing.product.name,
        requestedQuantity: item.quantity,
        availableQuantity: activeListing.availableQty,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    insufficientItems,
  };
}

/**
 * Reserves inventory for order items (decreases available quantity)
 */
export async function reserveInventory(
  items: Array<{ listingId: string; quantity: number }>,
): Promise<void> {
  for (const item of items) {
    // Reserve inventory (decrease available quantity)
    await prisma.productListing.update({
      where: { id: item.listingId },
      data: {
        availableQty: {
          decrement: item.quantity,
        },
      },
    });

    // Create inventory transaction record
    await prisma.inventoryTransaction.create({
      data: {
        listingId: item.listingId,
        delta: -item.quantity, // Negative delta for reservation
        reason: "ORDER_RESERVE",
      },
    });
  }
}

/**
 * Restores inventory for order items (increases available quantity)
 */
export async function restoreInventory(
  items: Array<{ listingId: string; quantity: number }>,
): Promise<void> {
  for (const item of items) {
    // Restore inventory (increase available quantity)
    await prisma.productListing.update({
      where: { id: item.listingId },
      data: {
        availableQty: {
          increment: item.quantity,
        },
      },
    });

    // Create inventory transaction record
    await prisma.inventoryTransaction.create({
      data: {
        listingId: item.listingId,
        delta: item.quantity, // Positive delta for restoration
        reason: "ORDER_CANCEL",
      },
    });
  }
}

/**
 * Gets inventory transaction history for a product listing
 */
export async function getInventoryHistory(listingId: string) {
  return await prisma.inventoryTransaction.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
    take: 50, // Last 50 transactions
  });
}

/**
 * Get low stock alerts for a farmer
 */
export async function getLowStockAlerts(farmerId: string) {
  const products = await prisma.product.findMany({
    where: { farmerId },
    include: {
      listings: {
        where: {
          isActive: true,
        },
      },
    },
  });

  const lowStockItems = [];

  for (const product of products) {
    for (const listing of product.listings) {
      const threshold = listing.lowStockThreshold || 10;
      if (listing.availableQty <= threshold) {
        lowStockItems.push({
          productId: product.id,
          productName: product.name,
          listingId: listing.id,
          availableQty: listing.availableQty,
          threshold,
          isLowStock: listing.availableQty <= threshold,
          isOutOfStock: listing.availableQty === 0,
        });
      }
    }
  }

  return lowStockItems;
}

/**
 * Check and update low stock status
 */
export async function checkLowStock(listingId: string) {
  const listing = await prisma.productListing.findUnique({
    where: { id: listingId },
    include: {
      product: true,
    },
  });

  if (!listing) return null;

  const threshold = listing.lowStockThreshold || 10;
  const isLowStock = listing.availableQty <= threshold;
  const isOutOfStock = listing.availableQty === 0;

  return {
    listingId,
    productName: listing.product.name,
    availableQty: listing.availableQty,
    threshold,
    isLowStock,
    isOutOfStock,
  };
}
