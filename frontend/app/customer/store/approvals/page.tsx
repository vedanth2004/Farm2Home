"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustomerHeader from "@/components/CustomerHeader";
import DeliveryApprovalsList from "@/components/customer/DeliveryApprovalsList";
import { ArrowLeft, HandHeart, RefreshCw } from "lucide-react";
import Link from "next/link";

interface DeliveryApproval {
  id: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  customerNotes?: string;
  agentNotes?: string;
  pickupJob: {
    id: string;
    status: string;
    order: {
      id: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
      createdAt: string;
      shippingAddress: {
        line1: string;
        city: string;
        state: string;
        postalCode: string;
      };
      items: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        listing: {
          product: {
            id: string;
            name: string;
            photos: string[];
            farmer: {
              user: {
                name: string;
              };
            };
          };
        };
      }>;
    };
    agent: {
      user: {
        name: string;
        email: string;
        phone?: string;
      };
    };
  };
}

export default function DeliveryApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [approvals, setApprovals] = useState<DeliveryApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?callbackUrl=/customer/store/approvals");
      return;
    }

    fetchApprovals();
  }, [session, status, router]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/delivery-approvals/customer");
      const result = await response.json();

      if (response.ok) {
        if (result.success && Array.isArray(result.approvals)) {
          setApprovals(result.approvals);
          console.log("Fetched approvals:", result.approvals.length);
        } else {
          console.error("Invalid response format:", result);
          setApprovals([]);
        }
      } else {
        console.error(
          "Failed to fetch delivery approvals:",
          response.status,
          result,
        );
        setError(result.error || "Failed to load delivery approvals");
        setApprovals([]);
      }
    } catch (error) {
      console.error("Error fetching delivery approvals:", error);
      setError("An error occurred while loading approvals");
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = approvals.filter((approval) => {
    if (filter === "all") return true;
    return approval.status === filter.toUpperCase();
  });

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || status === "loading" || loading) {
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
                Delivery Confirmations
              </h1>
              <p className="text-gray-600">
                Confirm delivery completion and payment receipt from pickup
                agents
              </p>
            </div>
          </div>
          <Button
            onClick={fetchApprovals}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Filter Tabs */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                All ({approvals.length})
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                size="sm"
              >
                Pending (
                {approvals.filter((a) => a.status === "PENDING").length})
              </Button>
              <Button
                variant={filter === "approved" ? "default" : "outline"}
                onClick={() => setFilter("approved")}
                size="sm"
              >
                Approved (
                {approvals.filter((a) => a.status === "APPROVED").length})
              </Button>
              <Button
                variant={filter === "rejected" ? "default" : "outline"}
                onClick={() => setFilter("rejected")}
                size="sm"
              >
                Rejected (
                {approvals.filter((a) => a.status === "REJECTED").length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Approvals List */}
        {approvals.length === 0 && !error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <HandHeart className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Delivery Approvals
              </h3>
              <p className="text-gray-600 mb-4">
                You don&apos;t have any delivery approval requests yet. Delivery
                approvals appear here when:
              </p>
              <div className="text-sm text-gray-600 text-left max-w-md mx-auto space-y-2">
                <div className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>A pickup agent completes delivery of your order</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    The agent requests your confirmation that delivery was
                    successful
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    You can then approve or reject the delivery confirmation
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : approvals.length > 0 ? (
          <DeliveryApprovalsList approvals={filteredApprovals} />
        ) : null}
      </div>
    </div>
  );
}
