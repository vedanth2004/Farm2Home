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
import { Brain, RefreshCw, ExternalLink, Bell, Sparkles } from "lucide-react";
import Link from "next/link";

interface CustomerPrediction {
  id: number;
  totalOrders: number;
  purchaseFrequency: number;
  avgOrderValue: number;
  lastPurchaseDaysAgo: number;
  totalItemsBought: number;
  predictedCategory: string;
  predictionProbability: number;
  predictedCategoryEncoded: number;
  createdAt: string;
}

// Predictions come directly from FastAPI service
type PredictionsResponse = CustomerPrediction[];

export default function MLPredictionsPage() {
  const [predictions, setPredictions] = useState<CustomerPrediction[]>([]);
  const [allPredictions, setAllPredictions] = useState<CustomerPrediction[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      // Fetch directly from FastAPI ML service
      const mlServiceUrl =
        process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8000";
      const res = await fetch(`${mlServiceUrl}/admin/predictions`);

      if (!res.ok) {
        throw new Error(`Failed to fetch predictions: ${res.statusText}`);
      }

      const data: PredictionsResponse = await res.json();

      // Store all predictions for category extraction
      setAllPredictions(data);

      // Filter and paginate client-side
      let filtered = data;

      // Apply category filter
      if (categoryFilter) {
        filtered = filtered.filter(
          (p) => p.predictedCategory === categoryFilter,
        );
      }

      // Apply search filter (search in all fields)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.predictedCategory?.toLowerCase().includes(query) ||
            p.id.toString().includes(query),
        );
      }

      setTotal(filtered.length);

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      setPredictions(filtered.slice(start, end));
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setPredictions([]);
      setAllPredictions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, categoryFilter, searchQuery]);

  const generatePredictionsAndNotify = async (
    scope: "all" | "active" = "active",
  ) => {
    setGenerating(true);
    setGenerationResult(null);
    try {
      const response = await fetch(
        `/api/admin/ml/generate-predictions?scope=${scope}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(
          `Server returned HTML instead of JSON. Status: ${response.status}. Check server logs for details.`,
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `HTTP ${response.status}`,
        );
      }

      if (data.success) {
        setGenerationResult(data);
        // Refresh predictions after generation
        setTimeout(() => fetchPredictions(), 2000);
      } else {
        setGenerationResult({
          error: data.message || "Failed to generate predictions",
        });
      }
    } catch (error: any) {
      console.error("Error generating predictions:", error);
      setGenerationResult({
        error:
          error.message ||
          "Failed to generate predictions. Check server console for details.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const columns: Column<CustomerPrediction>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (value) => <span className="font-mono text-sm">#{value}</span>,
    },
    {
      key: "totalOrders",
      label: "Total Orders",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "purchaseFrequency",
      label: "Frequency",
      sortable: true,
      render: (value) => <span>{value.toFixed(2)}/month</span>,
    },
    {
      key: "avgOrderValue",
      label: "Avg Order Value",
      sortable: true,
      render: (value) => <span>₹{value.toFixed(2)}</span>,
    },
    {
      key: "predictedCategory",
      label: "Predicted Category",
      sortable: true,
      render: (value) =>
        value ? (
          <Badge variant="outline" className="bg-blue-50">
            {value}
          </Badge>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
    },
    {
      key: "predictionProbability",
      label: "Probability",
      sortable: true,
      render: (value) => {
        const prob = value ? (value * 100).toFixed(1) : "0.0";
        const color =
          value && value >= 0.7
            ? "text-green-600"
            : value && value >= 0.5
              ? "text-yellow-600"
              : "text-gray-600";
        return <span className={`font-semibold ${color}`}>{prob}%</span>;
      },
    },
    {
      key: "createdAt",
      label: "Created At",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleString() : "N/A"),
    },
  ];

  // Get unique categories for filter
  const categories = Array.from(
    new Set(
      allPredictions
        .map((p) => p.predictedCategory)
        .filter((c): c is string => c !== null && c !== undefined),
    ),
  ).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            ML Predictions
          </h1>
          <p className="text-gray-600 mt-1">
            Customer purchase predictions powered by machine learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generatePredictionsAndNotify("active")}
            disabled={generating}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Sparkles
              className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`}
            />
            {generating ? "Generating..." : "Generate Predictions & Notify"}
          </Button>
          <Button onClick={fetchPredictions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Generation Result */}
      {generationResult && (
        <Card
          className={
            generationResult.error
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }
        >
          <CardContent className="pt-6">
            {generationResult.error ? (
              <div className="text-red-800">
                <strong>Error:</strong> {generationResult.error}
              </div>
            ) : generationResult.summary ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-800">
                  <Bell className="h-5 w-5" />
                  <strong>Predictions Generated Successfully!</strong>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Customers:</span>
                    <div className="font-bold">
                      {generationResult.summary.total}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Successful:</span>
                    <div className="font-bold text-green-600">
                      {generationResult.summary.successful}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Notifications Sent:</span>
                    <div className="font-bold text-blue-600">
                      {generationResult.summary.notificationsSent}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Failed:</span>
                    <div className="font-bold text-red-600">
                      {generationResult.summary.failed}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Predictions
            </CardTitle>
            <Brain className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-gray-500">Active predictions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Confidence
            </CardTitle>
            <Brain className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                predictions.filter(
                  (p) =>
                    p.predictionProbability && p.predictionProbability >= 0.7,
                ).length
              }
            </div>
            <p className="text-xs text-gray-500">≥70% probability</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Brain className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-gray-500">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search by ID or Category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={categoryFilter || "all"}
              onValueChange={(value) => {
                setCategoryFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  fetchPredictions();
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Predictions Table */}
      <DataTable
        data={predictions}
        columns={columns}
        loading={loading}
        searchable={false}
        pagination={{
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        emptyMessage="No predictions found"
      />
    </div>
  );
}
