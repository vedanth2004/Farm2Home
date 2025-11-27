"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import OrderStatusCard from "@/components/common/OrderStatusCard";
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
} from "lucide-react";
import {
  updateOrderStatus,
  searchOrders,
  exportOrders,
} from "@/lib/actions/order-actions";

// Define OrderStatus type manually
type OrderStatus =
  | "CREATED"
  | "PAID"
  | "PICKUP_ASSIGNED"
  | "PICKED_UP"
  | "AT_CR"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

interface Order {
  id: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: string;
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
}

interface OrderManagementProps {
  initialOrders: Order[];
}

export default function OrderManagement({
  initialOrders,
}: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const result = await searchOrders(searchQuery, statusFilter);
      if (result.success) {
        setOrders(result.orders as unknown as Order[]);
      } else {
        setError(result.error || "Search failed");
      }
    } catch (error) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    setLoading(true);
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        setOrders(
          orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
          ),
        );
        setError("");
      } else {
        setError(result.error || "Failed to update order status");
      }
    } catch (error) {
      setError("Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  // Wrapper to match OrderStatusCard's expected signature
  const handleStatusUpdateWrapper = (orderId: string, newStatus: string) => {
    handleUpdateStatus(orderId, newStatus as OrderStatus);
  };

  const handleExport = async (format: "csv" | "json" = "csv") => {
    setLoading(true);
    try {
      const result = await exportOrders(format);
      if (result.success) {
        // Create download link
        const blob = new Blob([result.data], {
          type: format === "csv" ? "text/csv" : "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `orders.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        setError(result.error || "Export failed");
      }
    } catch (error) {
      setError("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders by ID or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="PAID">Paid</option>
            <option value="PICKUP_ASSIGNED">Pickup Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="AT_CR">At CR</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => handleExport("csv")}
            disabled={loading}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport("json")}
            disabled={loading}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          {error}
        </div>
      )}

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
              </div>
            ) : (
              orders.map((order: any) => (
                <OrderStatusCard
                  key={order.id}
                  order={order}
                  userRole="ADMIN"
                  onStatusUpdate={handleStatusUpdateWrapper}
                  showUpdateButton={true}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
