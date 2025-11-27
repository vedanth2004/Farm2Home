import { Decimal } from "@prisma/client/runtime/library";

/**
 * Recursively converts Prisma Decimal objects to numbers
 * This is needed because Next.js doesn't support Decimal objects in Client Components
 */
export function serializePrismaData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Decimal) {
    return Number(data) as T;
  }

  if (Array.isArray(data)) {
    return data.map(serializePrismaData) as T;
  }

  if (typeof data === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializePrismaData(value);
    }
    return serialized as T;
  }

  return data;
}

/**
 * Type-safe version for orders with known structure
 */
export function serializeOrders(orders: any[]) {
  return orders.map((order) => ({
    ...order,
    totalAmount: Number(order.totalAmount),
    items:
      order.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        farmerPrice: item.farmerPrice ? Number(item.farmerPrice) : null,
        platformFee: item.platformFee ? Number(item.platformFee) : null,
        listing: {
          ...item.listing,
          pricePerUnit: Number(item.listing.pricePerUnit),
          farmerPrice: item.listing.farmerPrice
            ? Number(item.listing.farmerPrice)
            : null,
          storePrice: item.listing.storePrice
            ? Number(item.listing.storePrice)
            : null,
          margin: item.listing.margin ? Number(item.listing.margin) : null,
        },
      })) || [],
    payments:
      order.payments?.map((payment: any) => ({
        ...payment,
        amount: Number(payment.amount),
      })) || [],
  }));
}

/**
 * Type-safe version for products with known structure
 */
export function serializeProducts(products: any[]) {
  return products.map((product) => ({
    ...product,
    listings:
      product.listings?.map((listing: any) => ({
        ...listing,
        pricePerUnit: Number(listing.pricePerUnit),
        farmerPrice: listing.farmerPrice ? Number(listing.farmerPrice) : null,
        storePrice: listing.storePrice ? Number(listing.storePrice) : null,
        margin: listing.margin ? Number(listing.margin) : null,
      })) || [],
    drafts:
      product.drafts?.map((draft: any) => ({
        ...draft,
        pricePerUnit: Number(draft.pricePerUnit),
        farmerPrice: draft.farmerPrice ? Number(draft.farmerPrice) : null,
        storePrice: draft.storePrice ? Number(draft.storePrice) : null,
      })) || [],
  }));
}
