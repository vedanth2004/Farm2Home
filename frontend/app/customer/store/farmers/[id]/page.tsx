"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  MapPin,
  CheckCircle,
  Star,
  Leaf,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import CustomerHeader from "@/components/CustomerHeader";
import AddToCartButton from "@/components/AddToCartButton";

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  verified: boolean;
  location: string;
  displayId?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUnit: string;
  photos: string[];
  listings: Array<{
    id: string;
    pricePerUnit: number;
    storePrice?: number;
    farmerPrice?: number;
    availableQty: number;
    isActive: boolean;
  }>;
}

export default function FarmerProductsPage() {
  const params = useParams();
  const router = useRouter();
  const farmerProfileId = params.id as string;
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch products filtered by this farmer (using farmerProfile.id)
        const productsResponse = await fetch(
          `/api/products?farmerId=${farmerProfileId}`,
        );
        const productsResult = await productsResponse.json();

        if (productsResult.success && productsResult.data?.data) {
          const farmerProducts = productsResult.data.data;

          // Extract farmer info from first product
          if (farmerProducts.length > 0) {
            const firstProduct = farmerProducts[0];
            setFarmer({
              id: firstProduct.farmer?.id || "",
              name: firstProduct.farmer?.user?.name || "Unknown Farmer",
              email: firstProduct.farmer?.user?.email || "",
              phone: firstProduct.farmer?.user?.phone || undefined,
              verified: firstProduct.farmer?.verified || false,
              location: firstProduct.farmer?.user?.addresses?.[0]
                ? `${firstProduct.farmer.user.addresses[0].city || ""}, ${firstProduct.farmer.user.addresses[0].state || ""}`
                : "Location not available",
            });
          }

          setProducts(farmerProducts);
        }

        // If farmer info not set yet (no products or error), fetch from farmers list
        if (!farmer) {
          try {
            const farmersResponse = await fetch("/api/farmers");
            const farmersResult = await farmersResponse.json();

            if (farmersResult.success && farmersResult.data?.data) {
              const foundFarmer = farmersResult.data.data.find(
                (f: Farmer) => f.id === farmerProfileId,
              );
              if (foundFarmer) {
                setFarmer({
                  id: foundFarmer.id,
                  name: foundFarmer.name,
                  email: foundFarmer.email,
                  phone: foundFarmer.phone,
                  verified: foundFarmer.verified,
                  location: foundFarmer.location,
                });
              }
            }
          } catch (err) {
            console.error("Error fetching farmer info:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching farmer products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (farmerProfileId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerProfileId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CustomerHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CustomerHeader />
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Farmer Not Found
            </h3>
            <p className="text-gray-600 mb-6">
              This farmer is not available in your area or could not be found.
            </p>
            <Button asChild>
              <Link href="/customer/store/farmers">Browse All Farmers</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      {/* Farmer Header */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/customer/store/farmers">
            <Button
              variant="ghost"
              className="mb-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Farmers
            </Button>
          </Link>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold">
                  {farmer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{farmer.name}</h1>
                    {farmer.verified && (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {farmer.displayId && (
                    <p className="text-green-100 text-sm mb-2">
                      {farmer.displayId}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-green-100">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{farmer.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>
                        {products.length}{" "}
                        {products.length === 1 ? "Product" : "Products"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">
            Products from {farmer.name}
          </h2>

          {products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Products Available
              </h3>
              <p className="text-gray-600">
                This farmer currently has no active products.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const activeListing = product.listings[0];
                if (!activeListing) return null;

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
                        <Badge className="absolute top-2 left-2 bg-green-600">
                          {product.category}
                        </Badge>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {product.description}
                        </p>

                        <div className="flex items-center justify-between mb-3">
                          <div>
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
                          </div>
                          <div className="text-sm text-gray-600">
                            {activeListing.availableQty} in stock
                          </div>
                        </div>

                        <AddToCartButton
                          product={{
                            id: product.id,
                            name: product.name,
                            price:
                              activeListing.storePrice ||
                              activeListing.pricePerUnit,
                            unit: product.baseUnit,
                            image: product.photos?.[0],
                            farmerName: farmer.name,
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
