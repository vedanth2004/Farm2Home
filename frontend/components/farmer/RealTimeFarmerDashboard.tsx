"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";
import { getFarmerDashboardMetricsWrapper } from "@/lib/actions/dashboard-actions";
import RefreshButton from "./RefreshButton";

interface FarmerMetrics {
  pendingEarnings?: number;
  pendingPayouts?: number;
  totalEarnings: number;
  activeProducts: number;
  pendingOrders: number;
  thisMonthRevenue: number;
  lastUpdated: string;
}

interface RealTimeFarmerDashboardProps {
  initialMetrics: FarmerMetrics;
  farmerId: string;
}

export default function RealTimeFarmerDashboard({
  initialMetrics,
  farmerId,
}: RealTimeFarmerDashboardProps) {
  const [metrics, setMetrics] = useState<FarmerMetrics>(initialMetrics);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const refreshMetrics = async () => {
    setLoading(true);
    try {
      const result = await getFarmerDashboardMetricsWrapper(farmerId);
      if (result.success && result.data) {
        setMetrics(result.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh farmer metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Set mounted flag after hydration
  useEffect(() => {
    setMounted(true);
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, farmerId]);

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your products and track your business
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {mounted && lastRefresh
              ? `Last updated: ${new Intl.DateTimeFormat("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                }).format(lastRefresh)}`
              : "Last updated: --:--:--"}
          </p>
        </div>
        <RefreshButton loading={loading} onRefresh={refreshMetrics} />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Products
            </CardTitle>
            <div className="bg-green-100 p-2 rounded-lg">
              <Package className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.activeProducts}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Live products
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Orders
            </CardTitle>
            <div className="bg-blue-100 p-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.pendingOrders}
            </div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Sales This Month
            </CardTitle>
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₹{metrics.thisMonthRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sales from your products
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Payouts
            </CardTitle>
            <div className="bg-orange-100 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₹{(metrics.pendingEarnings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-orange-600 flex items-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              Available for withdrawal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Summary */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Earnings Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{metrics.totalEarnings.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Payouts
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{(metrics.pendingEarnings || 0).toLocaleString()}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Earnings Tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Product Listings</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Order Processing</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-green-600 border-green-200"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Account Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
