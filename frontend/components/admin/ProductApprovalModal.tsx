"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Calculator,
  Package,
} from "lucide-react";

interface ProductApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    category: string;
    baseUnit: string;
    farmerPrice: number;
    storePrice?: number;
    availableQty: number;
    farmer?: {
      user?: {
        name: string;
      };
    };
  };
  onApprove: (
    draftId: string,
    storePrice: number,
    margin: number,
  ) => Promise<void>;
  onReject: (draftId: string, reason: string) => Promise<void>;
}

export default function ProductApprovalModal({
  isOpen,
  onClose,
  product,
  onApprove,
  onReject,
}: ProductApprovalModalProps) {
  const [storePrice, setStorePrice] = useState(
    product.storePrice || product.farmerPrice,
  );
  const [margin, setMargin] = useState(0);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const calculateMargin = (farmerPrice: number, storePrice: number) => {
    if (farmerPrice === 0) return 0;
    return ((storePrice - farmerPrice) / farmerPrice) * 100;
  };

  const handleStorePriceChange = (value: string) => {
    const newStorePrice = parseFloat(value) || 0;
    setStorePrice(newStorePrice);
    setMargin(calculateMargin(product.farmerPrice, newStorePrice));
  };

  const handleMarginChange = (value: string) => {
    const newMargin = parseFloat(value) || 0;
    setMargin(newMargin);
    const newStorePrice = product.farmerPrice * (1 + newMargin / 100);
    setStorePrice(newStorePrice);
  };

  const handleApprove = async () => {
    setLoading(true);
    setAction("approve");
    try {
      await onApprove(product.id, storePrice, margin);
      onClose();
    } catch (error) {
      console.error("Error approving product:", error);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;

    setLoading(true);
    setAction("reject");
    try {
      await onReject(product.id, rejectReason);
      onClose();
    } catch (error) {
      console.error("Error rejecting product:", error);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Review Product: {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Product Name
                </Label>
                <p className="text-lg font-semibold">{product.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Category
                </Label>
                <p className="text-lg">{product.category}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Farmer
                </Label>
                <p className="text-lg">
                  {product.farmer?.user?.name || "Unknown"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Available Quantity
                </Label>
                <p className="text-lg">
                  {product.availableQty} {product.baseUnit}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pricing Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="farmerPrice">Farmer&apos;s Price (₹)</Label>
                <Input
                  id="farmerPrice"
                  value={product.farmerPrice}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Amount the farmer will receive per unit
                </p>
              </div>

              <div>
                <Label htmlFor="storePrice">Store Price (₹)</Label>
                <Input
                  id="storePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={storePrice}
                  onChange={(e) => handleStorePriceChange(e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Final selling price to customers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="margin">Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  step="0.01"
                  min="0"
                  value={margin}
                  onChange={(e) => handleMarginChange(e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Platform margin percentage
                </p>
              </div>

              <div>
                <Label>Platform Fee (₹)</Label>
                <Input
                  value={(storePrice - product.farmerPrice).toFixed(2)}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Amount retained by platform
                </p>
              </div>
            </div>
          </div>

          {/* Reject Reason */}
          <div className="space-y-2">
            <Label htmlFor="rejectReason">
              Rejection Reason (if rejecting)
            </Label>
            <Textarea
              id="rejectReason"
              placeholder="Please provide a reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleReject}
            disabled={loading || !rejectReason.trim()}
          >
            {loading && action === "reject" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>

          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleApprove}
            disabled={loading || storePrice <= 0}
          >
            {loading && action === "approve" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
