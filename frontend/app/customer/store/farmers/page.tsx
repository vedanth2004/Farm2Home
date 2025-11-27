"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  Package,
  CheckCircle,
  User,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import CustomerHeader from "@/components/CustomerHeader";
import Image from "next/image";

interface Farmer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  verified: boolean;
  location: string;
  productCount: number;
  displayId?: string;
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/farmers");
        const result = await response.json();

        if (result.success && result.data?.data) {
          setFarmers(result.data.data);
          setFilteredFarmers(result.data.data);
        }
      } catch (error) {
        console.error("Error fetching farmers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, []);

  // Filter farmers by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFarmers(farmers);
      return;
    }

    const filtered = farmers.filter(
      (farmer) =>
        farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmer.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmer.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredFarmers(filtered);
  }, [searchQuery, farmers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/customer/store/products">
            <Button
              variant="ghost"
              className="mb-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Browse by Farmers
            </h1>
            <p className="text-xl text-green-100 max-w-3xl mx-auto">
              Discover local farmers and their fresh produce. Support local
              agriculture and get the freshest products directly from the
              source.
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search farmers by name, location, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
            />
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {filteredFarmers.length} of {farmers.length} farmers
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      </section>

      {/* Farmers Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Loading farmers...</span>
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Farmers Found
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? "Try a different search term"
                  : "No farmers are available in your area (within 50km)"}
              </p>
              <Button asChild>
                <Link href="/customer/store/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFarmers.map((farmer) => (
                <Link
                  key={farmer.id}
                  href={`/customer/store/farmers/${farmer.id}`}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg cursor-pointer">
                    <CardContent className="p-6">
                      {/* Farmer Avatar */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
                          {farmer.name.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Farmer Name */}
                      <div className="text-center mb-3">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {farmer.name}
                        </h3>
                        {farmer.displayId && (
                          <p className="text-xs text-gray-500">
                            {farmer.displayId}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {farmer.verified && (
                            <Badge className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{farmer.location}</span>
                      </div>

                      {/* Product Count */}
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 mb-4">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                          {farmer.productCount}{" "}
                          {farmer.productCount === 1 ? "Product" : "Products"}
                        </span>
                      </div>

                      {/* View Button */}
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        View Products
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
