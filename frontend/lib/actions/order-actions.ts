"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
// Define OrderStatus type manually
type OrderStatus =
  | "CREATED"
  | "PAID"
  | "PICKUP_ASSIGNED"
  | "PICKED_UP"
  | "AT_CR"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    await requirePermission("write:orders");

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        customer: true,
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
    });

    return { success: true, order };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { error: "Failed to update order status" };
  }
}

export async function searchOrders(query: string, status?: string) {
  try {
    await requirePermission("read:orders");

    const where: any = {
      OR: [
        { id: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
      ],
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        shippingAddress: true,
        items: {
          include: {
            listing: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, orders };
  } catch (error) {
    console.error("Error searching orders:", error);
    return { error: "Failed to search orders" };
  }
}

export async function exportOrders(format: "csv" | "json" = "csv") {
  try {
    await requirePermission("read:orders");

    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: {
          include: {
            listing: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (format === "json") {
      return {
        success: true,
        data: JSON.stringify(orders, null, 2),
        format: "json",
      };
    }

    // CSV format
    const csvHeaders =
      "Order ID,Customer,Status,Total Amount,Payment Status,Created At,Items\n";
    const csvRows = orders
      .map((order: any) => {
        const items = order.items
          .map((item: any) => `${item.listing.product.name} (${item.quantity})`)
          .join("; ");
        return `${order.id},${order.customer.name},${order.status},${order.totalAmount},${order.paymentStatus},${order.createdAt.toISOString()},${items}`;
      })
      .join("\n");

    return { success: true, data: csvHeaders + csvRows, format: "csv" };
  } catch (error) {
    console.error("Error exporting orders:", error);
    return { error: "Failed to export orders" };
  }
}
