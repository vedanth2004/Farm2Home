"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  approveProduct,
  rejectProduct,
  requestProductChanges,
  searchProducts,
} from "@/lib/actions/product-actions";

// Define types manually
type Decimal = any; // Prisma Decimal type

interface ProductDraft {
  id: string;
  status: string;
  pricePerUnit: Decimal;
  availableQty: number;
  adminNote?: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    description: string;
    category: string;
    baseUnit: string;
    farmer: {
      user: {
        name: string;
      };
    };
  };
}

interface ProductApprovalsProps {
  initialDrafts: ProductDraft[];
}

export default function ProductApprovals({
  initialDrafts,
}: ProductApprovalsProps) {
  const [drafts, setDrafts] = useState<ProductDraft[]>(initialDrafts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<ProductDraft | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [changeRequest, setChangeRequest] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const result = await searchProducts(searchQuery, statusFilter);
      if (result.success) {
        setDrafts(result.drafts);
      } else {
        setError(result.error || "Search failed");
      }
    } catch (error) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (draftId: string) => {
    setLoading(true);
    setError("");
    try {
      console.log("Approving product with ID:", draftId);
      const result = await approveProduct(draftId);
      console.log("Approve result:", result);
      if (result.success) {
        setDrafts(drafts.filter((draft) => draft.id !== draftId));
        setError("");
        setSuccess("Product approved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to approve product");
      }
    } catch (error) {
      console.error("Approve error:", error);
      setError("Failed to approve product");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (draftId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason || !reason.trim()) {
      setError("Rejection cancelled or no reason provided");
      return;
    }

    setLoading(true);
    setError("");
    try {
      console.log("Rejecting product with ID:", draftId, "Reason:", reason);
      const result = await rejectProduct(draftId, reason);
      console.log("Reject result:", result);
      if (result.success) {
        setDrafts(drafts.filter((draft) => draft.id !== draftId));
        setError("");
        setSuccess("Product rejected successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to reject product");
      }
    } catch (error) {
      console.error("Reject error:", error);
      setError("Failed to reject product");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async (draftId: string) => {
    if (!changeRequest.trim()) {
      setError("Please provide details for requested changes");
      return;
    }

    setLoading(true);
    try {
      const result = await requestProductChanges(draftId, changeRequest);
      if (result.success) {
        setDrafts(drafts.filter((draft) => draft.id !== draftId));
        setChangeRequest("");
        setError("");
        setSuccess("Changes requested successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to request changes");
      }
    } catch (error) {
      setError("Failed to request changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products by name, farmer, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
          <option value="ALL">All Status</option>
        </select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
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

      {/* Pending Approvals */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Product Approvals ({drafts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                <p>No products found</p>
              </div>
            ) : (
              drafts.map((draft: any) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between p-6 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🥬</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-lg">
                        {draft.product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        by{" "}
                        {draft.product.farmer?.user?.name || "Unknown Farmer"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {draft.product.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-200"
                        >
                          {draft.product.category}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          ₹{Number(draft.pricePerUnit).toFixed(2)} per{" "}
                          {draft.product.baseUnit}
                        </span>
                        <span className="text-sm text-gray-600">
                          Stock: {draft.availableQty} {draft.product.baseUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Submitted</p>
                      <p className="text-sm font-medium">
                        {new Date(draft.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => setSelectedDraft(draft)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(draft.id)}
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(draft.id)}
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Review Product: {selectedDraft.product.name}
                </CardTitle>
                <Button variant="ghost" onClick={() => setSelectedDraft(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Product Name</Label>
                  <p className="text-sm text-gray-600">
                    {selectedDraft.product.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-gray-600">
                    {selectedDraft.product.category}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Price</Label>
                  <p className="text-sm text-gray-600">
                    ₹{Number(selectedDraft.pricePerUnit).toFixed(2)} per{" "}
                    {selectedDraft.product.baseUnit}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Available Quantity
                  </Label>
                  <p className="text-sm text-gray-600">
                    {selectedDraft.availableQty}{" "}
                    {selectedDraft.product.baseUnit}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDraft.product.description}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Farmer</Label>
                <p className="text-sm text-gray-600">
                  {selectedDraft.product.farmer?.user?.name || "Unknown Farmer"}
                </p>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => handleApprove(selectedDraft.id)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRequestChanges(selectedDraft.id)}
                  disabled={loading}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedDraft.id)}
                  disabled={loading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
