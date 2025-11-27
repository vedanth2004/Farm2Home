"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader2,
  X,
  Save,
} from "lucide-react";
import {
  updateProduct,
  searchProducts,
} from "@/lib/actions/product-management-actions";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  createdAt: Date;
  farmer?: {
    user?: {
      name: string;
    };
  };
  listings?: any[];
  drafts?: any[];
}

interface ProductManagementProps {
  initialProducts: Product[];
}

export default function ProductManagement({
  initialProducts,
}: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setProducts(initialProducts);
      return;
    }

    setLoading(true);
    try {
      const result = await searchProducts(searchQuery, categoryFilter);
      if (result.success) {
        setProducts(result.products);
      } else {
        setError(result.error || "Search failed");
      }
    } catch (error) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingProductId(productId);
    setError("");
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setProducts(products.filter((product) => product.id !== productId));
        setSuccess("Product deleted successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingProduct) return;

    setLoading(true);
    try {
      const result = await updateProduct(editingProduct.id, formData);
      if (result.success) {
        setProducts(
          products.map((product) =>
            product.id === editingProduct.id ? result.product : product,
          ),
        );
        setEditingProduct(null);
        setError("");
        setSuccess("Product updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to update product");
      }
    } catch (error) {
      setError("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (product: Product) => {
    if ((product.listings?.length || 0) > 0)
      return "bg-green-100 text-green-800";
    if ((product.drafts?.length || 0) > 0)
      return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (product: Product) => {
    if ((product.listings?.length || 0) > 0) return "Active";
    if ((product.drafts?.length || 0) > 0) return "Pending";
    return "Inactive";
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products by name, description, or farmer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="ALL">All Categories</option>
          <option value="VEGETABLES">Vegetables</option>
          <option value="FRUITS">Fruits</option>
          <option value="GRAINS">Grains</option>
          <option value="DAIRY">Dairy</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={() => {
            setSearchQuery("");
            setCategoryFilter("ALL");
            setStatusFilter("ALL");
            setProducts(initialProducts);
            setError("");
          }}
          variant="outline"
          disabled={loading}
        >
          Clear
        </Button>
      </div>

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

      {/* Edit Product Modal */}
      {editingProduct && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Edit Product</CardTitle>
              <Button variant="ghost" onClick={() => setEditingProduct(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form action={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    defaultValue={editingProduct.category}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  >
                    <option value="VEGETABLES">Vegetables</option>
                    <option value="FRUITS">Fruits</option>
                    <option value="GRAINS">Grains</option>
                    <option value="DAIRY">Dairy</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="baseUnit">Base Unit</Label>
                  <Input
                    id="baseUnit"
                    name="baseUnit"
                    defaultValue={editingProduct.baseUnit}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingProduct.description}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            All Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No products found</p>
              </div>
            ) : (
              products.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.category}
                      </p>
                      <p className="text-xs text-gray-500">
                        by {product.farmer?.user?.name || "Unknown Farmer"} •{" "}
                        {new Date(product.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {product.listings?.length || 0} active listing
                        {(product.listings?.length || 0) !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.drafts?.length || 0} pending draft
                        {(product.drafts?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <Badge className={getStatusBadgeColor(product)}>
                      {getStatusText(product)}
                    </Badge>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        asChild
                      >
                        <Link href={`/dashboard/admin/products/${product.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => setEditingProduct(product)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingProductId === product.id || loading}
                      >
                        {deletingProductId === product.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
