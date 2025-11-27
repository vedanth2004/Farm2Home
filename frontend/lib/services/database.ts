/**
 * Centralized database service for Farm2Home
 * Provides optimized queries and eliminates code duplication
 */

import { prisma } from "@/lib/prisma";
import {
  UserRole,
  OrderStatus,
  PaymentStatus,
  ProductDraftStatus,
} from "@/lib/types";

// ============================================================================
// USER SERVICES
// ============================================================================

class UserService {
  /**
   * Get user by ID with profile information
   */
  static async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        farmerProfile: true,
        crProfile: true,
        pickupAgentProfile: true,
        addresses: true,
      },
    });
  }

  /**
   * Get users by role with pagination
   */
  static async getUsersByRole(
    role: UserRole,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          farmerProfile: true,
          crProfile: true,
          pickupAgentProfile: true,
        },
      }),
      prisma.user.count({ where: { role } }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search users with filters
   */
  static async searchUsers(
    query: string,
    role?: UserRole,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      ...(role && { role }),
      ...(query && {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          farmerProfile: true,
          crProfile: true,
          pickupAgentProfile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    const [totalUsers, usersByRole, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalUsers,
      usersByRole: usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count.role;
          return acc;
        },
        {} as Record<UserRole, number>,
      ),
      recentUsers,
    };
  }
}

// ============================================================================
// PRODUCT SERVICES
// ============================================================================

class ProductService {
  /**
   * Get products with active listings
   */
  static async getActiveProducts(
    category?: string,
    farmerId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      listings: {
        some: {
          isActive: true,
        },
      },
      ...(category && { category }),
      ...(farmerId && { farmerId }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          listings: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get product by ID with full details
   */
  static async getProductById(id: string) {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        farmer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        listings: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        drafts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Get pending product drafts
   */
  static async getPendingDrafts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [drafts, total] = await Promise.all([
      prisma.productDraft.findMany({
        where: { status: "PENDING" },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.productDraft.count({ where: { status: "PENDING" } }),
    ]);

    return {
      drafts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get product statistics
   */
  static async getProductStats() {
    const [totalProducts, activeProducts, pendingDrafts, productsByCategory] =
      await Promise.all([
        prisma.product.count(),
        prisma.product.count({
          where: {
            listings: {
              some: { isActive: true },
            },
          },
        }),
        prisma.productDraft.count({
          where: { status: "PENDING" },
        }),
        prisma.product.groupBy({
          by: ["category"],
          _count: { category: true },
        }),
      ]);

    return {
      totalProducts,
      activeProducts,
      pendingDrafts,
      productsByCategory: productsByCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

// ============================================================================
// ORDER SERVICES
// ============================================================================

class OrderService {
  /**
   * Get orders with filters
   */
  static async getOrders(
    filters: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      customerId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.dateFrom &&
        filters.dateTo && {
          createdAt: {
            gte: filters.dateFrom,
            lte: filters.dateTo,
          },
        }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: {
            include: {
              listing: {
                include: {
                  product: {
                    include: {
                      farmer: {
                        include: {
                          user: {
                            select: {
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          shippingAddress: true,
          payments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order by ID with full details
   */
  static async getOrderById(id: string) {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        items: {
          include: {
            listing: {
              include: {
                product: {
                  include: {
                    farmer: {
                      include: {
                        user: {
                          select: {
                            name: true,
                            email: true,
                            phone: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
        payments: true,
        pickupJob: {
          include: {
            agent: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        delivery: {
          include: {
            cr: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get order statistics
   */
  static async getOrderStats() {
    const [totalOrders, ordersByStatus, totalRevenue, recentOrders] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.payment.aggregate({
          where: { status: "SUCCESS" },
          _sum: { amount: true },
        }),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<OrderStatus, number>,
      ),
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      recentOrders,
    };
  }
}

// ============================================================================
// EARNINGS SERVICES
// ============================================================================

class EarningsService {
  /**
   * Get farmer earnings
   */
  static async getFarmerEarnings(farmerId: string) {
    const [pendingEarnings, totalEarnings, earningsHistory] = await Promise.all(
      [
        prisma.earnings.aggregate({
          where: {
            farmerId,
            status: "PENDING",
          },
          _sum: { amount: true },
        }),
        prisma.earnings.aggregate({
          where: { farmerId },
          _sum: { amount: true },
        }),
        prisma.earnings.findMany({
          where: { farmerId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            order: {
              select: {
                id: true,
                totalAmount: true,
                status: true,
              },
            },
            orderItem: {
              include: {
                listing: {
                  include: {
                    product: {
                      select: {
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ],
    );

    return {
      pendingEarnings: Number(pendingEarnings._sum.amount || 0),
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      earningsHistory,
    };
  }

  /**
   * Get all earnings for admin
   */
  static async getAllEarnings(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      prisma.earnings.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
            },
          },
          orderItem: {
            include: {
              listing: {
                include: {
                  product: {
                    select: {
                      name: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.earnings.count(),
    ]);

    return {
      earnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// ============================================================================
// PAYOUT SERVICES
// ============================================================================

class PayoutService {
  /**
   * Get payouts with filters
   */
  static async getPayouts(
    filters: {
      status?: string;
      beneficiaryType?: string;
      farmerId?: string;
    } = {},
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      ...(filters.status && { status: filters.status as any }),
      ...(filters.beneficiaryType && {
        beneficiaryType: filters.beneficiaryType as any,
      }),
      ...(filters.farmerId && { farmerId: filters.farmerId }),
    };

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.payout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payout statistics
   */
  static async getPayoutStats() {
    const [totalPayouts, payoutsByStatus, totalPayoutAmount, pendingPayouts] =
      await Promise.all([
        prisma.payout.count(),
        prisma.payout.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.payout.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        }),
        prisma.payout.aggregate({
          where: { status: "PENDING" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalPayouts,
      payoutsByStatus: payoutsByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      totalPayoutAmount: Number(totalPayoutAmount._sum.amount || 0),
      pendingPayoutAmount: Number(pendingPayouts._sum.amount || 0),
    };
  }
}

// ============================================================================
// ANALYTICS SERVICES
// ============================================================================

class AnalyticsService {
  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics() {
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      activeFarmers,
      pendingEarnings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.farmerProfile.count(),
      prisma.earnings.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      activeFarmers,
      pendingEarnings: Number(pendingEarnings._sum.amount || 0),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get analytics data with date range
   */
  static async getAnalyticsData(startDate?: Date, endDate?: Date) {
    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      ordersByMonth,
      revenueByMonth,
      userRegistrationsByMonth,
    ] = await Promise.all([
      prisma.user.count({ where: dateFilter }),
      prisma.order.count({ where: dateFilter }),
      prisma.payment.aggregate({
        where: {
          ...dateFilter,
          status: "SUCCESS",
        },
        _sum: { amount: true },
      }),
      prisma.order.groupBy({
        by: ["createdAt"],
        where: dateFilter,
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.groupBy({
        by: ["createdAt"],
        where: {
          ...dateFilter,
          status: "SUCCESS",
        },
        _sum: { amount: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.groupBy({
        by: ["createdAt"],
        where: dateFilter,
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      ordersByMonth,
      revenueByMonth,
      userRegistrationsByMonth,
    };
  }
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

export {
  UserService,
  ProductService,
  OrderService,
  EarningsService,
  PayoutService,
  AnalyticsService,
};
