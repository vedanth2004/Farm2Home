import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { createCRServiceAreaFilter } from "@/lib/cr-utils";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCREarnings() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get CR profile
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!crProfile) return null;

    // Get completed orders in CR's service areas for earnings calculation using comprehensive filtering
    const serviceAreaFilter = createCRServiceAreaFilter(crProfile);
    const completedOrders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        ...serviceAreaFilter,
      },
      include: {
        items: {
          include: {
            listing: true,
          },
        },
        payments: true,
      },
    });

    // Calculate earnings (assuming CR gets a percentage of platform fees)
    const totalEarnings = completedOrders.reduce((sum, order) => {
      const orderEarnings = order.items.reduce((itemSum, item) => {
        // CR gets 5% of the platform fee
        const platformFee =
          typeof item.platformFee === "number"
            ? item.platformFee
            : Number(item.platformFee) || 0;
        return itemSum + platformFee * 0.05;
      }, 0);
      return sum + orderEarnings;
    }, 0);

    // Get monthly earnings breakdown
    const monthlyEarnings = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthOrders = completedOrders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startOfMonth && orderDate <= endOfMonth;
      });

      const monthEarnings = monthOrders.reduce((sum, order) => {
        const orderEarnings = order.items.reduce((itemSum, item) => {
          const platformFee =
            typeof item.platformFee === "number"
              ? item.platformFee
              : Number(item.platformFee) || 0;
          return itemSum + platformFee * 0.05;
        }, 0);
        return sum + orderEarnings;
      }, 0);

      monthlyEarnings.push({
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        earnings: monthEarnings,
        orders: monthOrders.length,
      });
    }

    // Get recent earnings
    const recentEarnings = completedOrders.slice(0, 10).map((order) => ({
      id: order.id,
      date: order.createdAt,
      amount: order.items.reduce((sum, item) => {
        const platformFee =
          typeof item.platformFee === "number"
            ? item.platformFee
            : Number(item.platformFee) || 0;
        return sum + platformFee * 0.05;
      }, 0),
      status: order.paymentStatus,
      itemsCount: order.items.length,
    }));

    return {
      crProfile,
      totalEarnings,
      monthlyEarnings,
      recentEarnings,
      totalOrders: completedOrders.length,
    };
  } catch (error) {
    console.error("Error fetching CR earnings:", error);
    return null;
  }
}

export default async function CREarningsPage() {
  await requirePermission("read:payouts");

  const data = await getCREarnings();

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load earnings data.</p>
      </div>
    );
  }

  const { totalEarnings, monthlyEarnings, recentEarnings, totalOrders } = data;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Earnings Overview
          </h1>
          <p className="text-gray-600 mt-1">
            Track your earnings from completed deliveries
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">All time earnings</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {monthlyEarnings[monthlyEarnings.length - 1]?.earnings.toFixed(
                2,
              ) || "0.00"}
            </div>
            <p className="text-xs text-gray-500">Current month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed Orders
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-500">Orders delivered</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average per Order
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {totalOrders > 0
                ? (totalEarnings / totalOrders).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-gray-500">Per completed order</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Monthly Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyEarnings.map((month, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{month.month}</p>
                  <p className="text-sm text-gray-600">
                    {month.orders} orders completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{month.earnings.toFixed(2)}
                  </p>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((month.earnings / Math.max(...monthlyEarnings.map((m) => m.earnings))) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Recent Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEarnings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No earnings data available</p>
              </div>
            ) : (
              recentEarnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Order #{earning.id.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {earning.itemsCount} item
                      {earning.itemsCount !== 1 ? "s" : ""} •{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(earning.date))}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusBadgeColor(earning.status)}>
                      {getStatusIcon(earning.status)}
                      <span className="ml-1">{earning.status}</span>
                    </Badge>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ₹{earning.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earnings Information */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Earnings Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <DollarSign className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-purple-800 mb-2">
                  How Earnings Work
                </h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <p>
                    • You earn 5% of the platform fee from each completed order
                    in your service areas
                  </p>
                  <p>
                    • Earnings are calculated when orders are marked as
                    &quot;DELIVERED&quot;
                  </p>
                  <p>
                    • Payments are processed monthly through your registered
                    payment method
                  </p>
                  <p>
                    • You can track your earnings in real-time through this
                    dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
