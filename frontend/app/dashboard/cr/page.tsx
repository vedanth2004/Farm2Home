import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { serializeOrders } from "@/lib/serialization";
import { createCRServiceAreaFilter } from "@/lib/cr-utils";
import {
  ShoppingCart,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  MessageCircle,
  MapPin,
  DollarSign,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCRData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get CR profile
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
      },
    });

    if (!crProfile) return null;

    // Get orders in CR's service areas using comprehensive filtering
    const serviceAreaFilter = createCRServiceAreaFilter(crProfile);
    const orders = await prisma.order.findMany({
      where: serviceAreaFilter,
      include: {
        customer: {
          include: {
            addresses: true,
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
                        user: true,
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
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Get delivery statistics using the same comprehensive filtering

    const totalOrders = await prisma.order.count({
      where: serviceAreaFilter,
    });

    const completedOrders = await prisma.order.count({
      where: {
        ...serviceAreaFilter,
        status: "DELIVERED",
      },
    });

    const pendingOrders = await prisma.order.count({
      where: {
        ...serviceAreaFilter,
        status: {
          in: ["CREATED", "PICKED_UP", "OUT_FOR_DELIVERY"],
        },
      },
    });

    return {
      crProfile,
      orders,
      stats: {
        totalOrders,
        completedOrders,
        pendingOrders,
        completionRate:
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
    };
  } catch (error) {
    console.error("Error fetching CR data:", error);
    return null;
  }
}

export default async function CRDashboard() {
  await requirePermission("read:orders");

  const data = await getCRData();

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load dashboard data.</p>
      </div>
    );
  }

  const { crProfile, orders, stats } = data;
  const serializedOrders = serializeOrders(orders);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800";
      case "OUT_FOR_DELIVERY":
        return "bg-orange-100 text-orange-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "PICKED_UP":
        return <Truck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Community Representative Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {crProfile.user.name}! Manage deliveries in your
            service areas.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Communication Hub
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <MapPin className="h-4 w-4 mr-2" />
            Service Areas
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-gray-500">In your service areas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-gray-500">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-gray-500">Active orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">Delivery success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Areas */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Your Service Areas
          </CardTitle>
          <p className="text-sm text-gray-600">
            You can view and manage orders from customers in these locations
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {crProfile.serviceAreas.map((area, index) => (
                <Badge
                  key={index}
                  className="bg-purple-100 text-purple-800 px-3 py-1"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {area}
                </Badge>
              ))}
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-medium text-purple-800 mb-2">
                    Service Area Coverage
                  </h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    <p>
                      • Orders are filtered by customer address city, state, and
                      postal code
                    </p>
                    <p>
                      • You earn commissions from completed orders in these
                      areas
                    </p>
                    <p>
                      • You can communicate with customers and farmers in your
                      assigned regions
                    </p>
                    <p>
                      • Total orders in your areas:{" "}
                      <span className="font-semibold">{stats.totalOrders}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Recent Orders
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/cr/orders">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serializedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recent orders in your service areas</p>
              </div>
            ) : (
              serializedOrders.map((order: any) => (
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
                      {order.shippingAddress?.city || "City not available"},{" "}
                      {order.shippingAddress?.postalCode ||
                        "Postal code not available"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        order.status === "DELIVERED" ? "default" : "secondary"
                      }
                      className={getStatusBadgeColor(order.status)}
                    >
                      {getStatusIcon(order.status)}
                      <span className="ml-1">
                        {order.status.replace("_", " ")}
                      </span>
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/cr/orders/${order.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/cr/orders">
              <Button variant="outline" className="h-20 flex-col w-full">
                <ShoppingCart className="h-6 w-6 mb-2" />
                View Orders
              </Button>
            </Link>
            <Link href="/dashboard/cr/deliveries">
              <Button variant="outline" className="h-20 flex-col w-full">
                <Truck className="h-6 w-6 mb-2" />
                Track Deliveries
              </Button>
            </Link>
            <Link href="/dashboard/cr/farmers">
              <Button variant="outline" className="h-20 flex-col w-full">
                <Users className="h-6 w-6 mb-2" />
                View Farmers
              </Button>
            </Link>
            <Link href="/dashboard/cr/agents">
              <Button variant="outline" className="h-20 flex-col w-full">
                <Truck className="h-6 w-6 mb-2" />
                View Agents
              </Button>
            </Link>
            <Link href="/dashboard/cr/earnings">
              <Button variant="outline" className="h-20 flex-col w-full">
                <DollarSign className="h-6 w-6 mb-2" />
                View Earnings
              </Button>
            </Link>
            <Link href="/dashboard/cr/profile">
              <Button variant="outline" className="h-20 flex-col w-full">
                <User className="h-6 w-6 mb-2" />
                My Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
