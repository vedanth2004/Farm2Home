"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Leaf,
  Star,
  ShoppingCart,
  Heart,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import Image from "next/image";
import CustomerHeader from "@/components/CustomerHeader";
import AddToCartButton from "@/components/AddToCartButton";
import FarmerInfo from "@/components/FarmerInfo";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  photos: string[];
  farmer: {
    user: {
      name: string;
      email: string;
      phone?: string;
      addresses?: {
        city: string;
        state: string;
        postalCode: string;
        line1: string;
        line2?: string;
      }[];
    };
    verified: boolean;
    createdAt: string;
  };
  listings: {
    id: string;
    pricePerUnit: number;
    storePrice?: number;
    farmerPrice?: number;
    availableQty: number;
    isActive: boolean;
  }[];
}

export default function CustomerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log("🔍 Fetching products from /api/products...");
        const response = await fetch("/api/products");
        console.log("📡 Response status:", response.status);

        if (response.ok) {
          const result = await response.json();
          console.log("📦 API Response:", result);

          // Handle the new API response format
          if (result.success && result.data) {
            // Check for paginated response structure
            let productsArray: any[] = [];

            if (result.data.data && Array.isArray(result.data.data)) {
              // Paginated response: { data: { data: [...], pagination: {...} } }
              productsArray = result.data.data;
            } else if (Array.isArray(result.data)) {
              // Direct array response: { data: [...] }
              productsArray = result.data;
            } else {
              console.error("❌ Unexpected response structure:", result);
              productsArray = [];
            }

            console.log(`✅ Found ${productsArray.length} products`);
            setProducts(productsArray);
            // Don't set filteredProducts here - let the useEffect handle it
          } else {
            console.error("❌ Invalid response format:", result);
            setProducts([]);
            setFilteredProducts([]);
          }
        } else {
          console.error(
            "❌ API request failed:",
            response.status,
            response.statusText,
          );
          const errorText = await response.text();
          console.error("Error details:", errorText);
        }
      } catch (error) {
        console.error("💥 Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter and sort products, then group by name
  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let filtered: Product[] = [];
    try {
      filtered = [...products];

      // Search filter
      if (searchQuery) {
        filtered = filtered.filter(
          (product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            product.category.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      // Category filter
      if (selectedCategory !== "all") {
        filtered = filtered.filter(
          (product) =>
            product.category.toLowerCase() === selectedCategory.toLowerCase(),
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "price":
            aValue = a.listings[0]?.pricePerUnit || 0;
            bValue = b.listings[0]?.pricePerUnit || 0;
            break;
          case "category":
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (sortOrder === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Group products by name (case-insensitive)
      const groupedMap = new Map<string, Product[]>();
      filtered.forEach((product) => {
        const nameKey = product.name.toLowerCase();
        if (!groupedMap.has(nameKey)) {
          groupedMap.set(nameKey, []);
        }
        groupedMap.get(nameKey)!.push(product);
      });

      // Convert grouped map to array - use the first product from each group
      // but include all farmers info for display
      const groupedProducts: Product[] = [];
      groupedMap.forEach((productGroup) => {
        // Filter out products with no active listings
        const productsWithListings = productGroup.filter(
          (p) =>
            p.listings &&
            p.listings.length > 0 &&
            p.listings.some((l) => l.isActive),
        );

        // Skip if no products with active listings
        if (productsWithListings.length === 0) {
          // Still show products even if they have no active listings (for now)
          const firstProduct = productGroup[0];
          const groupedProduct = {
            ...firstProduct,
            _farmerCount: productGroup.length,
            _allFarmers: productGroup.map((p) => ({
              id: p.farmer.user.name,
              name: p.farmer.user.name,
            })),
          };
          groupedProducts.push(groupedProduct as Product);
          return;
        }

        // Use the product with the cheapest listing as the representative
        const representativeProduct = productsWithListings.reduce(
          (best, current) => {
            const bestListings = (best.listings || []).filter(
              (l) => l.isActive && l.availableQty > 0,
            );
            const currentListings = (current.listings || []).filter(
              (l) => l.isActive && l.availableQty > 0,
            );

            if (bestListings.length === 0) return current;
            if (currentListings.length === 0) return best;

            const bestPrice = bestListings.sort((a, b) => {
              const priceA = Number(a.storePrice || a.pricePerUnit || 0);
              const priceB = Number(b.storePrice || b.pricePerUnit || 0);
              return priceA - priceB;
            })[0];

            const currentPrice = currentListings.sort((a, b) => {
              const priceA = Number(a.storePrice || a.pricePerUnit || 0);
              const priceB = Number(b.storePrice || b.pricePerUnit || 0);
              return priceA - priceB;
            })[0];

            if (!bestPrice) return current;
            if (!currentPrice) return best;

            const bestPriceValue = Number(
              bestPrice.storePrice || bestPrice.pricePerUnit || 0,
            );
            const currentPriceValue = Number(
              currentPrice.storePrice || currentPrice.pricePerUnit || 0,
            );

            return bestPriceValue <= currentPriceValue ? best : current;
          },
        );

        // Add farmer count info to the representative product
        const groupedProduct = {
          ...representativeProduct,
          _farmerCount: productGroup.length, // Add metadata about how many farmers offer this
          _allFarmers: productGroup.map((p) => ({
            id: p.farmer.user.name,
            name: p.farmer.user.name,
          })),
        };

        groupedProducts.push(groupedProduct as Product);
      });

      setFilteredProducts(groupedProducts);
    } catch (error) {
      console.error("Error grouping products:", error);
      // Fallback: just use filtered products without grouping
      setFilteredProducts(filtered);
    }
  }, [products, searchQuery, selectedCategory, sortBy, sortOrder]);

  // Get unique categories
  const categories = [
    "all",
    ...Array.from(
      new Set(Array.isArray(products) ? products.map((p) => p.category) : []),
    ),
  ];

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Fresh Farm Products
            </h1>
            <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
              Discover the finest selection of fresh fruits and vegetables
              directly from local farmers. Quality guaranteed, freshness
              delivered.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full max-w-md"
              />
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                className="flex items-center"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters && <X className="h-4 w-4 ml-2" />}
              </Button>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    className="cursor-pointer hover:bg-green-50"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === "all" ? "All Products" : category}
                  </Badge>
                ))}
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2 ml-auto">
                <Label className="text-sm font-medium">Sort by:</Label>
                <div className="flex gap-1">
                  <Button
                    variant={sortBy === "name" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort("name")}
                    className="flex items-center"
                  >
                    Name
                    {sortBy === "name" &&
                      (sortOrder === "asc" ? (
                        <SortAsc className="h-3 w-3 ml-1" />
                      ) : (
                        <SortDesc className="h-3 w-3 ml-1" />
                      ))}
                  </Button>
                  <Button
                    variant={sortBy === "price" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort("price")}
                    className="flex items-center"
                  >
                    Price
                    {sortBy === "price" &&
                      (sortOrder === "asc" ? (
                        <SortAsc className="h-3 w-3 ml-1" />
                      ) : (
                        <SortDesc className="h-3 w-3 ml-1" />
                      ))}
                  </Button>
                  <Button
                    variant={sortBy === "category" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort("category")}
                    className="flex items-center"
                  >
                    Category
                    {sortBy === "category" &&
                      (sortOrder === "asc" ? (
                        <SortAsc className="h-3 w-3 ml-1" />
                      ) : (
                        <SortDesc className="h-3 w-3 ml-1" />
                      ))}
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} products
              {searchQuery && ` for "${searchQuery}"`}
              {selectedCategory !== "all" && ` in ${selectedCategory}`}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Products Available
              </h3>
              <p className="text-gray-600 mb-6">
                Check back later for fresh farm products!
              </p>
              <Button asChild>
                <Link href="/customer/store">Back to Home</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.isArray(filteredProducts) &&
                  filteredProducts.map((product: Product) => {
                    // Get the best/cheapest listing if multiple exist
                    const activeListings = (product.listings || []).filter(
                      (l) => l.isActive,
                    );

                    // If no active listings, still show the product (it will show as out of stock)
                    let activeListing = null;
                    if (activeListings.length > 0) {
                      // Sort by price and get the cheapest one
                      const sortedListings = [...activeListings].sort(
                        (a, b) => {
                          const priceA = Number(
                            a.storePrice || a.pricePerUnit || 0,
                          );
                          const priceB = Number(
                            b.storePrice || b.pricePerUnit || 0,
                          );
                          return priceA - priceB;
                        },
                      );
                      activeListing = sortedListings[0];
                    }

                    return (
                      <Link
                        key={product.id}
                        href={`/customer/store/products/${product.id}`}
                      >
                        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg cursor-pointer">
                          <div className="relative">
                            <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg flex items-center justify-center">
                              {product.photos && product.photos.length > 0 ? (
                                <Image
                                  src={product.photos[0]}
                                  alt={product.name}
                                  width={200}
                                  height={200}
                                  className="object-cover rounded-t-lg"
                                />
                              ) : (
                                <Leaf className="h-16 w-16 text-green-400" />
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Badge className="absolute top-2 left-2 bg-green-600">
                              Fresh
                            </Badge>
                          </div>

                          <CardContent className="p-4">
                            <div className="mb-2">
                              <h3 className="font-semibold text-gray-900 line-clamp-1">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {product.description}
                              </p>
                            </div>

                            <div className="flex items-center mb-2">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-4 w-4 fill-current"
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600 ml-2">
                                (4.8)
                              </span>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <div>
                                {activeListing ? (
                                  <>
                                    <span className="text-lg font-bold text-green-600">
                                      ₹
                                      {Number(
                                        activeListing.storePrice ||
                                          activeListing.pricePerUnit,
                                      ).toFixed(2)}
                                    </span>
                                    <span className="text-sm text-gray-600 ml-1">
                                      / {product.baseUnit}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    Out of stock
                                  </span>
                                )}
                              </div>
                              {activeListing && (
                                <div className="text-sm text-gray-600">
                                  {activeListing.availableQty} in stock
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-gray-500 mb-3">
                              {(product as any)._farmerCount > 1 ? (
                                <span className="text-green-600 font-semibold">
                                  Available from {(product as any)._farmerCount}{" "}
                                  farmers • Select farmer on product page
                                </span>
                              ) : (
                                <>
                                  by {product.farmer.user.name}
                                  {product.farmer.user.addresses &&
                                    product.farmer.user.addresses.length >
                                      0 && (
                                      <span className="ml-2 text-green-600">
                                        •{" "}
                                        {product.farmer.user.addresses[0].city},{" "}
                                        {product.farmer.user.addresses[0].state}
                                      </span>
                                    )}
                                </>
                              )}
                            </div>

                            {activeListing && (
                              <AddToCartButton
                                product={{
                                  id: product.id,
                                  name: product.name,
                                  price:
                                    activeListing.storePrice ||
                                    activeListing.pricePerUnit,
                                  unit: product.baseUnit,
                                  image: product.photos?.[0],
                                  farmerName: product.farmer.user.name,
                                }}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Can&apos;t Find What You&apos;re Looking For?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Contact us and we&apos;ll help you find the perfect fresh produce
            for your needs.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-green-600 hover:bg-gray-100"
          >
            <Link href="/customer/store">Contact Us</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-2 rounded-xl mr-3">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <h4 className="text-2xl font-bold">Farm2Home</h4>
            </div>
            <p className="text-gray-400 mb-4">
              Connecting farmers with customers for fresh, local produce
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Farm2Home. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
