"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  ShoppingCart,
  DollarSign,
  Package,
  Clock,
} from "lucide-react";
import { isValidDisplayId } from "@/lib/utils/display-id";

interface SearchResult {
  user: {
    id: string;
    internalId: string;
    displayId: string;
    name: string;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: string;
    location: string | null;
  };
  stats: {
    orders: number;
    totalEarnings: number;
    pendingPayout: number;
    totalRevenue: number;
    totalProfit: number;
    products: number;
    activeListings: number;
  };
  recentOrders: any[];
  recentActivity: any[];
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a display ID");
      return;
    }

    if (!isValidDisplayId(searchQuery.trim())) {
      setError("Invalid display ID format. Example: FARM-ABC123");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `/api/search/by-display-id?displayId=${encodeURIComponent(searchQuery.trim())}`,
      );
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || "User not found");
      }
    } catch (err) {
      setError("Failed to search. Please try again.");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Search className="h-4 w-4 mr-2" />
          Search by Display ID
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Global Search by Display ID</DialogTitle>
          <DialogDescription>
            Search for users, orders, and statistics by display ID (e.g.,
            FARM-ABC123)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter Display ID (e.g., FARM-ABC123, CUST-XYZ789)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value.toUpperCase());
                setError("");
                setResult(null);
              }}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* User Info Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">
                          {result.user.name}
                        </h3>
                        <Badge variant="outline" className="font-mono">
                          {result.user.displayId}
                        </Badge>
                        <Badge>{result.user.role}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {result.user.email}
                      </p>
                      {result.user.location && (
                        <p className="text-sm text-gray-500">
                          📍 {result.user.location}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Member since:{" "}
                        {new Date(result.user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        result.user.accountStatus === "APPROVED"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {result.user.accountStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Card */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.stats.orders > 0 && (
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Orders</p>
                          <p className="font-bold">{result.stats.orders}</p>
                        </div>
                      </div>
                    )}
                    {result.stats.totalEarnings > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-600">Earnings</p>
                          <p className="font-bold">
                            ₹{result.stats.totalEarnings.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                    {result.stats.pendingPayout > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="font-bold">
                            ₹{result.stats.pendingPayout.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                    {result.stats.totalRevenue > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-600">Revenue</p>
                          <p className="font-bold">
                            ₹{result.stats.totalRevenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                    {result.stats.totalProfit > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-sm text-gray-600">Profit</p>
                          <p className="font-bold">
                            ₹{result.stats.totalProfit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                    {result.stats.products > 0 && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="text-sm text-gray-600">Products</p>
                          <p className="font-bold">{result.stats.products}</p>
                        </div>
                      </div>
                    )}
                    {result.stats.activeListings > 0 && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-600">Active</p>
                          <p className="font-bold">
                            {result.stats.activeListings}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Orders */}
              {result.recentOrders.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4">Recent Orders</h4>
                    <div className="space-y-2">
                      {result.recentOrders.map((order: any) => (
                        <div
                          key={order.id}
                          className="border-b pb-2 last:border-0 text-sm"
                        >
                          <div className="flex justify-between">
                            <span className="font-mono text-xs">
                              #{order.id.substring(0, 8)}
                            </span>
                            <span className="font-bold">
                              ₹{Number(order.totalAmount).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-gray-600">
                            {order.items?.length || 0} items •{" "}
                            {order.customer?.name || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              {result.recentActivity.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4">Recent Activity</h4>
                    <div className="space-y-2">
                      {result.recentActivity.map(
                        (activity: any, idx: number) => (
                          <div
                            key={idx}
                            className="border-b pb-2 last:border-0 text-sm"
                          >
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-gray-600 text-xs">
                              {activity.entityType} •{" "}
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
