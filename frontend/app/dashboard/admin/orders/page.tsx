import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { serializeOrders } from "@/lib/serialization";
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import OrderManagement from "@/components/admin/OrderManagement";

async function getOrders() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        customer: {
          role: "CUSTOMER", // Only show orders from actual customers
        },
      },
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
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return orders;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

export default async function AdminOrdersPage() {
  await requirePermission("read:orders");

  const orders = await getOrders();
  const serializedOrders = serializeOrders(orders);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "PAID":
        return "bg-blue-100 text-blue-800";
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
        return <Package className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all orders</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <Package className="h-4 w-4 mr-2" />
            Export Orders
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
            <div className="text-2xl font-bold">{serializedOrders.length}</div>
            <p className="text-xs text-gray-500">All orders</p>
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
              {
                serializedOrders.filter((o: any) => o.status === "DELIVERED")
                  .length
              }
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
                serializedOrders.filter(
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
              Total Revenue
            </CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {serializedOrders
                .filter((o: any) => o.paymentStatus === "SUCCESS")
                .reduce((sum: number, order: any) => sum + order.totalAmount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">From paid orders only</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Management Component */}
      <OrderManagement initialOrders={serializedOrders} />
    </div>
  );
}
