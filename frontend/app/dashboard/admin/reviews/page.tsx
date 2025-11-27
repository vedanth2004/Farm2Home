"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Package,
} from "lucide-react";

interface PendingReview {
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
  } | null;
  farmer: {
    id: string;
    name: string;
  } | null;
}

export default function AdminReviewModerationPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/reviews/pending");
      const result = await response.json();

      if (result.success) {
        setReviews(result.data);
      }
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const handleApprove = async (reviewId: string) => {
    setProcessingIds((prev) => new Set(prev).add(reviewId));
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
        method: "PUT",
      });

      const result = await response.json();

      if (result.success) {
        // Remove from list
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        alert(result.message || "Failed to approve review");
      }
    } catch (error) {
      console.error("Error approving review:", error);
      alert("Failed to approve review. Please try again.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!confirm("Are you sure you want to reject this review?")) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(reviewId));
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/reject`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // Remove from list
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        alert(result.message || "Failed to reject review");
      }
    } catch (error) {
      console.error("Error rejecting review:", error);
      alert("Failed to reject review. Please try again.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Moderation</h1>
          <p className="text-gray-600 mt-1">
            Approve or reject customer product reviews
          </p>
        </div>
        <Button onClick={fetchPendingReviews} variant="outline">
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
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No pending reviews</p>
              <p className="text-sm">All reviews have been moderated.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{review.author.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {review.author.email}
                      </Badge>
                    </div>
                    {review.product && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Product: {review.product.name}
                        </span>
                      </div>
                    )}
                    {review.farmer && (
                      <div className="text-sm text-gray-600">
                        Farmer: {review.farmer.name}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-yellow-50">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({review.rating}/5)
                    </span>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div>
                      <p className="text-sm font-medium mb-1">Comment:</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-sm text-gray-500">
                    Submitted: {new Date(review.createdAt).toLocaleString()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleApprove(review.id)}
                      disabled={processingIds.has(review.id)}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(review.id)}
                      disabled={processingIds.has(review.id)}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
