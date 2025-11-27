/**
 * Unified Metrics API for Admin and CR Dashboards
 * Ensures consistent stats across all dashboards
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { cache, cacheKeys } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and CR can access metrics
    await requirePermission("read:dashboard");

    const url = new URL(request.url);
    const role = url.searchParams.get("role") || session.user.role;
    const timeframe = url.searchParams.get("timeframe") || "all"; // all, today, week, month

    // Check cache
    const cacheKey = cacheKeys.metrics(timeframe, role as string);
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Build date filter
    let dateFilter: Prisma.OrderWhereInput = {};
    let userDateFilter: Prisma.UserWhereInput = {};
    let pickupJobDateFilter: Prisma.PickupJobWhereInput = {};
    let deliveryDateFilter: Prisma.DeliveryWhereInput = {};

    const now = new Date();
    let startDate: Date | undefined;

    switch (timeframe) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    if (startDate) {
      dateFilter.createdAt = { gte: startDate };
      userDateFilter.createdAt = { gte: startDate };
      pickupJobDateFilter.updatedAt = { gte: startDate };
      deliveryDateFilter.createdAt = { gte: startDate };
    }

    // Base filter for paid and non-cancelled orders
    const paidOrdersFilter: Prisma.OrderWhereInput = {
      ...dateFilter,
      paymentStatus: "SUCCESS",
      status: {
        not: "CANCELLED",
      },
    };

    // Total Revenue - Only SUCCESS payments, non-cancelled orders
    const totalRevenue = await prisma.order.aggregate({
      where: paidOrdersFilter,
      _sum: {
        totalAmount: true,
      },
    });

    // Total Orders - All orders regardless of payment status
    const totalOrders = await prisma.order.count({
      where: dateFilter,
    });

    // Paid Orders Count
    const paidOrdersCount = await prisma.order.count({
      where: paidOrdersFilter,
    });

    // Pending Orders
    const pendingOrders = await prisma.order.count({
      where: {
        ...dateFilter,
        status: {
          in: ["CREATED", "PAID", "PICKUP_ASSIGNED"],
        },
      },
    });

    // Active Farmers - Farmers with at least one paid order
    const activeFarmersCount = await prisma.farmerProfile.count({
      where: {
        products: {
          some: {
            listings: {
              some: {
                orderItems: {
                  some: {
                    order: paidOrdersFilter,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Pending Earnings - From paid orders not yet paid out
    const pendingEarnings = await prisma.earnings.aggregate({
      where: {
        status: "PENDING",
        order: {
          paymentStatus: "SUCCESS",
          status: {
            not: "CANCELLED",
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Admin Profit - (storePrice - farmerPrice) * quantity for paid orders
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: paidOrdersFilter,
      },
      select: {
        unitPrice: true,
        farmerPrice: true,
        quantity: true,
        platformFee: true,
      },
    });

    let adminProfit = 0;
    for (const item of orderItems) {
      const platformFee = item.platformFee
        ? Number(item.platformFee)
        : (Number(item.unitPrice) - (Number(item.farmerPrice) || 0)) *
          item.quantity;
      adminProfit += platformFee;
    }

    // Total Customers
    const totalCustomers = await prisma.user.count({
      where: {
        role: "CUSTOMER",
        ...(timeframe !== "all" && userDateFilter),
      },
    });

    // Orders by Status
    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      where: dateFilter,
      _count: {
        id: true,
      },
    });

    // Orders by Payment Status
    const ordersByPaymentStatus = await prisma.order.groupBy({
      by: ["paymentStatus"],
      where: dateFilter,
      _count: {
        id: true,
      },
    });

    // Recent Orders (last 10)
    const recentOrders = await prisma.order.findMany({
      where: dateFilter,
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          take: 3,
          include: {
            listing: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Role-specific metrics
    let roleMetrics: any = {};

    if (role === "FARMER" && session.user.id) {
      // Get farmer profile
      const farmerProfile = await prisma.farmerProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (farmerProfile) {
        // Farmer's total earnings
        const farmerEarnings = await prisma.earnings.aggregate({
          where: {
            farmerId: farmerProfile.id,
            status: "PENDING",
            order: {
              paymentStatus: "SUCCESS",
            },
          },
          _sum: {
            amount: true,
          },
        });

        // Farmer's products sold
        const productsSold = await prisma.orderItem.aggregate({
          where: {
            listing: {
              product: {
                farmerId: farmerProfile.id,
              },
            },
            order: paidOrdersFilter,
          },
          _sum: {
            quantity: true,
          },
        });

        roleMetrics = {
          pendingEarnings: Number(farmerEarnings._sum.amount || 0),
          productsSold: Number(productsSold._sum.quantity || 0),
        };
      }
    }

    if (role === "PICKUP_AGENT" && session.user.id) {
      // Get agent profile
      const agentProfile = await prisma.pickupAgentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (agentProfile) {
        // Agent's completed deliveries
        const completedDeliveries = await prisma.pickupJob.count({
          where: {
            agentId: agentProfile.id,
            status: "DELIVERED",
            ...(timeframe !== "all" && pickupJobDateFilter),
          },
        });

        // Agent's pending pickups
        const pendingPickups = await prisma.pickupJob.count({
          where: {
            agentId: agentProfile.id,
            status: {
              in: ["REQUESTED", "ACCEPTED", "PICKED_UP"],
            },
          },
        });

        roleMetrics = {
          completedDeliveries,
          pendingPickups,
        };
      }
    }

    if (role === "CR" && session.user.id) {
      // Get CR profile
      const crProfile = await prisma.cRProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (crProfile) {
        // CR's deliveries
        const crDeliveries = await prisma.delivery.count({
          where: {
            crId: crProfile.id,
            ...(timeframe !== "all" && deliveryDateFilter),
          },
        });

        roleMetrics = {
          deliveries: crDeliveries,
        };
      }
    }

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        // Core metrics
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        totalOrders,
        paidOrdersCount,
        pendingOrders,
        activeFarmers: activeFarmersCount,
        pendingEarnings: Number(pendingEarnings._sum.amount || 0),
        adminProfit,
        totalCustomers,

        // Breakdowns
        ordersByStatus: ordersByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
        ordersByPaymentStatus: ordersByPaymentStatus.reduce(
          (acc, item) => {
            acc[item.paymentStatus] = item._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),

        // Recent activity
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: Number(order.totalAmount),
          createdAt: order.createdAt,
          customer: order.customer,
          itemsCount: order.items.length,
        })),

        // Role-specific
        ...roleMetrics,

        // Metadata
        timeframe,
        generatedAt: new Date().toISOString(),
      },
    };

    // Cache for 30 seconds
    cache.set(cacheKey, responseData.data, 30 * 1000);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
