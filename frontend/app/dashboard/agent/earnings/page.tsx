import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Download,
  Filter,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getPickupAgentEarnings() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get agent profile
    const agentProfile = await prisma.pickupAgentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!agentProfile) return null;

    // Get earnings/payouts
    const payouts = await prisma.payout.findMany({
      where: {
        beneficiaryType: "PICKUP_AGENT",
        beneficiaryId: agentProfile.id,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate metrics
    const totalEarnings = payouts.reduce(
      (sum, payout) => sum + Number(payout.amount),
      0,
    );
    const paidEarnings = payouts
      .filter((payout) => payout.status === "PAID")
      .reduce((sum, payout) => sum + Number(payout.amount), 0);
    const pendingEarnings = payouts
      .filter((payout) => payout.status === "PENDING")
      .reduce((sum, payout) => sum + Number(payout.amount), 0);

    // Get recent completed jobs for context
    const recentJobs = await prisma.pickupJob.findMany({
      where: {
        agentId: agentProfile.id,
        status: "HANDED_TO_CR",
      },
      include: {
        order: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return {
      agentProfile,
      payouts,
      metrics: {
        totalEarnings,
        paidEarnings,
        pendingEarnings,
        totalPayouts: payouts.length,
      },
      recentJobs,
    };
  } catch (error) {
    console.error("Error fetching pickup agent earnings:", error);
    return null;
  }
}

export default async function PickupAgentEarningsPage() {
  await requirePermission("read:payouts");

  const data = await getPickupAgentEarnings();

  if (!data) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Error Loading Earnings
        </h3>
        <p className="text-gray-600">
          There was an error loading your earnings data. Please try again.
        </p>
      </div>
    );
  }

  const { agentProfile, payouts, metrics, recentJobs } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "REJECTED":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "SCHEDULED":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/agent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
            <p className="text-gray-600">
              Track your pickup earnings and payouts
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{metrics.totalEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{metrics.paidEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{metrics.pendingEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Payouts
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalPayouts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Payout History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payouts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payouts.slice(0, 5).map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(payout.status)}
                      <div>
                        <h4 className="font-medium">
                          ₹{Number(payout.amount).toFixed(2)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }).format(new Date(payout.createdAt))}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(payout.status)}>
                        {payout.status}
                      </Badge>
                      {payout.reference && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ref: {payout.reference}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Completed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No completed jobs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">Job #{job.id.slice(-8)}</h4>
                      <p className="text-sm text-gray-600">
                        Order #{job.order.id.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Completed:{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(job.updatedAt))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ₹{Number(job.order.totalAmount).toFixed(2)}
                      </p>
                      <Badge className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Payouts Yet
              </h3>
              <p className="text-gray-600">
                Complete pickup jobs to start earning!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Reference</th>
                    <th className="text-left py-3 px-4">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b">
                      <td className="py-3 px-4">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ₹{Number(payout.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {payout.reference || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {payout.requestType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
