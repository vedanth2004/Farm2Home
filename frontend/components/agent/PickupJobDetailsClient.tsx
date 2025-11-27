"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Navigation,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  RefreshCw,
  HandHeart,
} from "lucide-react";

interface PickupJobDetailsProps {
  pickupJob: {
    id: string;
    status: string;
    createdAt: string;
    order: {
      id: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
      createdAt: string;
      customer?: {
        name: string;
        email: string;
        phone?: string;
      };
      shippingAddress: {
        line1: string;
        city: string;
        postalCode: string;
      };
      items: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        listing: {
          product: {
            name: string;
            description: string;
            farmer: {
              user: {
                name: string;
              };
            };
          };
        };
      }>;
    };
  };
}

export default function PickupJobDetailsClient({
  pickupJob,
}: PickupJobDetailsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState("");
  const [showEtaForm, setShowEtaForm] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [agentNotes, setAgentNotes] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);

  const handlePickupJobStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    try {
      console.log(
        "Updating pickup job status:",
        pickupJob.id,
        "to:",
        newStatus,
      );

      const response = await fetch(`/api/pickup-jobs/${pickupJob.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Pickup job status update successful:", result);
        // Refresh the page to show updated status
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error("Failed to update pickup job status:", errorData);
        alert(
          `Failed to update pickup job status: ${errorData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error updating pickup job status:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryApprovalRequest = async () => {
    setApprovalLoading(true);
    try {
      const response = await fetch("/api/delivery-approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupJobId: pickupJob.id,
          agentNotes: agentNotes,
        }),
      });

      if (response.ok) {
        alert("Delivery approval requested successfully!");
        setShowApprovalForm(false);
        setAgentNotes("");
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to request delivery approval");
      }
    } catch (error) {
      console.error("Error requesting delivery approval:", error);
      alert("Error requesting delivery approval");
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleEtaUpdate = async () => {
    if (!eta.trim()) {
      alert("Please enter an ETA");
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just show a success message
      // In a real implementation, you'd save this to the database
      alert(`ETA updated to: ${eta}`);
      setShowEtaForm(false);
      setEta("");
    } catch (error) {
      console.error("Error updating ETA:", error);
      alert("Failed to update ETA. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "HANDED_TO_CR":
        return "bg-green-100 text-green-800";
      case "PICKED_UP":
        return "bg-blue-100 text-blue-800";
      case "ACCEPTED":
        return "bg-yellow-100 text-yellow-800";
      case "REQUESTED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getOrderStatusColor = (status: string) => {
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

  const { order } = pickupJob;

  return (
    <div className="space-y-6">
      {/* Job Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Job #{pickupJob.id.slice(-8)}</span>
            <Badge className={getStatusColor(pickupJob.status)}>
              {pickupJob.status.replace("_", " ")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Order Information
              </h4>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Order ID:</strong> #{order.id.slice(-8)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Total Amount:</strong> ₹
                  {Number(order.totalAmount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Payment Status:</strong> {order.paymentStatus}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Order Status:</strong>
                  <Badge
                    className={`ml-2 ${getOrderStatusColor(order.status)}`}
                  >
                    {order.status.replace("_", " ")}
                  </Badge>
                </p>
                <p className="text-sm text-gray-600">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Created:{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(order.createdAt))}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Customer Information
              </h4>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <User className="h-4 w-4 inline mr-1" />
                  {order.customer?.name || "Unknown Customer"}
                </p>
                <p className="text-sm text-gray-600">
                  <Mail className="h-4 w-4 inline mr-1" />
                  {order.customer?.email || "No email provided"}
                </p>
                {order.customer?.phone && (
                  <p className="text-sm text-gray-600">
                    <Phone className="h-4 w-4 inline mr-1" />
                    {order.customer.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress?.line1 || "Address not available"}
                </p>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress?.city || "City not available"},{" "}
                  {order.shippingAddress?.postalCode ||
                    "Postal code not available"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items to Pickup */}
      <Card>
        <CardHeader>
          <CardTitle>Items to Pickup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{item.listing.product.name}</h4>
                  <p className="text-sm text-gray-600">
                    {item.listing.product.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    by{" "}
                    {item.listing.product.farmer?.user?.name ||
                      "Unknown Farmer"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Qty: {item.quantity}</p>
                  <p className="text-sm text-gray-600">
                    ₹{Number(item.unitPrice).toFixed(2)} each
                  </p>
                  <p className="text-sm font-medium">
                    Total: ₹
                    {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Pickup Job Status:</span>
              <Badge
                variant="outline"
                className="text-blue-600 border-blue-600"
              >
                {pickupJob.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Order Status:</span>
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                {pickupJob.order.status}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              <p>
                To request delivery approval, the pickup job must be in
                &quot;PICKED_UP&quot; status.
              </p>
              <p>
                Current workflow: REQUESTED → ACCEPTED → PICKED_UP → Request
                Delivery Approval
              </p>
              <p>
                Customer will confirm delivery completion and payment receipt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-4">
              {(pickupJob.status === "REQUESTED" ||
                pickupJob.status === "ACCEPTED") && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handlePickupJobStatusUpdate("PICKED_UP")}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4 mr-2" />
                  )}
                  Mark as Picked Up
                </Button>
              )}

              {pickupJob.status === "PICKED_UP" && (
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowApprovalForm(!showApprovalForm)}
                  disabled={approvalLoading}
                >
                  {approvalLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <HandHeart className="h-4 w-4 mr-2" />
                  )}
                  Request Delivery Approval
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setShowEtaForm(!showEtaForm)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Update ETA
              </Button>
            </div>

            {showEtaForm && (
              <div className="border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="eta">Estimated Time of Arrival</Label>
                    <Input
                      id="eta"
                      type="datetime-local"
                      value={eta}
                      onChange={(e) => setEta(e.target.value)}
                      placeholder="Select ETA"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleEtaUpdate}
                      disabled={loading || !eta.trim()}
                      size="sm"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4 mr-2" />
                      )}
                      Update ETA
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEtaForm(false);
                        setEta("");
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {showApprovalForm && (
              <div className="border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="agentNotes">
                      Notes for Customer (Optional)
                    </Label>
                    <textarea
                      id="agentNotes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Add any notes about the delivery..."
                      value={agentNotes}
                      onChange={(e) => setAgentNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleDeliveryApprovalRequest}
                      disabled={approvalLoading}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {approvalLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <HandHeart className="h-4 w-4 mr-2" />
                      )}
                      Request Approval
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowApprovalForm(false);
                        setAgentNotes("");
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
