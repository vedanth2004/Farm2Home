"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  Truck,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Filter,
  Plus,
} from "lucide-react";

interface Payout {
  id: string;
  beneficiaryType: "FARMER" | "CR" | "PICKUP_AGENT";
  beneficiaryId: string;
  amount: number;
  status: "PENDING" | "SCHEDULED" | "PAID" | "REJECTED";
  reference?: string;
  requestType?: "MANUAL" | "FARMER_REQUEST";
  farmerId?: string;
  requestedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  beneficiaryName: string;
  beneficiaryEmail: string;
}

interface PayoutManagementProps {
  initialPayouts: Payout[];
}

export default function PayoutManagement({
  initialPayouts,
}: PayoutManagementProps) {
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPayout, setNewPayout] = useState({
    beneficiaryType: "FARMER" as "FARMER" | "CR" | "PICKUP_AGENT",
    beneficiaryId: "",
    amount: "",
    reference: "",
  });

  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch =
      payout.beneficiaryName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      payout.beneficiaryEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payout.status === statusFilter;
    const matchesType =
      typeFilter === "all" || payout.beneficiaryType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="text-green-600 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "FARMER":
        return <Users className="h-4 w-4 text-green-600" />;
      case "CR":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "PICKUP_AGENT":
        return <Truck className="h-4 w-4 text-purple-600" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "FARMER":
        return "Farmer";
      case "CR":
        return "Community Rep";
      case "PICKUP_AGENT":
        return "Pickup Agent";
      default:
        return type;
    }
  };

  const handleStatusUpdate = async (
    payoutId: string,
    newStatus: string,
    reference?: string,
  ) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          reference: reference || null,
        }),
      });

      if (response.ok) {
        setPayouts(
          payouts.map((payout) =>
            payout.id === payoutId
              ? {
                  ...payout,
                  status: newStatus as any,
                  reference: reference || payout.reference,
                }
              : payout,
          ),
        );
        setSuccess("Payout status updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to update payout status");
      }
    } catch (error) {
      setError("Failed to update payout status");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayout = async (payoutId: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payouts/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payoutId }),
      });

      if (response.ok) {
        const result = await response.json();
        setPayouts(
          payouts.map((payout) =>
            payout.id === payoutId
              ? {
                  ...payout,
                  status: "PAID",
                  approvedAt: new Date().toISOString(),
                }
              : payout,
          ),
        );
        setSuccess("Payout approved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const error = await response.json();
        setError(error.error || "Failed to approve payout");
      }
    } catch (error) {
      setError("Failed to approve payout");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payouts/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payoutId, reason }),
      });

      if (response.ok) {
        setPayouts(
          payouts.map((payout) =>
            payout.id === payoutId
              ? {
                  ...payout,
                  status: "REJECTED",
                  rejectedAt: new Date().toISOString(),
                  reference: reason,
                }
              : payout,
          ),
        );
        setSuccess("Payout rejected successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const error = await response.json();
        setError(error.error || "Failed to reject payout");
      }
    } catch (error) {
      setError("Failed to reject payout");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!newPayout.beneficiaryId || !newPayout.amount) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newPayout,
          amount: parseFloat(newPayout.amount),
        }),
      });

      if (response.ok) {
        const newPayoutData = await response.json();
        setPayouts([newPayoutData, ...payouts]);
        setNewPayout({
          beneficiaryType: "FARMER",
          beneficiaryId: "",
          amount: "",
          reference: "",
        });
        setShowCreateForm(false);
        setSuccess("Payout created successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to create payout");
      }
    } catch (error) {
      setError("Failed to create payout");
    } finally {
      setLoading(false);
    }
  };

  const totalPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalScheduled = payouts
    .filter((p) => p.status === "SCHEDULED")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Payout Management
          </h2>
          <p className="text-gray-600">
            Manage payouts for farmers, CRs, and delivery agents
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Payout
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Payouts
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {payouts.filter((p) => p.status === "PENDING").length} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Scheduled Payouts
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{totalScheduled.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {payouts.filter((p) => p.status === "SCHEDULED").length} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Paid Out
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {payouts.filter((p) => p.status === "PAID").length} payouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FARMER">Farmers</SelectItem>
                  <SelectItem value="CR">Community Reps</SelectItem>
                  <SelectItem value="PICKUP_AGENT">Pickup Agents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle>Payouts ({filteredPayouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No payouts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(payout.beneficiaryType)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {payout.beneficiaryName}
                        </p>
                        {payout.requestType === "FARMER_REQUEST" && (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 text-xs"
                          >
                            Farmer Request
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {payout.beneficiaryEmail}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getTypeLabel(payout.beneficiaryType)} •{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(payout.createdAt))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{payout.amount.toLocaleString()}
                      </p>
                      {payout.reference && (
                        <p className="text-xs text-gray-500">
                          Ref: {payout.reference}
                        </p>
                      )}
                    </div>

                    {getStatusBadge(payout.status)}

                    <div className="flex space-x-2">
                      {payout.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() =>
                              handleStatusUpdate(payout.id, "SCHEDULED")
                            }
                            disabled={loading}
                          >
                            Schedule
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprovePayout(payout.id)}
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleRejectPayout(payout.id)}
                            disabled={loading}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {payout.status === "SCHEDULED" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusUpdate(payout.id, "PAID")}
                          disabled={loading}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payout Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Payout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="beneficiaryType">Beneficiary Type</Label>
                <Select
                  value={newPayout.beneficiaryType}
                  onValueChange={(value: any) =>
                    setNewPayout({ ...newPayout, beneficiaryType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FARMER">Farmer</SelectItem>
                    <SelectItem value="CR">Community Rep</SelectItem>
                    <SelectItem value="PICKUP_AGENT">Pickup Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="beneficiaryId">Beneficiary ID</Label>
                <Input
                  id="beneficiaryId"
                  value={newPayout.beneficiaryId}
                  onChange={(e) =>
                    setNewPayout({
                      ...newPayout,
                      beneficiaryId: e.target.value,
                    })
                  }
                  placeholder="Enter beneficiary ID"
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newPayout.amount}
                  onChange={(e) =>
                    setNewPayout({ ...newPayout, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Textarea
                  id="reference"
                  value={newPayout.reference}
                  onChange={(e) =>
                    setNewPayout({ ...newPayout, reference: e.target.value })
                  }
                  placeholder="Payment reference or notes"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePayout}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Create Payout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
