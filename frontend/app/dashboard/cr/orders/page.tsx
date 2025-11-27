import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { serializeOrders } from "@/lib/serialization";
import { createCRServiceAreaFilter } from "@/lib/cr-utils";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  MapPin,
  User,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getCROrders() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    // Get CR profile
    const crProfile = await prisma.cRProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!crProfile) return [];

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
    });

    return orders;
  } catch (error) {
    console.error("Error fetching CR orders:", error);
    return [];
  }
}

export default async function CROrdersPage() {
  await requirePermission("read:orders");

  const orders = await getCROrders();
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
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Orders</h1>
          <p className="text-gray-600 mt-1">
            Track and manage orders from customers in your assigned service
            areas
          </p>
          <p className="text-sm text-purple-600 mt-1">
            <MapPin className="h-4 w-4 inline mr-1" />
            Orders are filtered by customer address city, state, and postal code
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            Search
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
              Cancelled
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                serializedOrders.filter((o: any) => o.status === "CANCELLED")
                  .length
              }
            </div>
            <p className="text-xs text-gray-500">Cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            All Orders ({serializedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serializedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No orders found in your service areas</p>
              </div>
            ) : (
              serializedOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Placed on{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(order.createdAt))}
                      </p>
                    </div>
                    <Badge className={getStatusBadgeColor(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">
                        {order.status.replace("_", " ")}
                      </span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Customer Information
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium">{order.customer.name}</p>
                        <p className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {order.customer.email}
                        </p>
                        {order.customer.phone && (
                          <p className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {order.customer.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Delivery Address
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>
                          {order.shippingAddress?.line1 ||
                            "Address not available"}
                        </p>
                        <p>
                          {order.shippingAddress?.city || "City not available"},{" "}
                          {order.shippingAddress?.postalCode ||
                            "Postal code not available"}
                        </p>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Order Summary
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </p>
                        <p className="font-medium">
                          Total: ₹{order.totalAmount.toFixed(2)}
                        </p>
                        <p>Payment: {order.paymentStatus}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.listing.product.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              by{" "}
                              {item.listing.product.farmer?.user?.name ||
                                "Unknown Farmer"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity} • ₹
                              {item.unitPrice.toFixed(2)} each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ₹{(item.unitPrice * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/cr/orders/${order.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Contact Customer
                    </Button>
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
