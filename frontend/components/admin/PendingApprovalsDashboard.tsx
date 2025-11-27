"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Eye } from "lucide-react";
import { approveProduct, rejectProduct } from "@/lib/actions/product-actions";
import ProductApprovalModal from "./ProductApprovalModal";

interface PendingApproval {
  id: string;
  pricePerUnit: number | any; // Can be Prisma Decimal (backward compatibility)
  farmerPrice: number | any; // Farmer's price
  storePrice?: number | any; // Store price (set by admin)
  availableQty: number;
  product: {
    name: string;
    category: string;
    baseUnit: string;
    farmer?: {
      user?: {
        name: string;
      };
    };
  };
}

interface PendingApprovalsDashboardProps {
  initialApprovals: PendingApproval[];
}

export default function PendingApprovalsDashboard({
  initialApprovals,
}: PendingApprovalsDashboardProps) {
  const [approvals, setApprovals] =
    useState<PendingApproval[]>(initialApprovals);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<PendingApproval | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApprove = async (
    draftId: string,
    storePrice: number,
    margin: number,
  ) => {
    setLoading(draftId);
    setError("");
    try {
      // Update the draft with store price and margin
      const response = await fetch(`/api/products/drafts/${draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storePrice,
          margin,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update product pricing");
      }

      const result = await approveProduct(draftId);
      if (result.success) {
        setApprovals(approvals.filter((approval) => approval.id !== draftId));
        setSuccess("Product approved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to approve product");
      }
    } catch (error) {
      setError("Failed to approve product");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (draftId: string, reason: string) => {
    setLoading(draftId);
    setError("");
    try {
      const result = await rejectProduct(draftId, reason);
      if (result.success) {
        setApprovals(approvals.filter((approval) => approval.id !== draftId));
        setSuccess("Product rejected successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to reject product");
      }
    } catch (error) {
      setError("Failed to reject product");
    } finally {
      setLoading(null);
    }
  };

  const handleOpenModal = (product: PendingApproval) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-4">
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
      {approvals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
          <p>No pending approvals</p>
        </div>
      ) : (
        approvals.map((draft) => (
          <div
            key={draft.id}
            className="flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{draft.product.name}</p>
              <p className="text-sm text-gray-600">
                by {draft.product.farmer?.user?.name || "Unknown Farmer"}
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  Farmer Price: ₹
                  {Number(draft.farmerPrice || draft.pricePerUnit).toFixed(2)}{" "}
                  per {draft.product.baseUnit}
                </p>
                {draft.storePrice && (
                  <p className="text-green-600">
                    Store Price: ₹{Number(draft.storePrice).toFixed(2)} per{" "}
                    {draft.product.baseUnit}
                  </p>
                )}
                <p>
                  Available: {draft.availableQty} {draft.product.baseUnit}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleOpenModal(draft)}
                disabled={loading === draft.id}
              >
                <Eye className="h-4 w-4 mr-1" />
                Review
              </Button>
            </div>
          </div>
        ))
      )}

      {/* Product Approval Modal */}
      {selectedProduct && (
        <ProductApprovalModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          product={{
            id: selectedProduct.id,
            name: selectedProduct.product.name,
            category: (selectedProduct.product as any).category,
            baseUnit: selectedProduct.product.baseUnit,
            farmerPrice: Number(
              selectedProduct.farmerPrice || selectedProduct.pricePerUnit,
            ),
            storePrice: selectedProduct.storePrice
              ? Number(selectedProduct.storePrice)
              : undefined,
            availableQty: selectedProduct.availableQty,
            farmer: selectedProduct.product.farmer,
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
