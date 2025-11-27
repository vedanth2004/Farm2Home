import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getPickupAgentData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get or create pickup agent profile
    let agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
      },
    });

    if (!agentProfile) {
      // Create agent profile if it doesn't exist
      agentProfile = await prisma.pickupAgentProfile.create({
        data: {
          userId: session.user.id,
          serviceAreas: ["Default Area"],
          vehicleType: "Bike",
        },
        include: {
          user: true,
        },
      });
    }

    // Get agent's pickup jobs
    const pickupJobs = await prisma.pickupJob.findMany({
      where: { agentId: agentProfile.id },
      include: {
        order: {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculate metrics
    const totalJobs = pickupJobs.length;
    const completedJobs = pickupJobs.filter(
      (job) => job.status === "HANDED_TO_CR",
    ).length;
    const pendingJobs = pickupJobs.filter(
      (job) => job.status === "REQUESTED" || job.status === "ACCEPTED",
    ).length;
    const inProgressJobs = pickupJobs.filter(
      (job) => job.status === "PICKED_UP",
    ).length;

    // Get recent earnings (if any)
    const recentEarnings = await prisma.payout.findMany({
      where: {
        beneficiaryType: "PICKUP_AGENT",
        beneficiaryId: agentProfile.id,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      agentProfile,
      pickupJobs,
      metrics: {
        totalJobs,
        completedJobs,
        pendingJobs,
        inProgressJobs: inProgressJobs,
      },
      recentEarnings,
    };
  } catch (error) {
    console.error("Error fetching pickup agent data:", error);
    return null;
  }
}

export default async function PickupAgentDashboard() {
  await requirePermission("read:pickup");

  const data = await getPickupAgentData();

  if (!data || !data.agentProfile) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
          <Truck className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Error Loading Dashboard
        </h3>
        <p className="text-gray-600">
          There was an error loading your dashboard. Please try again.
        </p>
      </div>
    );
  }

  const { agentProfile, pickupJobs, metrics, recentEarnings } = data;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome, {agentProfile.user?.name || "Pickup Agent"}!
            </h1>
            <p className="text-blue-100">
              Manage your pickup jobs and track deliveries
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
            <div className="text-blue-100">Total Jobs</div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalJobs}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.completedJobs}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.pendingJobs}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Truck className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.inProgressJobs}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Pickup Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Recent Pickup Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pickupJobs.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pickup jobs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pickupJobs.slice(0, 5).map((job) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case "HANDED_TO_CR":
                        return "bg-green-100 text-green-800";
                      case "PICKED_UP":
                        return "bg-blue-100 text-blue-800";
                      case "ACCEPTED":
                        return "bg-yellow-100 text-yellow-800";
                      case "REQUESTED":
                        return "bg-gray-100 text-gray-800";
                      case "CANCELLED":
                        return "bg-red-100 text-red-800";
                      default:
                        return "bg-gray-100 text-gray-800";
                    }
                  };

                  return (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">
                            Order #{job.order.id.slice(-8)}
                          </h4>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {job.order.customer.name} • ₹
                          {Number(job.order.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {job.order.shippingAddress.city},{" "}
                          {job.order.shippingAddress.state}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/agent/jobs/${job.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/agent/jobs">
                  <Package className="h-6 w-6 mb-2" />
                  View All Jobs
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/agent/earnings">
                  <DollarSign className="h-6 w-6 mb-2" />
                  Earnings
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/agent/profile">
                  <Users className="h-6 w-6 mb-2" />
                  Profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/agent/schedule">
                  <Calendar className="h-6 w-6 mb-2" />
                  Schedule
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Earnings */}
      {recentEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Recent Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEarnings.map((earning) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "PAID":
                      return "bg-green-100 text-green-800";
                    case "PENDING":
                      return "bg-yellow-100 text-yellow-800";
                    case "REJECTED":
                      return "bg-red-100 text-red-800";
                    default:
                      return "bg-gray-100 text-gray-800";
                  }
                };

                return (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">
                        ₹{Number(earning.amount).toFixed(2)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(earning.createdAt))}
                      </p>
                    </div>
                    <Badge className={getStatusColor(earning.status)}>
                      {earning.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
