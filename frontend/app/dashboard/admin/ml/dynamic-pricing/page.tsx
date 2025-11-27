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
import {
  TrendingDown,
  RefreshCw,
  Sparkles,
  DollarSign,
  Percent,
} from "lucide-react";

interface DynamicPricingPrediction {
  id: number;
  product_id: string;
  product_name: string;
  base_price: number;
  category: string;
  past_sales_volume: number;
  optimal_discount: number;
  expected_revenue: number;
  final_selling_price: number;
  createdAt: string;
}

interface ProductOption {
  id: string;
  name: string;
  category: string;
  base_price: number;
  past_sales_volume: number;
  listing_id?: string | null;
}

export default function DynamicPricingPage() {
  const [predictions, setPredictions] = useState<DynamicPricingPrediction[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Form state for new prediction
  const [formData, setFormData] = useState({
    product_id: "",
    product_name: "",
    base_price: "",
    category: "",
    past_sales_volume: "",
  });

  // Product and category options
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState<ProductOption[]>([]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ml/dynamic-pricing");
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

  // Fetch categories and products
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const response = await fetch("/api/products/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch options");
      }
      const data = await response.json();
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setFilteredProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching options:", error);
      // Fallback to common categories if API fails
      setCategories([
        "Vegetables",
        "Fruits",
        "Grains",
        "Dairy",
        "Spices",
        "Pulses",
        "Oil",
        "Nuts",
      ]);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    if (!productId || productId === "none") {
      // Clear form if "None" is selected
      setFormData({
        product_id: "",
        product_name: "",
        base_price: "",
        category: "",
        past_sales_volume: "",
      });
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData({
        product_id: product.id,
        product_name: product.name,
        base_price: product.base_price.toString(),
        category: product.category,
        past_sales_volume: product.past_sales_volume.toString(),
      });
    }
  };

  useEffect(() => {
    fetchPredictions();
    fetchOptions();
  }, []);

  // Filter products when category changes
  useEffect(() => {
    if (formData.category) {
      const filtered = products.filter((p) => p.category === formData.category);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [formData.category, products]);

  // Filter predictions
  const filteredPredictions = predictions.filter((pred) => {
    const matchesSearch =
      pred.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pred.product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pred.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || pred.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const paginatedPredictions = filteredPredictions.slice(
    (page - 1) * limit,
    page * limit,
  );

  // Get unique categories from predictions (for filter dropdown)
  const predictionCategories = Array.from(
    new Set(predictions.map((p) => p.category)),
  ).sort();

  const handleGeneratePrediction = async () => {
    if (
      !formData.product_id ||
      !formData.product_name ||
      !formData.base_price ||
      !formData.category ||
      !formData.past_sales_volume
    ) {
      alert("Please fill in all fields");
      return;
    }

    setGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch("/api/ml/dynamic-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: formData.product_id,
          product_name: formData.product_name,
          base_price: parseFloat(formData.base_price),
          category: formData.category,
          past_sales_volume: parseFloat(formData.past_sales_volume),
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
        product_id: "",
        product_name: "",
        base_price: "",
        category: "",
        past_sales_volume: "",
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

  const columns: Column<DynamicPricingPrediction>[] = [
    {
      key: "product_name",
      label: "Product",
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.product_id}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "base_price",
      label: "Base Price",
      sortable: true,
      render: (value) => `₹${value.toFixed(2)}`,
    },
    {
      key: "optimal_discount",
      label: "Optimal Discount",
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-green-600">
            {value.toFixed(1)}%
          </span>
        </div>
      ),
    },
    {
      key: "final_selling_price",
      label: "Final Price",
      sortable: true,
      render: (value) => `₹${value.toFixed(2)}`,
    },
    {
      key: "expected_revenue",
      label: "Expected Revenue",
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-600">
            ₹{value.toFixed(2)}
          </span>
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Dynamic Pricing</h1>
          <p className="text-gray-600 mt-1">
            ML-powered optimal discount recommendations for maximum revenue
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
            <Sparkles className="h-5 w-5" />
            Generate Optimal Discount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Product Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Product (Optional - will auto-fill form)
              </label>
              <Select
                value={formData.product_id || "none"}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product to auto-fill..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">None - Enter manually</SelectItem>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.category}) - ₹
                      {product.base_price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Product ID
                </label>
                <Input
                  placeholder="Product ID"
                  value={formData.product_id}
                  onChange={(e) =>
                    setFormData({ ...formData, product_id: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Product Name
                </label>
                <Input
                  placeholder="Product Name"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {loadingOptions ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : categories.length > 0 ? (
                      categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-categories" disabled>
                        No categories found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Base Price (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Base Price"
                  value={formData.base_price}
                  onChange={(e) =>
                    setFormData({ ...formData, base_price: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Past Sales Volume (Auto-filled from DB)
                </label>
                <Input
                  type="number"
                  placeholder="Auto-filled when product selected"
                  value={formData.past_sales_volume}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      past_sales_volume: e.target.value,
                    })
                  }
                  disabled={
                    !!formData.product_id && formData.product_id !== "none"
                  }
                  className={
                    formData.product_id && formData.product_id !== "none"
                      ? "bg-gray-50"
                      : ""
                  }
                />
                {formData.product_id && formData.product_id !== "none" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated from paid orders
                  </p>
                )}
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
                    <span className="font-semibold">Product:</span>
                    <span>{generationResult.product}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Optimal Discount:</span>
                    <span className="text-green-600 font-bold">
                      {generationResult.optimal_discount}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Final Selling Price:</span>
                    <span>
                      ₹{generationResult.final_selling_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Expected Revenue:</span>
                    <span className="text-blue-600 font-bold">
                      ₹{generationResult.expected_revenue.toFixed(2)}
                    </span>
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
          <CardTitle>Prediction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {predictionCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading predictions...</div>
          ) : filteredPredictions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No predictions found</p>
            </div>
          ) : (
            <DataTable
              data={paginatedPredictions}
              columns={columns}
              loading={loading}
              searchable={false}
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
        </CardContent>
      </Card>
    </div>
  );
}
