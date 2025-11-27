"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  approveProduct,
  rejectProduct,
  requestProductChanges,
} from "@/lib/actions/product-actions";
import {
  bulkApproveProducts,
  bulkRejectProducts,
  searchProductDrafts,
  getApprovalStats,
} from "@/lib/actions/approval-actions";

// Define types manually
type Decimal = any; // Prisma Decimal type

interface ProductDraft {
  id: string;
  status: string;
  pricePerUnit: number;
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

export default function EnhancedProductApprovals({
  initialDrafts,
}: ProductApprovalsProps) {
  const [drafts, setDrafts] = useState<ProductDraft[]>(initialDrafts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<ProductDraft | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    changesRequested: 0,
    thisWeek: 0,
  });

  // Load stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await getApprovalStats();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await searchProductDrafts(
        searchQuery,
        statusFilter,
        categoryFilter,
      );
      if (result.success) {
        setDrafts(result.drafts);
        setError("");
      } else {
        setError(result.error || "Search failed");
      }
    } catch (error) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setStatusFilter("PENDING");
    setCategoryFilter("ALL");
    setDrafts(initialDrafts);
    setError("");
  };

  const handleSelectAll = () => {
    if (selectedDrafts.length === drafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(drafts.map((draft) => draft.id));
    }
  };

  const handleSelectDraft = (draftId: string) => {
    setSelectedDrafts((prev) =>
      prev.includes(draftId)
        ? prev.filter((id) => id !== draftId)
        : [...prev, draftId],
    );
  };

  const handleBulkApprove = async () => {
    if (selectedDrafts.length === 0) {
      setError("Please select products to approve");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to approve ${selectedDrafts.length} products?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await bulkApproveProducts(selectedDrafts);
      if (result.success) {
        setDrafts(drafts.filter((draft) => !selectedDrafts.includes(draft.id)));
        setSelectedDrafts([]);
        setShowBulkActions(false);
        setError("");
        setSuccess(result.message);
        setTimeout(() => setSuccess(""), 5000);
        loadStats(); // Refresh stats
      } else {
        setError(result.error || "Bulk approval failed");
      }
    } catch (error) {
      setError("Bulk approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedDrafts.length === 0) {
      setError("Please select products to reject");
      return;
    }

    if (!bulkRejectReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to reject ${selectedDrafts.length} products?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await bulkRejectProducts(selectedDrafts, bulkRejectReason);
      if (result.success) {
        setDrafts(drafts.filter((draft) => !selectedDrafts.includes(draft.id)));
        setSelectedDrafts([]);
        setShowBulkActions(false);
        setBulkRejectReason("");
        setError("");
        setSuccess(result.message);
        setTimeout(() => setSuccess(""), 5000);
        loadStats(); // Refresh stats
      } else {
        setError(result.error || "Bulk rejection failed");
      }
    } catch (error) {
      setError("Bulk rejection failed");
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
        loadStats(); // Refresh stats
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
        loadStats(); // Refresh stats
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
        loadStats(); // Refresh stats
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
      {/* Enhanced Search and Filter */}
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
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={handleClearSearch}
          variant="outline"
          disabled={loading}
        >
          Clear
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedDrafts.length > 0 && (
        <Card className="border-0 shadow-lg bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-800">
                  {selectedDrafts.length} product
                  {selectedDrafts.length !== 1 ? "s" : ""} selected
                </span>
                <Button
                  onClick={handleBulkApprove}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
                <Button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject All
                </Button>
              </div>
              <Button
                onClick={() => setSelectedDrafts([])}
                variant="ghost"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>

            {showBulkActions && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <Label htmlFor="bulkRejectReason">Rejection Reason</Label>
                <textarea
                  id="bulkRejectReason"
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                  placeholder="Provide reason for rejecting selected products..."
                  className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <div className="flex space-x-2 mt-3">
                  <Button
                    onClick={handleBulkReject}
                    disabled={loading || !bulkRejectReason.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Selected
                  </Button>
                  <Button
                    onClick={() => setShowBulkActions(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Product Approvals */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Product Approvals ({drafts.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center"
              >
                {selectedDrafts.length === drafts.length ? (
                  <CheckSquare className="h-4 w-4 mr-2" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                {selectedDrafts.length === drafts.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </div>
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
                    <Checkbox
                      checked={selectedDrafts.includes(draft.id)}
                      onCheckedChange={() => handleSelectDraft(draft.id)}
                    />
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
                          ₹{draft.pricePerUnit.toFixed(2)} per{" "}
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
                        View
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
