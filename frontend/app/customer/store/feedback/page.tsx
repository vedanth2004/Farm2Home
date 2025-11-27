"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import CustomerHeader from "@/components/CustomerHeader";
import {
  Star,
  MessageSquare,
  Package,
  ArrowLeft,
  Send,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: {
    id: string;
    listing: {
      product: {
        name: string;
        photos: string[];
      };
    };
  }[];
}

interface Feedback {
  id: string;
  orderId: string;
  rating: number;
  comment: string;
  type: string;
  createdAt: string;
}

export default function CustomerFeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackType, setFeedbackType] = useState<
    "product" | "delivery" | "service"
  >("product");

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?callbackUrl=/customer/store/feedback");
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch orders
      const ordersResponse = await fetch("/api/orders");
      if (ordersResponse.ok) {
        const ordersResult = await ordersResponse.json();
        if (ordersResult.success && Array.isArray(ordersResult.data)) {
          setOrders(ordersResult.data);
        }
      }

      // Fetch existing feedback
      const feedbackResponse = await fetch("/api/feedback");
      if (feedbackResponse.ok) {
        const feedbackResult = await feedbackResponse.json();
        if (feedbackResult.success && Array.isArray(feedbackResult.data)) {
          setFeedback(feedbackResult.data);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrder || rating === 0) {
      alert("Please select an order and provide a rating");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder,
          rating,
          comment,
          type: feedbackType,
        }),
      });

      if (response.ok) {
        alert("Feedback submitted successfully!");
        setRating(0);
        setComment("");
        setSelectedOrder("");
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "OUT_FOR_DELIVERY":
        return "bg-blue-100 text-blue-800";
      case "PICKED_UP":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "delivery":
        return <Truck className="h-4 w-4" />;
      case "service":
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CustomerHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <CustomerHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/customer/store">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Store
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Feedback & Reviews
              </h1>
              <p className="text-gray-600">
                Share your experience and help us improve
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Submit Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Submit Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                <div>
                  <Label htmlFor="order">Select Order</Label>
                  <select
                    id="order"
                    value={selectedOrder}
                    onChange={(e) => setSelectedOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Choose an order...</option>
                    {orders
                      .filter((order) => order.status === "DELIVERED")
                      .map((order) => (
                        <option key={order.id} value={order.id}>
                          Order #{order.id.slice(-8)} - ₹
                          {Number(order.totalAmount).toFixed(2)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="type">Feedback Type</Label>
                  <select
                    id="type"
                    value={feedbackType}
                    onChange={(e) =>
                      setFeedbackType(
                        e.target.value as "product" | "delivery" | "service",
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="product">Product Quality</option>
                    <option value="delivery">Delivery Experience</option>
                    <option value="service">Customer Service</option>
                  </select>
                </div>

                <div>
                  <Label>Rating</Label>
                  <div className="flex space-x-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 ${
                          star <= rating ? "text-yellow-400" : "text-gray-300"
                        } hover:text-yellow-400 transition-colors`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {rating === 0 && "Click to rate"}
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </p>
                </div>

                <div>
                  <Label htmlFor="comment">Comments (Optional)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !selectedOrder || rating === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Feedback History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Your Feedback History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedback.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No feedback submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getFeedbackTypeIcon(item.type)}
                          <span className="font-medium capitalize">
                            {item.type}
                          </span>
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < item.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {item.comment && (
                        <p className="text-sm text-gray-600 mb-2">
                          {item.comment}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(item.createdAt))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders for Reference */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">
                        Order #{order.id.slice(-8)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ₹{Number(order.totalAmount).toFixed(2)} •{" "}
                        {order.items.length} items
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(order.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ")}
                      </Badge>
                      {order.status === "DELIVERED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
