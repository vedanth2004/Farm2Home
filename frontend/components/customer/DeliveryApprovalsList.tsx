"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  RefreshCw,
  HandHeart,
} from "lucide-react";

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

interface DeliveryApprovalsListProps {
  approvals: DeliveryApproval[];
}

export default function DeliveryApprovalsList({
  approvals,
}: DeliveryApprovalsListProps) {
  const [processingApproval, setProcessingApproval] = useState<string | null>(
    null,
  );
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>(
    {},
  );

  const handleApprovalAction = async (
    approvalId: string,
    action: "approve" | "reject",
  ) => {
    setProcessingApproval(approvalId);
    try {
      const response = await fetch("/api/delivery-approvals/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvalId,
          action,
          customerNotes: customerNotes[approvalId] || "",
        }),
      });

      if (response.ok) {
        alert(`Delivery ${action}d successfully!`);
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(errorData.error || `Failed to ${action} delivery`);
      }
    } catch (error) {
      console.error(`Error ${action}ing delivery:`, error);
      alert(`Error ${action}ing delivery`);
    } finally {
      setProcessingApproval(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (approvals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
          <HandHeart className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Delivery Approvals
        </h3>
        <p className="text-gray-600">
          You don&apos;t have any pending delivery approval requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {approvals.map((approval) => (
        <Card key={approval.id} className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <HandHeart className="h-5 w-5 text-purple-600" />
                <span>Delivery Completion Confirmation</span>
              </CardTitle>
              {getStatusBadge(approval.status)}
            </div>
            <div className="text-sm text-gray-600">
              Requested on {formatDate(approval.requestedAt)}
              {approval.approvedAt && (
                <span className="ml-4 text-green-600">
                  Approved on {formatDate(approval.approvedAt)}
                </span>
              )}
              {approval.rejectedAt && (
                <span className="ml-4 text-red-600">
                  Rejected on {formatDate(approval.rejectedAt)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Order Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Order #{approval.pickupJob.order.id.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {formatCurrency(approval.pickupJob.order.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {formatDate(approval.pickupJob.order.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {approval.pickupJob.order.shippingAddress?.line1 ||
                        "Address not available"}
                      ,{" "}
                      {approval.pickupJob.order.shippingAddress?.city ||
                        "City not available"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {approval.pickupJob.order.shippingAddress?.state ||
                        "State not available"}{" "}
                      -{" "}
                      {approval.pickupJob.order.shippingAddress?.postalCode ||
                        "Pincode not available"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup Agent Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Pickup Agent Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {approval.pickupJob.agent.user.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {approval.pickupJob.agent.user.email}
                    </span>
                  </div>
                  {approval.pickupJob.agent.user.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {approval.pickupJob.agent.user.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
              <div className="space-y-2">
                {approval.pickupJob.order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {item.listing.product.photos.length > 0 && (
                        <Image
                          src={item.listing.product.photos[0]}
                          alt={item.listing.product.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.listing.product.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          by{" "}
                          {item.listing.product.farmer?.user?.name ||
                            "Unknown Farmer"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity} •{" "}
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Notes */}
            {approval.agentNotes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Agent Notes
                </h4>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{approval.agentNotes}</p>
                </div>
              </div>
            )}

            {/* Customer Notes */}
            {approval.customerNotes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Your Notes</h4>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    {approval.customerNotes}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {approval.status === "PENDING" && (
              <div className="border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`notes-${approval.id}`}>
                      Add Notes (Optional)
                    </Label>
                    <Textarea
                      id={`notes-${approval.id}`}
                      placeholder="Add any notes about the delivery..."
                      value={customerNotes[approval.id] || ""}
                      onChange={(e) =>
                        setCustomerNotes({
                          ...customerNotes,
                          [approval.id]: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button
                      onClick={() =>
                        handleApprovalAction(approval.id, "approve")
                      }
                      disabled={processingApproval === approval.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingApproval === approval.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Confirm Delivery & Payment
                    </Button>
                    <Button
                      onClick={() =>
                        handleApprovalAction(approval.id, "reject")
                      }
                      disabled={processingApproval === approval.id}
                      variant="destructive"
                    >
                      {processingApproval === approval.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Delivery Not Complete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
