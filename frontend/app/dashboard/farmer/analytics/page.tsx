/**
 * Farmer Sales Insights Dashboard
 * Shows monthly sales graphs, top-selling products, and revenue trends
 */

import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils/date";

async function getFarmerAnalytics(userId: string) {
  try {
    // Get farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId },
    });

    if (!farmerProfile) {
      return null;
    }

    // Get current date range (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get all paid orders with this farmer's products
    const earnings = await prisma.earnings.findMany({
      where: {
        farmerId: farmerProfile.id,
        status: {
          in: ["PENDING", "PAID"],
        },
        order: {
          paymentStatus: "SUCCESS",
          status: {
            not: "CANCELLED",
          },
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
      },
      include: {
        order: {
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
        },
        orderItem: {
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
        createdAt: "desc",
      },
    });

    // Calculate monthly sales
    const monthlySales = new Map<string, { revenue: number; orders: number }>();

    for (const earning of earnings) {
      const month = new Date(earning.createdAt).toISOString().slice(0, 7); // YYYY-MM

      const existing = monthlySales.get(month) || { revenue: 0, orders: 0 };
      monthlySales.set(month, {
        revenue: existing.revenue + Number(earning.amount),
        orders: existing.orders + 1,
      });
    }

    // Get top-selling products
    const productSales = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();

    for (const earning of earnings) {
      const productId = earning.orderItem.listing.product.id;
      const productName = earning.orderItem.listing.product.name;
      const quantity = earning.orderItem.quantity;

      const existing = productSales.get(productId) || {
        name: productName,
        quantity: 0,
        revenue: 0,
      };

      productSales.set(productId, {
        name: productName,
        quantity: existing.quantity + quantity,
        revenue: existing.revenue + Number(earning.amount),
      });
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Total stats
    const totalRevenue = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalOrders = new Set(earnings.map((e) => e.orderId)).size;
    const totalProductsSold = earnings.reduce(
      (sum, e) => sum + e.orderItem.quantity,
      0,
    );

    // Monthly trends
    const monthlyTrends = Array.from(monthlySales.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        orders: data.orders,
      }));

    return {
      totalRevenue,
      totalOrders,
      totalProductsSold,
      monthlyTrends,
      topProducts,
    };
  } catch (error) {
    console.error("Error fetching farmer analytics:", error);
    return null;
  }
}

export default async function FarmerAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  await requirePermission("read:analytics");

  const analytics = await getFarmerAnalytics(session.user.id);

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Farmer profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
        <p className="text-gray-600 mt-2">
          Track your sales performance and top products
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₹{analytics.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 6 months</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.totalOrders}
            </div>
            <p className="text-xs text-gray-500 mt-1">Paid orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Products Sold
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.totalProductsSold}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total units</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
            Monthly Revenue Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.monthlyTrends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No sales data available</p>
              </div>
            ) : (
              analytics.monthlyTrends.map((trend) => {
                const maxRevenue = Math.max(
                  ...analytics.monthlyTrends.map((t) => t.revenue),
                );
                const percentage =
                  maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0;

                return (
                  <div key={trend.month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(trend.month + "-01").toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          ₹{trend.revenue.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {trend.orders} orders
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Selling Products */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No product sales data available</p>
              </div>
            ) : (
              analytics.topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-600 rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      ₹{product.revenue.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
