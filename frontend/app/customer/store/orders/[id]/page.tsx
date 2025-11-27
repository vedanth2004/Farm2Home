"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerHeader from "@/components/CustomerHeader";
import {
  CheckCircle,
  Package,
  MapPin,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  listing: {
    product: {
      id: string;
      name: string;
      photos: string[];
    };
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  createdAt: string;
  items: OrderItem[];
}

export default function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, params.id]);

  const fetchOrder = async () => {
    try {
      console.log("Fetching order:", params.id);
      const response = await fetch(`/api/orders/${params.id}`);
      console.log("Order fetch response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Order data received:", result);
        // Handle the new API response format
        if (result.success && result.data) {
          setOrder(result.data);
        } else {
          console.error("Invalid response format:", result);
          router.push("/customer/store/orders");
        }
      } else {
        const errorData = await response.json();
        console.error("Order fetch failed:", errorData);
        router.push("/customer/store/orders");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      router.push("/customer/store/orders");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CustomerHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!session || !order) {
    return null; // Will redirect
  }

  const shippingAddress = order.shippingAddress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-600">
            Thank you for your order. We&apos;ll notify you when it&apos;s ready
            for delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-medium">#{order.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date</span>
                    <span className="font-medium">
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(order.createdAt))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment</span>
                    <Badge
                      variant={
                        order.paymentStatus === "PAID" ? "default" : "secondary"
                      }
                    >
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">Delivery Address</p>
                  <p>{shippingAddress.line1}</p>
                  <p>
                    {shippingAddress.city}, {shippingAddress.postalCode}
                  </p>
                  <p>{shippingAddress.state}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                        {item.listing.product.photos &&
                        item.listing.product.photos.length > 0 ? (
                          <Image
                            src={item.listing.product.photos[0]}
                            alt={item.listing.product.name}
                            width={64}
                            height={64}
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {item.listing.product.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₹{Number(item.totalPrice).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          ₹{Number(item.unitPrice).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{Number(order.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/customer/store/orders">View All Orders</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/customer/store/products">
                      Continue Shopping
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
