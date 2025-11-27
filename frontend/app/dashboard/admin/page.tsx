import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  DollarSign,
  Tag,
  Star,
  Brain,
  FileText,
  UserX,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serializeOrders } from "@/lib/serialization";
import PendingApprovalsDashboard from "@/components/admin/PendingApprovalsDashboard";
import { getAdminDashboardMetricsWrapper } from "@/lib/actions/dashboard-actions";
import RealTimeDashboard from "@/components/admin/RealTimeDashboard";
import GlobalSearch from "@/components/admin/GlobalSearch";

async function getAdminStats() {
  try {
    // Get current month data
    const currentMonth = new Date();
    currentMonth.setDate(1);

    // Get last month data
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    const lastMonthEnd = new Date(lastMonth);
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
    lastMonthEnd.setDate(0);

    const [
      totalUsers,
      totalOrders,
      pendingApprovals,
      totalRevenue,
      totalFarmers,
      totalProducts,
      totalEarnings,
      currentMonthUsers,
      currentMonthOrders,
      currentMonthRevenue,
      lastMonthUsers,
      lastMonthOrders,
      lastMonthRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.productDraft.count({
        where: { status: "PENDING" },
      }),
      // Calculate revenue from paid and non-cancelled orders only
      prisma.order.aggregate({
        where: {
          paymentStatus: "SUCCESS",
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.farmerProfile.count(),
      prisma.product.count(),
      (prisma as any).earnings.aggregate({
        _sum: { amount: true },
      }),
      // Current month stats
      prisma.user.count({
        where: {
          createdAt: { gte: currentMonth },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: currentMonth },
        },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: "SUCCESS",
          status: {
            not: "CANCELLED",
          },
          createdAt: { gte: currentMonth },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      // Last month stats
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd,
          },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd,
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: "SUCCESS",
          status: {
            not: "CANCELLED",
          },
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Calculate growth percentages
    const userGrowth =
      lastMonthUsers > 0
        ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
        : currentMonthUsers > 0
          ? 100
          : 0;

    const orderGrowth =
      lastMonthOrders > 0
        ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
        : currentMonthOrders > 0
          ? 100
          : 0;

    const revenueGrowth =
      Number(lastMonthRevenue._sum.totalAmount || 0) > 0
        ? ((Number(currentMonthRevenue._sum.totalAmount || 0) -
            Number(lastMonthRevenue._sum.totalAmount || 0)) /
            Number(lastMonthRevenue._sum.totalAmount || 0)) *
          100
        : Number(currentMonthRevenue._sum.totalAmount || 0) > 0
          ? 100
          : 0;

    return {
      totalUsers,
      totalOrders,
      pendingApprovals,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalFarmers,
      totalProducts,
      totalEarnings: totalEarnings._sum.amount || 0,
      userGrowth,
      orderGrowth,
      revenueGrowth,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      totalUsers: 0,
      totalOrders: 0,
      pendingApprovals: 0,
      totalRevenue: 0,
      totalFarmers: 0,
      totalProducts: 0,
      totalEarnings: 0,
      userGrowth: 0,
      orderGrowth: 0,
      revenueGrowth: 0,
    };
  }
}

async function getRecentOrders() {
  try {
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
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
    return orders;
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    return [];
  }
}

async function getPendingApprovals() {
  try {
    const drafts = await prisma.productDraft.findMany({
      where: { status: "PENDING" },
      take: 5,
      include: {
        product: {
          include: {
            farmer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Convert Decimal to number for client components
    return drafts.map((draft: any) => ({
      ...draft,
      pricePerUnit: Number(draft.pricePerUnit),
      farmerPrice: draft.farmerPrice
        ? Number(draft.farmerPrice)
        : Number(draft.pricePerUnit),
      storePrice: draft.storePrice ? Number(draft.storePrice) : undefined,
    }));
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return [];
  }
}

export default async function AdminDashboard() {
  await requirePermission("read:analytics");

  const [stats, recentOrders, pendingApprovals] = await Promise.all([
    getAdminStats(),
    getRecentOrders(),
    getPendingApprovals(),
  ]);

  // Serialize orders to convert Decimal objects to numbers
  const serializedRecentOrders = serializeOrders(recentOrders);

  // Get initial metrics for the RealTimeDashboard
  const initialMetrics = await getAdminDashboardMetricsWrapper();

  return (
    <div className="space-y-8">
      {/* Global Search Bar */}
      <div className="flex justify-end">
        <GlobalSearch />
      </div>

      {/* Real-time Dashboard */}
      <RealTimeDashboard
        initialMetrics={
          initialMetrics.success && initialMetrics.data
            ? initialMetrics.data
            : {
                totalRevenue: 0,
                totalProfit: 0,
                pendingOrders: 0,
                completedOrders: 0,
                totalOrders: 0,
                activeFarmers: 0,
                pendingEarnings: 0,
                lastUpdated: new Date().toISOString(),
              }
        }
      />

      {/* Additional Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Recent Orders
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/admin/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serializedRecentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent orders</p>
                </div>
              ) : (
                serializedRecentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Order #{order.id.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""} •{" "}
                        {order.customer.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        ₹{order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          order.status === "DELIVERED" ? "default" : "secondary"
                        }
                        className={
                          order.status === "DELIVERED"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {order.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Pending Approvals
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/admin/approvals">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <PendingApprovalsDashboard initialApprovals={pendingApprovals} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/users">
                <Users className="h-6 w-6 mb-2" />
                Manage Users
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/approvals">
                <Clock className="h-6 w-6 mb-2" />
                Account Approvals
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/products">
                <Package className="h-6 w-6 mb-2" />
                Review Products
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/orders">
                <ShoppingCart className="h-6 w-6 mb-2" />
                View Orders
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/payouts">
                <DollarSign className="h-6 w-6 mb-2" />
                Manage Payouts
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/coupons">
                <Tag className="h-6 w-6 mb-2" />
                Manage Coupons
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/reviews">
                <Star className="h-6 w-6 mb-2" />
                Review Moderation
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/analytics">
                <TrendingUp className="h-6 w-6 mb-2" />
                Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/ml/predictions">
                <Brain className="h-6 w-6 mb-2" />
                ML Predictions
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/ml/dynamic-pricing">
                <TrendingDown className="h-6 w-6 mb-2" />
                Dynamic Pricing
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/ml/churn">
                <UserX className="h-6 w-6 mb-2" />
                Churn Prediction
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/admin/system-logs">
                <FileText className="h-6 w-6 mb-2" />
                System Logs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
