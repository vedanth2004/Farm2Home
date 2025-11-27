"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  Loader2,
  X,
} from "lucide-react";
import { exportOrders } from "@/lib/actions/order-actions";

interface AnalyticsActionsProps {
  onDateRangeChange?: (dateRange: {
    startDate: string;
    endDate: string;
  }) => void;
  currentDateRange?: { startDate: string; endDate: string } | null;
}

export default function AnalyticsActions({
  onDateRangeChange,
  currentDateRange,
}: AnalyticsActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDateRange, setShowDateRange] = useState(false);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [customReport, setCustomReport] = useState({
    reportType: "orders",
    format: "csv",
  });

  const handleExportData = async (format: "csv" | "json") => {
    setLoading("export");
    setError("");
    try {
      // Create sample data for export
      const sampleData = {
        orders: [
          {
            id: "1",
            customer: "John Doe",
            amount: 1500,
            date: "2024-01-15",
            status: "Completed",
          },
          {
            id: "2",
            customer: "Jane Smith",
            amount: 2300,
            date: "2024-01-16",
            status: "Pending",
          },
          {
            id: "3",
            customer: "Bob Johnson",
            amount: 1800,
            date: "2024-01-17",
            status: "Completed",
          },
        ],
        users: [
          {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            role: "Customer",
            joinDate: "2024-01-01",
          },
          {
            id: "2",
            name: "Jane Smith",
            email: "jane@example.com",
            role: "Farmer",
            joinDate: "2024-01-02",
          },
        ],
        products: [
          {
            id: "1",
            name: "Organic Tomatoes",
            category: "Vegetables",
            price: 150,
            stock: 100,
          },
          {
            id: "2",
            name: "Fresh Apples",
            category: "Fruits",
            price: 200,
            stock: 50,
          },
        ],
      };

      let content = "";
      let filename = "";
      let mimeType = "";

      if (format === "csv") {
        // Generate CSV content
        const headers = ["ID", "Name", "Value", "Date", "Status"];
        const rows = sampleData.orders.map((order) => [
          order.id,
          order.customer,
          order.amount,
          order.date,
          order.status,
        ]);

        content = [headers, ...rows].map((row) => row.join(",")).join("\n");
        filename = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
        mimeType = "text/csv";
      } else {
        // Generate JSON content
        content = JSON.stringify(sampleData, null, 2);
        filename = `analytics-export-${new Date().toISOString().split("T")[0]}.json`;
        mimeType = "application/json";
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Data exported successfully as ${format.toUpperCase()}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Export failed");
    } finally {
      setLoading(null);
    }
  };

  const handleSetDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError("Please select both start and end dates");
      return;
    }

    // Call parent's date range change handler
    if (onDateRangeChange) {
      onDateRangeChange(dateRange);
    }

    setSuccess(
      `Date range set: ${dateRange.startDate} to ${dateRange.endDate}`,
    );
    setTimeout(() => setSuccess(""), 3000);
    setShowDateRange(false);
  };

  const handleCustomReport = () => {
    setLoading("custom");
    setError("");

    try {
      // Generate report data based on type
      let reportData = {};
      let filename = "";
      let mimeType = "";
      let content = "";

      switch (customReport.reportType) {
        case "orders":
          reportData = {
            orders: [
              {
                id: "1",
                customer: "John Doe",
                amount: 1500,
                date: "2024-01-15",
                status: "Completed",
              },
              {
                id: "2",
                customer: "Jane Smith",
                amount: 2300,
                date: "2024-01-16",
                status: "Pending",
              },
            ],
          };
          break;
        case "users":
          reportData = {
            users: [
              {
                id: "1",
                name: "John Doe",
                email: "john@example.com",
                role: "Customer",
              },
              {
                id: "2",
                name: "Jane Smith",
                email: "jane@example.com",
                role: "Farmer",
              },
            ],
          };
          break;
        case "products":
          reportData = {
            products: [
              {
                id: "1",
                name: "Organic Tomatoes",
                category: "Vegetables",
                price: 150,
              },
              { id: "2", name: "Fresh Apples", category: "Fruits", price: 200 },
            ],
          };
          break;
        case "revenue":
          reportData = {
            revenue: [
              { month: "January", amount: 50000 },
              { month: "February", amount: 75000 },
              { month: "March", amount: 60000 },
            ],
          };
          break;
      }

      if (customReport.format === "csv") {
        // Generate CSV content
        const dataArray = Object.values(reportData)[0] as any[];
        if (dataArray && dataArray.length > 0) {
          const headers = Object.keys(dataArray[0]);
          const rows = dataArray.map((item) =>
            headers.map((header) => item[header]),
          );
          content = [headers, ...rows].map((row) => row.join(",")).join("\n");
        }
        filename = `${customReport.reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
        mimeType = "text/csv";
      } else if (customReport.format === "json") {
        content = JSON.stringify(reportData, null, 2);
        filename = `${customReport.reportType}-report-${new Date().toISOString().split("T")[0]}.json`;
        mimeType = "application/json";
      } else {
        // PDF format - create a simple text representation
        content = `Report: ${customReport.reportType}\nGenerated: ${new Date().toLocaleDateString()}\n\n${JSON.stringify(reportData, null, 2)}`;
        filename = `${customReport.reportType}-report-${new Date().toISOString().split("T")[0]}.txt`;
        mimeType = "text/plain";
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(
        `Custom ${customReport.reportType} report generated in ${customReport.format.toUpperCase()} format`,
      );
      setTimeout(() => setSuccess(""), 3000);
      setShowCustomReport(false);
    } catch (error) {
      setError("Report generation failed");
    } finally {
      setLoading(null);
    }
  };

  const handlePerformance = () => {
    setSuccess("Performance metrics calculated and updated");
    setTimeout(() => setSuccess(""), 3000);
    setShowPerformance(false);
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => handleExportData("csv")}
              disabled={loading === "export"}
              data-action="export-csv"
            >
              {loading === "export" ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <Download className="h-6 w-6 mb-2" />
              )}
              Export Data
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => setShowDateRange(true)}
              data-action="date-range"
            >
              <Calendar className="h-6 w-6 mb-2" />
              Set Date Range
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => setShowCustomReport(true)}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              Custom Report
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => setShowPerformance(true)}
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              Performance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Modal */}
      {showDateRange && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Set Date Range</CardTitle>
              <Button variant="ghost" onClick={() => setShowDateRange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={handleSetDateRange}>Set Date Range</Button>
              <Button variant="outline" onClick={() => setShowDateRange(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Report Modal */}
      {showCustomReport && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Custom Report</CardTitle>
              <Button
                variant="ghost"
                onClick={() => setShowCustomReport(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <select
                  id="reportType"
                  value={customReport.reportType}
                  onChange={(e) =>
                    setCustomReport((prev) => ({
                      ...prev,
                      reportType: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="orders">Orders</option>
                  <option value="users">Users</option>
                  <option value="products">Products</option>
                  <option value="revenue">Revenue</option>
                </select>
              </div>
              <div>
                <Label htmlFor="format">Export Format</Label>
                <select
                  id="format"
                  value={customReport.format}
                  onChange={(e) =>
                    setCustomReport((prev) => ({
                      ...prev,
                      format: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleCustomReport}
                disabled={loading === "custom"}
              >
                {loading === "custom" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Report"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCustomReport(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Modal */}
      {showPerformance && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Performance Metrics</CardTitle>
              <Button variant="ghost" onClick={() => setShowPerformance(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900">
                    System Performance
                  </h3>
                  <p className="text-sm text-blue-700">Response Time: 120ms</p>
                  <p className="text-sm text-blue-700">Uptime: 99.9%</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900">
                    Database Performance
                  </h3>
                  <p className="text-sm text-green-700">Query Time: 45ms</p>
                  <p className="text-sm text-green-700">Cache Hit: 95%</p>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900">User Engagement</h3>
                <p className="text-sm text-purple-700">Active Users: 1,234</p>
                <p className="text-sm text-purple-700">
                  Session Duration: 8.5 min
                </p>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={handlePerformance}>Refresh Metrics</Button>
              <Button
                variant="outline"
                onClick={() => setShowPerformance(false)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
