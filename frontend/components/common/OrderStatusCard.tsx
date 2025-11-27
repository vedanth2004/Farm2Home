"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface OrderStatusProps {
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
    customer?: {
      name: string;
      email: string;
      phone?: string;
    };
    shippingAddress: {
      line1: string;
      city: string;
      postalCode: string;
    };
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      listing: {
        product: {
          name: string;
          description: string;
          farmer: {
            user: {
              name: string;
            };
          };
        };
      };
    }>;
  };
  userRole: "ADMIN" | "CUSTOMER" | "FARMER" | "PICKUP_AGENT" | "CR";
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  showUpdateButton?: boolean;
  showDeleteButton?: boolean;
}

export default function OrderStatusCard({
  order,
  userRole,
  onStatusUpdate,
  onDeleteOrder,
  showUpdateButton = false,
  showDeleteButton = false,
}: OrderStatusProps) {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CREATED":
        return "bg-blue-100 text-blue-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PICKUP_ASSIGNED":
        return "bg-yellow-100 text-yellow-800";
      case "PICKED_UP":
        return "bg-orange-100 text-orange-800";
      case "AT_CR":
        return "bg-purple-100 text-purple-800";
      case "OUT_FOR_DELIVERY":
        return "bg-indigo-100 text-indigo-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "SUCCESS":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "REFUND_REQUESTED":
        return "bg-orange-100 text-orange-800";
      case "REFUNDED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CREATED":
        return <Package className="h-4 w-4" />;
      case "PAID":
        return <DollarSign className="h-4 w-4" />;
      case "PICKUP_ASSIGNED":
        return <Truck className="h-4 w-4" />;
      case "PICKED_UP":
        return <Truck className="h-4 w-4" />;
      case "AT_CR":
        return <MapPin className="h-4 w-4" />;
      case "OUT_FOR_DELIVERY":
        return <Truck className="h-4 w-4" />;
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate) return;

    setUpdating(true);
    try {
      await onStatusUpdate(order.id, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!onDeleteOrder) return;

    setDeleting(true);
    try {
      await onDeleteOrder(order.id);
    } catch (error) {
      console.error("Failed to delete order:", error);
    } finally {
      setDeleting(false);
    }
  };

  const canUpdateStatus = () => {
    switch (userRole) {
      case "ADMIN":
        return true;
      case "PICKUP_AGENT":
        return ["PICKED_UP", "AT_CR"].includes(order.status);
      case "CR":
        return ["AT_CR", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
          order.status,
        );
      default:
        return false;
    }
  };

  const getNextStatusOptions = () => {
    switch (order.status) {
      case "CREATED":
        return ["PAID", "CANCELLED"];
      case "PAID":
        return ["PICKUP_ASSIGNED", "CANCELLED"];
      case "PICKUP_ASSIGNED":
        return ["PICKED_UP", "CANCELLED"];
      case "PICKED_UP":
        return ["AT_CR"];
      case "AT_CR":
        return ["OUT_FOR_DELIVERY"];
      case "OUT_FOR_DELIVERY":
        return ["DELIVERED"];
      case "DELIVERED":
        return [];
      case "CANCELLED":
        return [];
      default:
        return [];
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              Order #{order.id.slice(-8)}
            </h3>
            <p className="text-sm text-gray-600">
              <Calendar className="h-4 w-4 inline mr-1" />
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(order.createdAt))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">
              ₹{Number(order.totalAmount).toFixed(2)}
            </p>
            <div className="flex space-x-2 mt-2">
              <Badge className={getStatusColor(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1">{order.status.replace("_", " ")}</span>
              </Badge>
              <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
            <p className="text-sm text-gray-600">
              {order.shippingAddress?.line1 || "Address not available"}
              <br />
              {order.shippingAddress?.city || "City not available"},{" "}
              {order.shippingAddress?.postalCode || "Postal code not available"}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Customer Information
            </h4>
            <p className="text-sm text-gray-600">
              <User className="h-4 w-4 inline mr-1" />
              {order.customer?.name || "Unknown Customer"}
            </p>
            <p className="text-sm text-gray-600">
              <Mail className="h-4 w-4 inline mr-1" />
              {order.customer?.email || "No email provided"}
            </p>
            {order.customer?.phone && (
              <p className="text-sm text-gray-600">
                <Phone className="h-4 w-4 inline mr-1" />
                {order.customer.phone}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            Items ({order.items.length})
          </h4>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h5 className="font-medium">{item.listing.product.name}</h5>
                  <p className="text-sm text-gray-600">
                    {item.listing.product.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    by{" "}
                    {item.listing.product.farmer?.user?.name ||
                      "Unknown Farmer"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Qty: {item.quantity}</p>
                  <p className="text-sm text-gray-600">
                    ₹{Number(item.unitPrice).toFixed(2)} each
                  </p>
                  <p className="text-sm font-medium">
                    ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Update Buttons */}
        {showUpdateButton && canUpdateStatus() && (
          <div className="flex justify-end space-x-2">
            {getNextStatusOptions().map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate(status)}
                disabled={updating}
              >
                {updating ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  getStatusIcon(status)
                )}
                <span className="ml-1">Mark as {status.replace("_", " ")}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Delete Button for Customers */}
        {showDeleteButton &&
          userRole === "CUSTOMER" &&
          order.status === "CREATED" &&
          order.paymentStatus === "PENDING" && (
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteOrder}
                disabled={deleting}
              >
                {deleting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {deleting ? "Deleting..." : "Delete Order"}
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
