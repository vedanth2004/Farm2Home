"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { AccountStatus, UserRole } from "@prisma/client";

interface ApprovalUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  farmerProfile?: {
    govtId: string | null;
    upiId: string | null;
  } | null;
  pickupAgentProfile?: {
    vehicleType: string | null;
    serviceAreas: string[];
  } | null;
  crProfile?: {
    serviceAreas: string[];
  } | null;
}

export default function AccountApprovalRequests() {
  const [approvals, setApprovals] = useState<ApprovalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AccountStatus | "ALL">("ALL");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") {
        params.append("status", filter);
      }

      const response = await fetch(`/api/admin/approvals?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }

      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
  }, [filter, fetchApprovals]);

  const handleApprove = async (userId: string) => {
    setProcessing(userId);
    try {
      const response = await fetch(`/api/admin/approvals/${userId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve");
      }

      // Refresh the list
      await fetchApprovals();
    } catch (error: any) {
      alert(error.message || "Failed to approve account");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm("Are you sure you want to reject this account request?")) {
      return;
    }

    const reason = prompt("Reason for rejection (optional):");
    setProcessing(userId);

    try {
      const response = await fetch(`/api/admin/approvals/${userId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reason || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject");
      }

      // Refresh the list
      await fetchApprovals();
    } catch (error: any) {
      alert(error.message || "Failed to reject account");
    } finally {
      setProcessing(null);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.FARMER:
        return "bg-green-100 text-green-800";
      case UserRole.PICKUP_AGENT:
        return "bg-blue-100 text-blue-800";
      case UserRole.CR:
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.PENDING_VERIFICATION:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case AccountStatus.APPROVED:
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case AccountStatus.REJECTED:
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const pendingCount = approvals.filter(
    (a) => a.accountStatus === AccountStatus.PENDING_VERIFICATION,
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Approval Requests
            </CardTitle>
            <CardDescription>
              Review and approve new Farmer, Agent, and CR account registrations
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovals}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={filter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("ALL")}
          >
            All ({approvals.length})
          </Button>
          <Button
            variant={
              filter === AccountStatus.PENDING_VERIFICATION
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => setFilter(AccountStatus.PENDING_VERIFICATION)}
            className="relative"
          >
            <Clock className="h-4 w-4 mr-1" />
            Pending
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            variant={filter === AccountStatus.APPROVED ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(AccountStatus.APPROVED)}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approved
          </Button>
          <Button
            variant={filter === AccountStatus.REJECTED ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(AccountStatus.REJECTED)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No approval requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <Card key={approval.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-lg">
                          {approval.name}
                        </h3>
                        <Badge className={getRoleBadgeColor(approval.role)}>
                          {approval.role.replace("_", " ")}
                        </Badge>
                        {getStatusBadge(approval.accountStatus)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{approval.email}</span>
                        </div>
                        {approval.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{approval.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Registered: {formatDate(approval.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Role-specific information */}
                      {approval.role === UserRole.FARMER &&
                        approval.farmerProfile && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-800 mb-1">
                              Farmer Information
                            </p>
                            <div className="text-sm text-green-700 space-y-1">
                              {approval.farmerProfile.govtId && (
                                <p>Govt ID: {approval.farmerProfile.govtId}</p>
                              )}
                              {approval.farmerProfile.upiId && (
                                <p>UPI ID: {approval.farmerProfile.upiId}</p>
                              )}
                            </div>
                          </div>
                        )}

                      {approval.role === UserRole.PICKUP_AGENT &&
                        approval.pickupAgentProfile && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800 mb-1">
                              Agent Information
                            </p>
                            <div className="text-sm text-blue-700 space-y-1">
                              {approval.pickupAgentProfile.vehicleType && (
                                <p>
                                  Vehicle:{" "}
                                  {approval.pickupAgentProfile.vehicleType}
                                </p>
                              )}
                              {approval.pickupAgentProfile.serviceAreas.length >
                                0 && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    Areas:{" "}
                                    {approval.pickupAgentProfile.serviceAreas.join(
                                      ", ",
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {approval.role === UserRole.CR && approval.crProfile && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm font-medium text-purple-800 mb-1">
                            CR Information
                          </p>
                          <div className="text-sm text-purple-700 space-y-1">
                            {approval.crProfile.serviceAreas.length > 0 && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  Service Areas:{" "}
                                  {approval.crProfile.serviceAreas.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {approval.accountStatus ===
                      AccountStatus.PENDING_VERIFICATION && (
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(approval.id)}
                          disabled={processing === approval.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(approval.id)}
                          disabled={processing === approval.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        {processing === approval.id && (
                          <div className="text-xs text-gray-500">
                            Processing...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
