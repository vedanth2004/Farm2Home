"use server";

import {
  getAdminDashboardMetrics,
  getFarmerDashboardMetrics,
} from "@/lib/payment-revenue-system";
import { prisma } from "@/lib/prisma";

export async function getAdminDashboardMetricsWrapper() {
  try {
    const metrics = await getAdminDashboardMetrics();
    return { success: true, data: metrics };
  } catch (error) {
    console.error("Error fetching admin dashboard metrics:", error);
    return { success: false, error: "Failed to fetch dashboard metrics" };
  }
}

export async function getFarmerDashboardMetricsWrapper(farmerId: string) {
  try {
    const earningsMetrics = await getFarmerDashboardMetrics(farmerId);

    // Get additional farmer-specific metrics
    const [activeProducts, pendingOrders, thisMonthRevenue] = await Promise.all(
      [
        // Active products count
        prisma.product.count({
          where: {
            farmerId,
            listings: {
              some: {
                isActive: true,
              },
            },
          },
        }),

        // Pending orders count
        prisma.order.count({
          where: {
            items: {
              some: {
                listing: {
                  product: {
                    farmerId,
                  },
                },
              },
            },
            status: {
              in: [
                "CREATED",
                "PAID",
                "PICKUP_ASSIGNED",
                "PICKED_UP",
                "AT_CR",
                "OUT_FOR_DELIVERY",
              ],
            },
          },
        }),

        // This month sales (based on earnings)
        (prisma as any).earnings.aggregate({
          where: {
            farmerId,
            status: "PENDING",
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { amount: true },
        }),
      ],
    );

    return {
      success: true,
      data: {
        ...earningsMetrics,
        activeProducts,
        pendingOrders,
        thisMonthRevenue: Number(thisMonthRevenue._sum.amount || 0),
      },
    };
  } catch (error) {
    console.error("Error fetching farmer dashboard metrics:", error);
    return {
      success: false,
      error: "Failed to fetch farmer dashboard metrics",
    };
  }
}

export async function refreshDashboardMetrics() {
  try {
    // This function can be called to force refresh of dashboard metrics
    // In a real implementation, this would invalidate cache and trigger real-time updates
    console.log("Dashboard metrics refresh requested");
    return { success: true, message: "Dashboard metrics refreshed" };
  } catch (error) {
    console.error("Error refreshing dashboard metrics:", error);
    return { success: false, error: "Failed to refresh dashboard metrics" };
  }
}
