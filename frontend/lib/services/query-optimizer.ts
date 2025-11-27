/**
 * Database query optimization service for Farm2Home
 * Provides optimized queries with proper indexing and caching strategies
 */

import { prisma } from "@/lib/prisma";
import { UserRole, OrderStatus, PaymentStatus } from "@/lib/types";

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
} as const;

// ============================================================================
// OPTIMIZED QUERY BUILDERS
// ============================================================================

class QueryOptimizer {
  /**
   * Get dashboard metrics with optimized queries
   */
  static async getDashboardMetrics() {
    // Use parallel queries for better performance
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      activeFarmers,
      pendingEarnings,
    ] = await Promise.all([
      // Count users with index on role
      prisma.user.count(),

      // Count orders with index on status
      prisma.order.count(),

      // Aggregate revenue with index on status
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),

      // Count active farmers
      prisma.farmerProfile.count({
        where: { verified: true },
      }),

      // Aggregate pending earnings
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
   * Get farmer earnings with optimized queries
   */
  static async getFarmerEarnings(farmerId: string) {
    // Use single query with proper includes
    const [earnings, totalEarnings, pendingEarnings] = await Promise.all([
      // Get recent earnings with related data
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
              createdAt: true,
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

      // Total earnings
      prisma.earnings.aggregate({
        where: { farmerId },
        _sum: { amount: true },
      }),

      // Pending earnings
      prisma.earnings.aggregate({
        where: {
          farmerId,
          status: "PENDING",
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      earnings,
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      pendingEarnings: Number(pendingEarnings._sum.amount || 0),
    };
  }

  /**
   * Get orders with optimized pagination and filtering
   */
  static async getOrdersOptimized(
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

    // Build optimized where clause
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

    // Use select to only fetch needed fields
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              listing: {
                select: {
                  id: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
          shippingAddress: {
            select: {
              id: true,
              line1: true,
              city: true,
              postalCode: true,
            },
          },
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
   * Get products with optimized queries
   */
  static async getProductsOptimized(
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
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          baseUnit: true,
          photos: true,
          createdAt: true,
          farmer: {
            select: {
              id: true,
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
            select: {
              id: true,
              pricePerUnit: true,
              farmerPrice: true,
              storePrice: true,
              availableQty: true,
              margin: true,
            },
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
   * Get analytics data with optimized aggregation
   */
  static async getAnalyticsOptimized(startDate?: Date, endDate?: Date) {
    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    // Use optimized aggregation queries
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
      // Group by month for orders
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM "Order"
        WHERE ${dateFilter.createdAt ? `"createdAt" >= ${startDate} AND "createdAt" <= ${endDate}` : "1=1"}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,
      // Group by month for revenue
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM("amount") as revenue
        FROM "Payment"
        WHERE "status" = 'SUCCESS' 
        ${dateFilter.createdAt ? `AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}` : ""}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,
      // Group by month for user registrations
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM "User"
        WHERE ${dateFilter.createdAt ? `"createdAt" >= ${startDate} AND "createdAt" <= ${endDate}` : "1=1"}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,
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

  /**
   * Get user statistics with optimized queries
   */
  static async getUserStatsOptimized() {
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

  /**
   * Get product statistics with optimized queries
   */
  static async getProductStatsOptimized() {
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

  /**
   * Get order statistics with optimized queries
   */
  static async getOrderStatsOptimized() {
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
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
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
// CACHING STRATEGIES
// ============================================================================

class CacheStrategy {
  /**
   * Get cached data or fetch from database
   */
  static async getCachedData<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<T> {
    // In a real implementation, you would use Redis or similar
    // For now, we'll just call the fetch function
    return await fetchFunction();
  }

  /**
   * Invalidate cache for a specific key
   */
  static async invalidateCache(key: string): Promise<void> {
    // In a real implementation, you would delete from Redis
    console.log(`Cache invalidated for key: ${key}`);
  }

  /**
   * Invalidate cache for multiple keys
   */
  static async invalidateCachePattern(pattern: string): Promise<void> {
    // In a real implementation, you would delete all keys matching pattern
    console.log(`Cache invalidated for pattern: ${pattern}`);
  }
}

// ============================================================================
// QUERY OPTIMIZATION TIPS
// ============================================================================

const QueryOptimizationTips = {
  /**
   * Use select to only fetch needed fields
   */
  selectOnlyNeededFields: true,

  /**
   * Use include sparingly and only when needed
   */
  useIncludeSparingly: true,

  /**
   * Use pagination for large datasets
   */
  usePagination: true,

  /**
   * Use indexes on frequently queried fields
   */
  useIndexes: [
    "User.role",
    "Order.status",
    "Order.customerId",
    "Product.farmerId",
    "ProductListing.isActive",
    "Earnings.farmerId",
    "Earnings.status",
  ],

  /**
   * Use aggregation for statistics
   */
  useAggregation: true,

  /**
   * Use parallel queries when possible
   */
  useParallelQueries: true,

  /**
   * Use raw SQL for complex aggregations
   */
  useRawSQL: true,
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================

export { QueryOptimizer, CacheStrategy, QueryOptimizationTips, CACHE_TTL };
