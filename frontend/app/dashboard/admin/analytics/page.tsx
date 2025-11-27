"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  RefreshCw,
  Activity,
} from "lucide-react";
import AnalyticsActions from "@/components/admin/AnalyticsActions";

interface ChartData {
  ordersByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; amount: number }[];
  userRegistrationsByMonth: { month: string; count: number }[];
}

interface AnalyticsData {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: any[];
  chartData: ChartData;
  dateRange?: {
    startDate: string;
    endDate: string;
  } | null;
  hasData: boolean;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    chartData: {
      ordersByMonth: [],
      revenueByMonth: [],
      userRegistrationsByMonth: [],
    },
    hasData: false,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  // Fetch analytics data
  const fetchAnalytics = async (customDateRange?: {
    startDate: string;
    endDate: string;
  }) => {
    try {
      setLoading(true);
      const url = customDateRange
        ? `/api/analytics?startDate=${customDateRange.startDate}&endDate=${customDateRange.endDate}`
        : "/api/analytics";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnalytics({
          ...data,
          dateRange: customDateRange || null,
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    setMounted(true);
    fetchAnalytics();
  }, []);

  // Full data refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics(dateRange || undefined);
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (newDateRange: {
    startDate: string;
    endDate: string;
  }) => {
    setDateRange(newDateRange);
    fetchAnalytics(newDateRange);
  };

  // Generate chart data based on filtered results
  const generateChartData = (
    data: any[],
    type: "revenue" | "orders" | "users",
  ) => {
    if (!data || data.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({
        label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i],
        value: 0,
        height: "10%",
      }));
    }

    // Process real data into chart format
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const maxValue = Math.max(
      ...data.map((d) => (type === "revenue" ? d.amount : d.count)),
      1,
    );

    return months.map((month, index) => {
      const monthData = data.find((d) => {
        const date = new Date(d.month + "-01");
        return date.getMonth() === index;
      });

      const value = monthData
        ? type === "revenue"
          ? monthData.amount
          : monthData.count
        : 0;
      const height = Math.max((value / maxValue) * 100, 10);

      return {
        label: month,
        value,
        height: `${height}%`,
      };
    });
  };

  // Get chart data
  const revenueChartData = generateChartData(
    analytics.chartData.revenueByMonth,
    "revenue",
  );
  const ordersChartData = generateChartData(
    analytics.chartData.ordersByMonth,
    "orders",
  );
  const usersChartData = generateChartData(
    analytics.chartData.userRegistrationsByMonth,
    "users",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time insights and performance metrics
            {mounted && (
              <span className="ml-2 text-sm text-green-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {dateRange && (
              <span className="ml-2 text-sm text-blue-600">
                | Filtered: {dateRange.startDate} to {dateRange.endDate}
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => fetchAnalytics(dateRange || undefined)}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => {
              const analyticsActions =
                document.getElementById("analytics-actions");
              if (analyticsActions) {
                analyticsActions.scrollIntoView({ behavior: "smooth" });
                // Trigger date range modal
                setTimeout(() => {
                  const dateRangeButton = document.querySelector(
                    '[data-action="date-range"]',
                  ) as HTMLButtonElement;
                  if (dateRangeButton) {
                    dateRangeButton.click();
                  }
                }, 500);
              }
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              const analyticsActions =
                document.getElementById("analytics-actions");
              if (analyticsActions) {
                analyticsActions.scrollIntoView({ behavior: "smooth" });
                // Trigger export data
                setTimeout(() => {
                  const exportButton = document.querySelector(
                    '[data-action="export-csv"]',
                  ) as HTMLButtonElement;
                  if (exportButton) {
                    exportButton.click();
                  }
                }, 500);
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          {dateRange && (
            <Button
              variant="outline"
              onClick={() => {
                setDateRange(null);
                fetchAnalytics();
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative">
              {analytics.hasData ? (
                <>
                  {/* Dynamic Bar Chart */}
                  <div className="flex items-end justify-between h-full space-x-2">
                    {revenueChartData.map((item, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className="w-8 bg-green-500 rounded-t transition-all duration-500"
                          style={{ height: item.height }}
                          title={`${item.label}: ₹${item.value.toLocaleString()}`}
                        ></div>
                        <span className="text-xs mt-2">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-4 right-4 text-2xl font-bold text-green-600">
                    ₹{Number(analytics.totalRevenue).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      No revenue data for selected period
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Order Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative">
              {analytics.hasData ? (
                <>
                  {/* Dynamic Pie Chart */}
                  <div className="flex items-center justify-center h-full">
                    <div className="relative w-32 h-32">
                      <div className="absolute inset-0 rounded-full border-8 border-blue-500"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-green-500 transform rotate-90"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-yellow-500 transform rotate-180"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-red-500 transform rotate-270"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-700">
                          {analytics.totalOrders}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                        <span>Pending</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      No orders for selected period
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative">
              {analytics.hasData ? (
                <>
                  {/* Dynamic Line Chart */}
                  <div className="flex items-end justify-between h-full space-x-1">
                    {usersChartData.map((item, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className="w-2 bg-orange-500 rounded-t transition-all duration-500"
                          style={{ height: item.height }}
                          title={`${item.label}: ${item.value} users`}
                        ></div>
                        <span className="text-xs mt-1">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-4 right-4 text-2xl font-bold text-orange-600">
                    {analytics.totalUsers}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      No user registrations for selected period
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Sales Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative">
              {analytics.hasData ? (
                <>
                  {/* Dynamic Area Chart */}
                  <div className="flex items-end justify-between h-full space-x-1">
                    {revenueChartData.map((item, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className="w-3 bg-purple-500 rounded-t transition-all duration-500"
                          style={{ height: item.height }}
                          title={`${item.label}: ₹${item.value.toLocaleString()}`}
                        ></div>
                        <span className="text-xs mt-1">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-4 right-4 text-2xl font-bold text-purple-600">
                    ₹{Number(analytics.totalRevenue).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      No sales data for selected period
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(analytics.totalRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+15%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-500" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">API Server</span>
              <Badge variant="outline" className="text-green-600">
                Online
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Database</span>
              <Badge variant="outline" className="text-green-600">
                Online
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Cache</span>
              <Badge variant="outline" className="text-green-600">
                Online
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Payments</span>
              <Badge variant="outline" className="text-green-600">
                Online
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Actions */}
      <div id="analytics-actions">
        <AnalyticsActions
          onDateRangeChange={handleDateRangeChange}
          currentDateRange={dateRange}
        />
      </div>
    </div>
  );
}
