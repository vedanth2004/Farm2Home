/**
 * Admin Approvals Page
 * Review and approve/reject farmer, agent, and CR registration requests
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Truck,
  MapPin,
  User,
} from "lucide-react";

interface ApprovalRequest {
  id: string;
  userId: string;
  displayId: string;
  role: string;
  status: string;
  requestedAt: string;
  user: {
    id: string;
    displayId: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
    farmerProfile: {
      govtId: string | null;
      upiId: string | null;
    } | null;
    pickupAgentProfile: {
      vehicleType: string;
      serviceAreas: string[];
    } | null;
    crProfile: {
      serviceAreas: string[];
    } | null;
    addresses?: Array<{
      line1: string;
      city: string;
      state: string;
      postalCode: string;
    }>;
  };
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/approvals?status=PENDING");
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }
      const result = await response.json();
      if (result.success) {
        setApprovals(result.data || []);
      } else {
        throw new Error(result.error || "Failed to fetch approvals");
      }
    } catch (err: any) {
      console.error("Error fetching approvals:", err);
      setError(err.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (requestId: string) => {
    if (!confirm("Are you sure you want to approve this request?")) {
      return;
    }

    setProcessing(requestId);
    setError(null);
    try {
      const response = await fetch("/api/admin/approvals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: "APPROVED",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve request");
      }

      // Refresh the list
      await fetchApprovals();
      router.refresh();
    } catch (err: any) {
      console.error("Error approving request:", err);
      setError(err.message || "Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this request?")) {
      return;
    }

    setProcessing(requestId);
    setError(null);
    try {
      const response = await fetch("/api/admin/approvals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: "REJECTED",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject request");
      }

      // Refresh the list
      await fetchApprovals();
      router.refresh();
    } catch (err: any) {
      console.error("Error rejecting request:", err);
      setError(err.message || "Failed to reject request");
    } finally {
      setProcessing(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "FARMER":
        return <Users className="h-5 w-5" />;
      case "PICKUP_AGENT":
        return <Truck className="h-5 w-5" />;
      case "CR":
        return <MapPin className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "FARMER":
        return "bg-green-100 text-green-800";
      case "PICKUP_AGENT":
        return "bg-blue-100 text-blue-800";
      case "CR":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-2">
          Review and approve new farmer, agent, and CR registration requests
        </p>
      </div>

      {error && (
        <Card className="border-0 shadow-lg border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading approvals...</p>
          </CardContent>
        </Card>
      ) : approvals.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              No pending approval requests
            </p>
            <p className="text-gray-500 text-sm mt-2">
              All registration requests have been processed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {approvals.map((approval) => (
            <Card key={approval.id} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getRoleIcon(approval.role)}
                    <div>
                      <CardTitle className="text-xl">
                        {approval.user.displayId}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {approval.user.name} • {approval.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge className={getRoleBadgeColor(approval.role)}>
                    {approval.role.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* User Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      User Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Display ID:</span>
                        <span className="font-mono font-bold">
                          {approval.user.displayId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span>{approval.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span>{approval.user.phone || "Not provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registered:</span>
                        <span>
                          {new Date(
                            approval.user.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    {approval.user.addresses &&
                      approval.user.addresses.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Address
                          </h4>
                          <p className="text-sm text-gray-600">
                            {approval.user.addresses[0].line1}
                          </p>
                          <p className="text-sm text-gray-600">
                            {approval.user.addresses[0].city},{" "}
                            {approval.user.addresses[0].state} -{" "}
                            {approval.user.addresses[0].postalCode}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Role-Specific Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      Role-Specific Details
                    </h3>

                    {approval.user.farmerProfile && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Govt ID:</span>
                          <span>
                            {approval.user.farmerProfile.govtId ||
                              "Not provided"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">UPI ID:</span>
                          <span>
                            {approval.user.farmerProfile.upiId ||
                              "Not provided"}
                          </span>
                        </div>
                      </div>
                    )}

                    {approval.user.pickupAgentProfile && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle Type:</span>
                          <span>
                            {approval.user.pickupAgentProfile.vehicleType}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Service Areas:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {approval.user.pickupAgentProfile.serviceAreas.map(
                              (area: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {area}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {approval.user.crProfile && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Service Areas:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {approval.user.crProfile.serviceAreas.map(
                              (area: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {area}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-6 border-t flex items-center justify-end space-x-3">
                  <Button
                    onClick={() => handleReject(approval.id)}
                    variant="outline"
                    disabled={processing === approval.id}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {processing === approval.id ? "Processing..." : "Reject"}
                  </Button>
                  <Button
                    onClick={() => handleApprove(approval.id)}
                    disabled={processing === approval.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {processing === approval.id ? "Processing..." : "Approve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {approvals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Farmers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {approvals.filter((a) => a.role === "FARMER").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Agents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {approvals.filter((a) => a.role === "PICKUP_AGENT").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
