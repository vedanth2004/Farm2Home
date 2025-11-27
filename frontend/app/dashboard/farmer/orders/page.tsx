import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrderStatusCard from "@/components/common/OrderStatusCard";
import { prisma } from "@/lib/prisma";
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getFarmerOrders() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    // Get farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) return [];

    // Get orders that contain products from this farmer
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            listing: {
              product: {
                farmerId: farmerProfile.id,
              },
            },
          },
        },
      },
      include: {
        customer: true,
        shippingAddress: true,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return orders;
  } catch (error) {
    console.error("Error fetching farmer orders:", error);
    return [];
  }
}

export default async function FarmerOrdersPage() {
  await requirePermission("read:orders");

  const orders = await getFarmerOrders();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/farmer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600">
              View orders containing your products
            </p>
          </div>
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
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-gray-500">Orders with your products</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o: any) => o.status === "DELIVERED").length}
            </div>
            <p className="text-xs text-gray-500">Completed orders</p>
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
            <div className="text-2xl font-bold">
              {
                orders.filter(
                  (o: any) => !["DELIVERED", "CANCELLED"].includes(o.status),
                ).length
              }
            </div>
            <p className="text-xs text-gray-500">Active orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue
            </CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {orders
                .filter((o: any) => o.paymentStatus === "SUCCESS")
                .reduce(
                  (sum: number, order: any) => sum + Number(order.totalAmount),
                  0,
                )
                .toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">From paid orders only</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            All Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No orders found</p>
                <p className="text-sm">
                  Orders for your products will appear here
                </p>
              </div>
            ) : (
              orders.map((order: any) => (
                <OrderStatusCard
                  key={order.id}
                  order={order}
                  userRole="FARMER"
                  onStatusUpdate={undefined}
                  showUpdateButton={false}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
