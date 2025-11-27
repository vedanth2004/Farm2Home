/**
 * Pickup Agent Profile Analytics Dashboard
 * Shows completed deliveries, total earnings, success rate, and performance metrics
 */

import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  MapPin,
} from "lucide-react";

async function getAgentAnalytics(userId: string) {
  try {
    // Get agent profile
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId },
    });

    if (!agentProfile) {
      return null;
    }

    // Get all pickup jobs for this agent
    const allJobs = await prisma.pickupJob.findMany({
      where: {
        agentId: agentProfile.id,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate metrics
    const completedDeliveries = allJobs.filter(
      (job) => job.status === "DELIVERED",
    ).length;

    const pendingJobs = allJobs.filter(
      (job) =>
        job.status === "REQUESTED" ||
        job.status === "ACCEPTED" ||
        job.status === "PICKED_UP",
    ).length;

    const totalJobs = allJobs.length;
    const successRate =
      totalJobs > 0 ? (completedDeliveries / totalJobs) * 100 : 0;

    // Calculate average delivery time (if we have timestamps)
    let avgDeliveryTime = 0;
    const deliveredJobs = allJobs.filter((job) => job.status === "DELIVERED");
    if (deliveredJobs.length > 0) {
      const totalTime = deliveredJobs.reduce((sum, job) => {
        if (job.createdAt && job.updatedAt) {
          const timeDiff =
            new Date(job.updatedAt).getTime() -
            new Date(job.createdAt).getTime();
          return sum + timeDiff;
        }
        return sum;
      }, 0);
      avgDeliveryTime = totalTime / deliveredJobs.length / (1000 * 60 * 60); // Convert to hours
    }

    // Get jobs by status
    const jobsByStatus = {
      requested: allJobs.filter((j) => j.status === "REQUESTED").length,
      accepted: allJobs.filter((j) => j.status === "ACCEPTED").length,
      pickedUp: allJobs.filter((j) => j.status === "PICKED_UP").length,
      delivered: completedDeliveries,
      cancelled: allJobs.filter((j) => j.status === "CANCELLED").length,
    };

    // Monthly breakdown (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentJobs = allJobs.filter(
      (job) => new Date(job.createdAt) >= sixMonthsAgo,
    );

    const monthlyStats = new Map<
      string,
      { deliveries: number; avgTime: number }
    >();

    for (const job of recentJobs.filter((j) => j.status === "DELIVERED")) {
      const month = new Date(job.createdAt).toISOString().slice(0, 7);

      const existing = monthlyStats.get(month) || {
        deliveries: 0,
        avgTime: 0,
      };

      let deliveryTime = 0;
      if (job.createdAt && job.updatedAt) {
        deliveryTime =
          (new Date(job.updatedAt).getTime() -
            new Date(job.createdAt).getTime()) /
          (1000 * 60 * 60); // Hours
      }

      monthlyStats.set(month, {
        deliveries: existing.deliveries + 1,
        avgTime:
          (existing.avgTime * existing.deliveries + deliveryTime) /
          (existing.deliveries + 1),
      });
    }

    return {
      totalJobs,
      completedDeliveries,
      pendingJobs,
      successRate,
      avgDeliveryTime,
      jobsByStatus,
      monthlyStats: Array.from(monthlyStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          deliveries: data.deliveries,
          avgTime: data.avgTime,
        })),
    };
  } catch (error) {
    console.error("Error fetching agent analytics:", error);
    return null;
  }
}

export default async function AgentAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  await requirePermission("read:analytics");

  const analytics = await getAgentAnalytics(session.user.id);

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Agent profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Performance Analytics
        </h1>
        <p className="text-gray-600 mt-2">
          Track your delivery performance and metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Jobs
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.totalJobs}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.completedDeliveries}
            </div>
            <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Completion rate</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Delivery Time
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.avgDeliveryTime > 0
                ? `${analytics.avgDeliveryTime.toFixed(1)}h`
                : "N/A"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Average time</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs by Status */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-600" />
            Jobs by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.jobsByStatus.requested}
              </div>
              <div className="text-sm text-gray-600 mt-1">Requested</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.jobsByStatus.accepted}
              </div>
              <div className="text-sm text-gray-600 mt-1">Accepted</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {analytics.jobsByStatus.pickedUp}
              </div>
              <div className="text-sm text-gray-600 mt-1">Picked Up</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics.jobsByStatus.delivered}
              </div>
              <div className="text-sm text-gray-600 mt-1">Delivered</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {analytics.jobsByStatus.cancelled}
              </div>
              <div className="text-sm text-gray-600 mt-1">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Performance */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
            Monthly Performance (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.monthlyStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No performance data available</p>
              </div>
            ) : (
              analytics.monthlyStats.map((stat) => (
                <div
                  key={stat.month}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(stat.month + "-01").toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Average delivery time: {stat.avgTime.toFixed(1)} hours
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.deliveries}
                    </div>
                    <div className="text-sm text-gray-500">deliveries</div>
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
