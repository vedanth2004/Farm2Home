/**
 * CR Workload Dashboard
 * Shows daily pickups, pending deliveries, performance ratio, and workload metrics
 */

import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
} from "lucide-react";
import { createCRServiceAreaFilter } from "@/lib/cr-utils";

async function getCRWorkload(userId: string) {
  try {
    // Get CR profile
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId },
    });

    if (!crProfile) {
      return null;
    }

    // Service area filter
    const serviceAreaFilter = createCRServiceAreaFilter(crProfile);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get daily pickups (today)
    const dailyPickups = await prisma.order.count({
      where: {
        ...serviceAreaFilter,
        status: {
          in: ["PICKED_UP", "OUT_FOR_DELIVERY"],
        },
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get pending deliveries
    const pendingDeliveries = await prisma.order.count({
      where: {
        ...serviceAreaFilter,
        status: {
          in: ["CREATED", "PICKED_UP", "AT_CR", "OUT_FOR_DELIVERY"],
        },
      },
    });

    // Get completed deliveries (today)
    const completedToday = await prisma.order.count({
      where: {
        ...serviceAreaFilter,
        status: "DELIVERED",
        updatedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get total orders in service areas
    const totalOrders = await prisma.order.count({
      where: serviceAreaFilter,
    });

    // Get completed orders (all time)
    const completedOrders = await prisma.order.count({
      where: {
        ...serviceAreaFilter,
        status: "DELIVERED",
      },
    });

    // Performance ratio
    const performanceRatio =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Get orders by status (for breakdown)
    const ordersByStatus = {
      created: await prisma.order.count({
        where: {
          ...serviceAreaFilter,
          status: "CREATED",
        },
      }),
      pickedUp: await prisma.order.count({
        where: {
          ...serviceAreaFilter,
          status: "PICKED_UP",
        },
      }),
      outForDelivery: await prisma.order.count({
        where: {
          ...serviceAreaFilter,
          status: "OUT_FOR_DELIVERY",
        },
      }),
      deliveryRequested: await prisma.order.count({
        where: {
          ...serviceAreaFilter,
          status: "AT_CR",
        },
      }),
      delivered: completedOrders,
      cancelled: await prisma.order.count({
        where: {
          ...serviceAreaFilter,
          status: "CANCELLED",
        },
      }),
    };

    // Weekly breakdown (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weeklyStats = await prisma.order.groupBy({
      by: ["status"],
      where: {
        ...serviceAreaFilter,
        createdAt: {
          gte: weekAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    const weeklyBreakdown = weeklyStats.map((stat) => ({
      status: stat.status,
      count: stat._count.id,
    }));

    // Get active farmers in service areas
    const activeFarmers = await prisma.order.findMany({
      where: {
        ...serviceAreaFilter,
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        items: {
          include: {
            listing: {
              include: {
                product: {
                  include: {
                    farmer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const uniqueFarmers = new Set(
      activeFarmers
        .flatMap((order) =>
          order.items.map((item) => item.listing.product.farmerId),
        )
        .filter((id) => id),
    );

    return {
      dailyPickups,
      pendingDeliveries,
      completedToday,
      totalOrders,
      completedOrders,
      performanceRatio,
      ordersByStatus,
      weeklyBreakdown,
      activeFarmersCount: uniqueFarmers.size,
    };
  } catch (error) {
    console.error("Error fetching CR workload:", error);
    return null;
  }
}

export default async function CRWorkloadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  await requirePermission("read:dashboard");

  const workload = await getCRWorkload(session.user.id);

  if (!workload) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">CR profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Workload Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Track your daily pickups, deliveries, and performance metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Daily Pickups
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {workload.dailyPickups}
            </div>
            <p className="text-xs text-gray-500 mt-1">Today&apos;s pickups</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Deliveries
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {workload.pendingDeliveries}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {workload.completedToday}
            </div>
            <p className="text-xs text-gray-500 mt-1">Deliveries completed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Performance Ratio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {workload.performanceRatio.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-600" />
            Orders by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {workload.ordersByStatus.created}
              </div>
              <div className="text-sm text-gray-600 mt-1">Created</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {workload.ordersByStatus.pickedUp}
              </div>
              <div className="text-sm text-gray-600 mt-1">Picked Up</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {workload.ordersByStatus.outForDelivery}
              </div>
              <div className="text-sm text-gray-600 mt-1">Out for Delivery</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {workload.ordersByStatus.deliveryRequested}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Delivery Requested
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {workload.ordersByStatus.delivered}
              </div>
              <div className="text-sm text-gray-600 mt-1">Delivered</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {workload.ordersByStatus.cancelled}
              </div>
              <div className="text-sm text-gray-600 mt-1">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Performance */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-purple-600" />
            Weekly Performance (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workload.weeklyBreakdown.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No performance data available</p>
              </div>
            ) : (
              workload.weeklyBreakdown.map((stat) => {
                const totalWeekly =
                  workload.weeklyBreakdown.reduce(
                    (sum, s) => sum + s.count,
                    0,
                  ) || 1;
                const percentage = (stat.count / totalWeekly) * 100;

                return (
                  <div
                    key={stat.status}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {stat.status.replace("_", " ")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {percentage.toFixed(1)}% of weekly orders
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {stat.count}
                      </div>
                      <div className="text-sm text-gray-500">orders</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Active Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900">
              {workload.activeFarmersCount}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Farmers with orders in your service areas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Overall Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-bold text-gray-900">
                  {workload.totalOrders}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed Orders</span>
                <span className="font-bold text-green-600">
                  {workload.completedOrders}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-bold text-purple-600">
                  {workload.performanceRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
