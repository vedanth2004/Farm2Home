"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable, { Column } from "@/components/common/DataTable";
import { AlertTriangle, RefreshCw, UserX, TrendingDown } from "lucide-react";

interface ChurnPrediction {
  id: number;
  customer_id: string;
  last_purchase_date: string;
  total_orders: number;
  avg_gap_days: number;
  total_spend: number;
  spend_trend: string;
  days_since_last_order: number;
  category_preference: string;
  churn_risk: number;
  churn_prediction: number;
  risk_level: string;
  createdAt: string;
}

export default function ChurnPredictionPage() {
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Form state for new prediction
  const [formData, setFormData] = useState({
    customer_id: "",
    last_purchase_date: "",
    total_orders: "",
    avg_gap_days: "",
    total_spend: "",
    spend_trend: "",
    days_since_last_order: "",
    category_preference: "",
  });

  // Categories for dropdown
  const categories = [
    "Vegetables",
    "Fruits",
    "Grains",
    "Dairy",
    "Spices",
    "Pulses",
    "Oil",
    "Nuts",
  ];

  const spendTrends = ["increasing", "stable", "decreasing"];
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);

  // Fetch customer data when customer ID is entered
  const fetchCustomerData = async (customerId: string) => {
    if (!customerId || customerId.trim().length === 0) {
      return;
    }

    setLoadingCustomerData(true);
    try {
      const response = await fetch(
        `/api/ml/churn/customer-data?customerId=${customerId}`,
      );
      if (!response.ok) {
        if (response.status === 404) {
          alert("Customer not found. Please check the customer ID.");
          return;
        }
        throw new Error("Failed to fetch customer data");
      }

      const data = await response.json();

      // Auto-fill all fields
      setFormData({
        customer_id: data.customer_id,
        last_purchase_date:
          data.last_purchase_date || new Date().toISOString().split("T")[0],
        total_orders: data.total_orders.toString(),
        avg_gap_days: data.avg_gap_days.toString(),
        total_spend: data.total_spend.toString(),
        spend_trend: data.spend_trend || "stable",
        days_since_last_order: data.days_since_last_order.toString(),
        category_preference: data.category_preference || "Vegetables",
      });
    } catch (error: any) {
      console.error("Error fetching customer data:", error);
      alert(`Failed to load customer data: ${error.message}`);
    } finally {
      setLoadingCustomerData(false);
    }
  };

  // Handle customer ID change with debounce
  useEffect(() => {
    const customerId = formData.customer_id?.trim();
    if (!customerId || customerId.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      fetchCustomerData(customerId);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customer_id]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ml/churn");
      if (!response.ok) {
        throw new Error("Failed to fetch predictions");
      }
      const data = await response.json();
      setPredictions(data);
      setTotal(data.length);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  // Filter predictions
  const filteredPredictions = predictions.filter((pred) => {
    const matchesSearch =
      pred.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pred.category_preference
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesRisk =
      riskFilter === "all" ||
      pred.risk_level.toLowerCase() === riskFilter.toLowerCase();
    return matchesSearch && matchesRisk;
  });

  // Pagination
  const paginatedPredictions = filteredPredictions.slice(
    (page - 1) * limit,
    page * limit,
  );

  const handleGeneratePrediction = async () => {
    // Validate required fields
    const requiredFields = [
      "customer_id",
      "last_purchase_date",
      "total_orders",
      "avg_gap_days",
      "total_spend",
      "spend_trend",
      "days_since_last_order",
      "category_preference",
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        alert(`Please fill in ${field.replace(/_/g, " ")}`);
        return;
      }
    }

    setGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch("/api/ml/churn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          last_purchase_date: formData.last_purchase_date,
          total_orders: parseInt(formData.total_orders),
          avg_gap_days: parseFloat(formData.avg_gap_days),
          total_spend: parseFloat(formData.total_spend),
          spend_trend: formData.spend_trend,
          days_since_last_order: parseInt(formData.days_since_last_order),
          category_preference: formData.category_preference,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate prediction");
      }

      const result = await response.json();
      setGenerationResult(result);

      // Reset form
      setFormData({
        customer_id: "",
        last_purchase_date: new Date().toISOString().split("T")[0],
        total_orders: "",
        avg_gap_days: "",
        total_spend: "",
        spend_trend: "",
        days_since_last_order: "",
        category_preference: "",
      });

      // Refresh predictions
      fetchPredictions();
    } catch (error: any) {
      console.error("Error generating prediction:", error);
      setGenerationResult({
        error: error.message || "Failed to generate prediction",
      });
    } finally {
      setGenerating(false);
    }
  };

  const columns: Column<ChurnPrediction>[] = [
    {
      key: "customer_id",
      label: "Customer ID",
      sortable: true,
    },
    {
      key: "total_orders",
      label: "Total Orders",
      sortable: true,
    },
    {
      key: "total_spend",
      label: "Total Spend",
      sortable: true,
      render: (value) => `₹${value.toFixed(2)}`,
    },
    {
      key: "days_since_last_order",
      label: "Days Since Last Order",
      sortable: true,
    },
    {
      key: "category_preference",
      label: "Category Preference",
      sortable: true,
      render: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "churn_risk",
      label: "Churn Risk",
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold ${
              value >= 0.7
                ? "text-red-600"
                : value >= 0.3
                  ? "text-yellow-600"
                  : "text-green-600"
            }`}
          >
            {(value * 100).toFixed(1)}%
          </span>
        </div>
      ),
    },
    {
      key: "risk_level",
      label: "Risk Level",
      sortable: true,
      render: (value) => {
        const variant =
          value === "High"
            ? "destructive"
            : value === "Medium"
              ? "secondary"
              : "default";
        const color =
          value === "High"
            ? "bg-red-100 text-red-800"
            : value === "Medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-green-100 text-green-800";
        return (
          <Badge variant={variant} className={color}>
            {value}
          </Badge>
        );
      },
    },
    {
      key: "churn_prediction",
      label: "Prediction",
      sortable: true,
      render: (value) => (
        <Badge variant={value === 1 ? "destructive" : "default"}>
          {value === 1 ? "🚨 Churned" : "✅ Active"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Customer Churn Prediction
          </h1>
          <p className="text-gray-600 mt-1">
            ML-powered prediction to identify customers at risk of churning
          </p>
        </div>
        <Button onClick={fetchPredictions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Generate New Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Predict Customer Churn Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Customer ID *
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g., cmhhn28ko0156xompjyr9vqqn"
                    value={formData.customer_id}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_id: e.target.value })
                    }
                    disabled={loadingCustomerData}
                  />
                  {loadingCustomerData && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {loadingCustomerData
                    ? "Loading customer data..."
                    : "Enter customer ID to auto-fill all fields"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Last Purchase Date *
                </label>
                <Input
                  type="date"
                  value={formData.last_purchase_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      last_purchase_date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Total Orders *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 25"
                  value={formData.total_orders}
                  onChange={(e) =>
                    setFormData({ ...formData, total_orders: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Avg Gap Days *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 7.5"
                  value={formData.avg_gap_days}
                  onChange={(e) =>
                    setFormData({ ...formData, avg_gap_days: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Total Spend (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 45000"
                  value={formData.total_spend}
                  onChange={(e) =>
                    setFormData({ ...formData, total_spend: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Spend Trend *
                </label>
                <Select
                  value={formData.spend_trend}
                  onValueChange={(value) =>
                    setFormData({ ...formData, spend_trend: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trend" />
                  </SelectTrigger>
                  <SelectContent>
                    {spendTrends.map((trend) => (
                      <SelectItem key={trend} value={trend}>
                        {trend.charAt(0).toUpperCase() + trend.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Days Since Last Order *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.days_since_last_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      days_since_last_order: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Category Preference *{" "}
                  <span className="text-xs text-gray-500">
                    (Auto-calculated)
                  </span>
                </label>
                <Input
                  value={formData.category_preference || ""}
                  placeholder="Auto-filled from purchase history"
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  title="Category is automatically calculated from customer's purchase history"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Automatically determined from most purchased category
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleGeneratePrediction}
            disabled={generating}
            className="mt-4"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 mr-2" />
                Generate Prediction
              </>
            )}
          </Button>

          {generationResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {generationResult.error ? (
                <div className="text-red-600">{generationResult.error}</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Customer ID:</span>
                    <span>{generationResult.customerId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Churn Risk:</span>
                    <span
                      className={`font-bold ${
                        generationResult.churnRisk >= 0.7
                          ? "text-red-600"
                          : generationResult.churnRisk >= 0.3
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {(generationResult.churnRisk * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Risk Level:</span>
                    <Badge
                      variant={
                        generationResult.riskLevel === "High"
                          ? "destructive"
                          : generationResult.riskLevel === "Medium"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {generationResult.riskLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Prediction:</span>
                    <Badge
                      variant={
                        generationResult.churnPrediction === 1
                          ? "destructive"
                          : "default"
                      }
                    >
                      {generationResult.churnPrediction === 1
                        ? "🚨 Churned"
                        : "✅ Active"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Predictions History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Input
                placeholder="Search by customer ID or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : paginatedPredictions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No predictions found</p>
              </div>
            ) : (
              <DataTable
                data={paginatedPredictions}
                columns={columns}
                pagination={{
                  page,
                  limit,
                  total: filteredPredictions.length,
                  totalPages: Math.ceil(filteredPredictions.length / limit),
                }}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
