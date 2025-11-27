import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  User,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getOrder(orderId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get or create farmer profile
    let farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) {
      // Create farmer profile if it doesn't exist
      farmerProfile = await prisma.farmerProfile.create({
        data: {
          userId: session.user.id,
          verified: true,
          upiId: null,
        },
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
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
        items: {
          include: {
            listing: {
              include: {
                product: true,
              },
            },
          },
        },
        customer: true,
        payments: true,
        shippingAddress: true,
      },
    });

    return order;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("read:orders");

  const order = await getOrder(params.id);

  if (!order) {
    notFound();
  }

  const farmerItems = order.items.filter(
    (item: any) =>
      item.listing.product.farmerId ===
      order.items[0]?.listing?.product?.farmerId,
  );
  const totalAmount = farmerItems.reduce(
    (sum: number, item: any) =>
      sum + Number(item.unitPrice) * Number(item.quantity),
    0,
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "CREATED":
        return "bg-blue-100 text-blue-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PICKUP_ASSIGNED":
        return "bg-yellow-100 text-yellow-800";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800";
      case "OUT_FOR_DELIVERY":
        return "bg-orange-100 text-orange-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "AT_CR":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/farmer/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600">Order #{order.id.slice(-8)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusBadgeColor(order.status)}>
            {order.status.replace("_", " ")}
          </Badge>
          <Badge className={getPaymentStatusBadgeColor(order.paymentStatus)}>
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {farmerItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.listing.product.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.listing.product.baseUnit} × ₹
                          {Number(item.unitPrice).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Category: {item.listing.product.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ₹{Number(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{order.customer.name}</p>
                <p className="text-sm text-gray-600">{order.customer.email}</p>
                {order.customer.phone && (
                  <p className="text-sm text-gray-600">
                    {order.customer.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && (
                  <p className="text-sm text-gray-600">
                    {order.shippingAddress.line2}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.postalCode}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge
                    className={getPaymentStatusBadgeColor(order.paymentStatus)}
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
                {order.payments.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-medium">
                      ₹{Number(order.payments[0].amount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Order Total:</span>
                  <span className="font-medium">
                    ₹{Number(totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Order Created</p>
                    <p className="text-xs text-gray-500">
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(order.createdAt))}
                    </p>
                  </div>
                </div>
                {order.paymentStatus === "SUCCESS" && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Payment Received</p>
                      <p className="text-xs text-gray-500">
                        {order.payments[0]?.createdAt &&
                          new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(order.payments[0].createdAt))}
                      </p>
                    </div>
                  </div>
                )}
                {order.status === "DELIVERED" && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Order Delivered</p>
                      <p className="text-xs text-gray-500">
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(order.updatedAt))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
