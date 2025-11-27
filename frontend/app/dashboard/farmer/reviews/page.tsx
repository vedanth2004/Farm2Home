"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Package,
  RefreshCw,
  User,
  Calendar,
  TrendingUp,
  Award,
} from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    category: string;
  } | null;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  topProduct: {
    name: string;
    avgRating: number;
  } | null;
  ratingTrend: Array<{
    date: string;
    avgRating: number;
  }>;
}

export default function FarmerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reviewsResponse, statsResponse] = await Promise.all([
        fetch("/api/farmer/reviews"),
        fetch("/api/farmer/reviews/stats"),
      ]);

      const reviewsResult = await reviewsResponse.json();
      const statsResult = await statsResponse.json();

      if (reviewsResult.success) {
        setReviews(reviewsResult.data);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group reviews by product
  const reviewsByProduct = reviews.reduce(
    (acc, review) => {
      if (!review.product) return acc;
      const productId = review.product.id;
      if (!acc[productId]) {
        acc[productId] = {
          product: review.product,
          reviews: [],
        };
      }
      acc[productId].reviews.push(review);
      return acc;
    },
    {} as Record<string, { product: Review["product"]; reviews: Review[] }>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Feedback</h1>
          <p className="text-gray-600 mt-1">
            View customer reviews and ratings for your products
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">Loading reviews...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Reviews
                  </CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReviews}</div>
                  <p className="text-xs text-muted-foreground">
                    Approved reviews
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Rating
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.averageRating.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(stats.averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {stats.topProduct && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Top Rated Product
                    </CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold line-clamp-1">
                      {stats.topProduct.name}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-lg font-bold">
                        {stats.topProduct.avgRating.toFixed(1)}
                      </span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Reviews by Product */}
          {Object.keys(reviewsByProduct).length > 0 ? (
            <div className="space-y-6">
              {Object.values(reviewsByProduct).map((group) => (
                <Card key={group.product?.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-gray-500" />
                        <CardTitle>{group.product?.name}</CardTitle>
                        <Badge variant="outline">
                          {group.product?.category}
                        </Badge>
                      </div>
                      <Badge variant="secondary">
                        {group.reviews.length} review
                        {group.reviews.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {group.reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">
                                {review.author.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {review.author.email}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">
                                {review.rating}/5
                              </span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 mb-2 bg-gray-50 p-3 rounded-md">
                              {review.comment}
                            </p>
                          )}
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(review.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No reviews yet</p>
                  <p className="text-sm">
                    Customer reviews will appear here once approved by admin.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
