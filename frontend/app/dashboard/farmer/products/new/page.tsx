"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Package,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface ExistingProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  photos: string[];
  currentStock: number;
  currentPrice: number;
  hasActiveListing: boolean;
  hasPendingDraft: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Existing products
  const [existingProducts, setExistingProducts] = useState<ExistingProduct[]>(
    [],
  );
  const [selectedProduct, setSelectedProduct] =
    useState<ExistingProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [baseUnit, setBaseUnit] = useState("");
  const [farmerPrice, setFarmerPrice] = useState("");
  const [availableQty, setAvailableQty] = useState("");

  // Fetch existing products when switching to "existing" mode
  useEffect(() => {
    if (mode === "existing") {
      fetchExistingProducts();
    }
  }, [mode]);

  // Auto-fill form when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setName(selectedProduct.name);
      setCategory(selectedProduct.category);
      setDescription(selectedProduct.description);
      setBaseUnit(selectedProduct.baseUnit);
      setFarmerPrice(selectedProduct.currentPrice.toString());
      setAvailableQty(""); // Clear quantity - user should enter additional quantity
    }
  }, [selectedProduct]);

  const fetchExistingProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch("/api/farmer/products");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setExistingProducts(result.products);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "existing" && selectedProduct) {
        // Update quantity for existing product
        if (!availableQty || parseFloat(availableQty) <= 0) {
          setError("Please enter a valid quantity to add");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/farmer/products/update-quantity", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProduct.id,
            additionalQty: parseFloat(availableQty),
            farmerPrice: farmerPrice ? parseFloat(farmerPrice) : undefined,
          }),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          setSuccess(result.message);
          setTimeout(() => {
            router.push("/dashboard/farmer/products");
          }, 1500);
        } else {
          setError(result.error || "Failed to update product quantity");
        }
      } else {
        // Create new product
        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", category);
        formData.append("description", description);
        formData.append("baseUnit", baseUnit);
        formData.append("farmerPrice", farmerPrice);
        formData.append("availableQty", availableQty);

        const response = await fetch("/api/farmer/products/create", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (response.ok && result.success) {
          setSuccess("Product created successfully! Pending admin approval.");
          setTimeout(() => {
            router.push("/dashboard/farmer/products");
          }, 1500);
        } else {
          setError(result.error || "Failed to create product");
        }
      }
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setDescription("");
    setBaseUnit("");
    setFarmerPrice("");
    setAvailableQty("");
    setSelectedProduct(null);
    setError("");
    setSuccess("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/farmer/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === "new" ? "Add New Product" : "Update Existing Product"}
          </h1>
          <p className="text-gray-600 mt-1">
            {mode === "new"
              ? "Create a new product listing"
              : "Select a product and add more quantity"}
          </p>
        </div>
      </div>

      {/* Mode Selection Tabs */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => {
                setMode("new");
                resetForm();
              }}
              className={
                mode === "new" ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              <Package className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => {
                setMode("existing");
                resetForm();
              }}
              className={
                mode === "existing" ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Select from My Products
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center text-green-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              <p>{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2 text-green-600" />
            {mode === "new"
              ? "Product Information"
              : "Product Selection & Quantity"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Selection for Existing Mode */}
            {mode === "existing" && (
              <div className="space-y-2">
                <Label htmlFor="existingProduct">Select Product *</Label>
                {loadingProducts ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">
                      Loading products...
                    </span>
                  </div>
                ) : existingProducts.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600">
                      You don&apos;t have any products yet. Switch to &quot;Add
                      New Product&quot; to create one.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedProduct?.id || ""}
                    onValueChange={(value) => {
                      const product = existingProducts.find(
                        (p) => p.id === value,
                      );
                      setSelectedProduct(product || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product to update quantity" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{product.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({product.category}) - Stock:{" "}
                              {product.currentStock} {product.baseUnit}
                              {product.hasPendingDraft && " (Pending)"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Fresh Organic Tomatoes"
                  required
                  disabled={mode === "existing" && !!selectedProduct}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={mode === "existing" && !!selectedProduct}
                >
                  <option value="">Select Category</option>
                  <option value="VEGETABLES">Vegetables</option>
                  <option value="FRUITS">Fruits</option>
                  <option value="GRAINS">Grains</option>
                  <option value="DAIRY">Dairy</option>
                  <option value="HERBS">Herbs</option>
                  <option value="SPICES">Spices</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product, growing methods, quality, etc."
                rows={4}
                required
                disabled={mode === "existing" && !!selectedProduct}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="baseUnit">Base Unit *</Label>
                <select
                  id="baseUnit"
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={mode === "existing" && !!selectedProduct}
                >
                  <option value="">Select Unit</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="lb">Pound (lb)</option>
                  <option value="bunch">Bunch</option>
                  <option value="piece">Piece</option>
                  <option value="dozen">Dozen</option>
                  <option value="liter">Liter (L)</option>
                  <option value="ml">Milliliter (ml)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="farmerPrice">
                  Your Price per Unit (₹) *
                  {mode === "existing" && selectedProduct && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Current: ₹{selectedProduct.currentPrice})
                    </span>
                  )}
                </Label>
                <Input
                  id="farmerPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={farmerPrice}
                  onChange={(e) => setFarmerPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
                {mode === "new" && (
                  <p className="text-sm text-gray-600">
                    This is the amount you&apos;ll receive per unit sold. The
                    store price will be set by admin during approval.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableQty">
                  {mode === "existing"
                    ? "Additional Quantity *"
                    : "Available Quantity *"}
                  {mode === "existing" && selectedProduct && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Current Stock: {selectedProduct.currentStock}{" "}
                      {selectedProduct.baseUnit})
                    </span>
                  )}
                </Label>
                <Input
                  id="availableQty"
                  type="number"
                  min="1"
                  value={availableQty}
                  onChange={(e) => setAvailableQty(e.target.value)}
                  placeholder="0"
                  required
                />
                {mode === "existing" && selectedProduct && (
                  <p className="text-sm text-green-600">
                    This will be added to your existing stock of{" "}
                    {selectedProduct.currentStock} {selectedProduct.baseUnit}
                  </p>
                )}
              </div>
            </div>

            {/* Image Upload Placeholder */}
            {mode === "new" && (
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Upload product images</p>
                  <p className="text-sm text-gray-400">
                    Drag and drop or click to browse
                  </p>
                  <Button type="button" variant="outline" className="mt-4">
                    Choose Files
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, WebP. Max size: 5MB per image.
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/farmer/products">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={loading || (mode === "existing" && !selectedProduct)}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {mode === "existing" ? "Updating..." : "Creating..."}
                  </>
                ) : mode === "existing" ? (
                  "Update Quantity"
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="border-0 shadow-lg bg-blue-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            {mode === "new"
              ? "Product Approval Process"
              : "Quantity Update Process"}
          </h3>
          <p className="text-blue-800 text-sm">
            {mode === "new"
              ? "After creating your product, it will be submitted for admin approval. You'll be notified once it's reviewed and approved for listing on the marketplace."
              : "When you add quantity to an existing product with an active listing, it will be updated immediately. If the product has a pending draft, the quantity will be added to that draft."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
