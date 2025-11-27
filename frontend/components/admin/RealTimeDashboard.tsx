"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  DollarSign,
} from "lucide-react";
import { getAdminDashboardMetricsWrapper } from "@/lib/actions/dashboard-actions";
import RefreshButton from "./RefreshButton";

interface DashboardMetrics {
  totalRevenue: number;
  totalProfit?: number;
  pendingOrders?: number;
  completedOrders?: number;
  totalOrders?: number;
  activeFarmers?: number;
  pendingEarnings?: number;
  lastUpdated: string;
}

interface RealTimeDashboardProps {
  initialMetrics: DashboardMetrics;
}

export default function RealTimeDashboard({
  initialMetrics,
}: RealTimeDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const refreshMetrics = async () => {
    setLoading(true);
    try {
      const result = await getAdminDashboardMetricsWrapper();
      if (result.success && result.data) {
        setMetrics(result.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh metrics:", error);
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
  }, [mounted]);

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

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your farm-to-home marketplace
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₹{metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Real-time from payments
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <div className="bg-blue-100 p-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {(metrics.totalOrders || 0).toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              All orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Farmers
            </CardTitle>
            <div className="bg-green-100 p-2 rounded-lg">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {(metrics.activeFarmers || 0).toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Registered farmers
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Admin Profit
            </CardTitle>
            <div className="bg-purple-100 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${(metrics.totalProfit || 0) < 0 ? "text-red-600" : "text-purple-600"}`}
            >
              ₹{(metrics.totalProfit || 0).toLocaleString()}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${(metrics.totalProfit || 0) < 0 ? "text-red-600" : "text-purple-600"}`}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {(metrics.totalProfit || 0) < 0
                ? "Check calculations"
                : "Total margin"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Overview Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Profit Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-700 mb-1">
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-green-900">
                ₹{(metrics.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="text-xs text-green-600 mt-1">
                From paid orders only
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${(metrics.totalProfit || 0) < 0 ? "bg-gradient-to-br from-red-50 to-red-100" : "bg-gradient-to-br from-purple-50 to-purple-100"}`}
            >
              <div
                className={`text-sm font-medium mb-1 ${(metrics.totalProfit || 0) < 0 ? "text-red-700" : "text-purple-700"}`}
              >
                Admin Profit
              </div>
              <div
                className={`text-2xl font-bold ${(metrics.totalProfit || 0) < 0 ? "text-red-900" : "text-purple-900"}`}
              >
                ₹{(metrics.totalProfit || 0).toLocaleString()}
              </div>
              <div
                className={`text-xs mt-1 ${(metrics.totalProfit || 0) < 0 ? "text-red-600" : "text-purple-600"}`}
              >
                {(metrics.totalProfit || 0) < 0
                  ? "⚠️ Check calculations"
                  : "After farmer payouts"}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-1">
                Pending Orders
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {metrics.pendingOrders || 0}
              </div>
              <div className="text-xs text-blue-600 mt-1">Awaiting payment</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-orange-700 mb-1">
                Pending Payouts
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ₹{(metrics.pendingEarnings || 0).toLocaleString()}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                To be paid to farmers
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Payment Processing
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Inventory Management
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Earnings Tracking</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-green-600 border-green-200"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Operational
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
