import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PayoutsHeader from "@/components/farmer/PayoutsHeader";

async function getFarmerPayouts() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Get or create farmer profile
    let farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!farmerProfile) {
      // Create farmer profile if it doesn't exist
      farmerProfile = await prisma.farmerProfile.create({
        data: {
          userId: session.user.id,
          verified: true,
          upiId: null,
        },
      });
    }

    // Get earnings data using the new Earnings model
    const earnings = await (prisma as any).earnings.findMany({
      where: { farmerId: farmerProfile.id },
      include: {
        order: {
          include: {
            customer: { select: { name: true, email: true } },
          },
        },
        orderItem: {
          include: {
            listing: {
              include: {
                product: { select: { name: true, baseUnit: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate earnings metrics
    const totalEarnings = earnings.reduce(
      (sum: number, earning: any) => sum + Number(earning.amount),
      0,
    );
    const pendingEarnings = earnings
      .filter((e: any) => e.status === "PENDING")
      .reduce((sum: number, earning: any) => sum + Number(earning.amount), 0);
    const paidEarnings = earnings
      .filter((e: any) => e.status === "PAID")
      .reduce((sum: number, earning: any) => sum + Number(earning.amount), 0);

    // Get payout history
    const payouts = await (prisma as any).payout.findMany({
      where: { farmerId: farmerProfile.id },
      orderBy: { requestedAt: "desc" },
    });

    // Get this month's earnings
    const thisMonth = new Date();
    thisMonth.setDate(1);

    const thisMonthEarnings = earnings
      .filter((e: any) => {
        const earningDate = new Date(e.createdAt);
        return earningDate >= thisMonth;
      })
      .reduce((sum: number, earning: any) => sum + Number(earning.amount), 0);

    // Get last month's earnings for comparison
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    const lastMonthEnd = new Date(lastMonth);
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
    lastMonthEnd.setDate(0);

    const lastMonthEarnings = earnings
      .filter((e: any) => {
        const earningDate = new Date(e.createdAt);
        return earningDate >= lastMonth && earningDate <= lastMonthEnd;
      })
      .reduce((sum: number, earning: any) => sum + Number(earning.amount), 0);

    const earningsGrowth =
      lastMonthEarnings > 0
        ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
        : 0;

    return {
      totalEarnings,
      pendingPayouts: pendingEarnings,
      paidOut: paidEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      earningsGrowth,
      farmerProfile,
      payouts,
      earnings: earnings.slice(0, 10), // Recent earnings
    };
  } catch (error) {
    console.error("Error fetching farmer payouts:", error);
    return {
      totalEarnings: 0,
      pendingPayouts: 0,
      paidOut: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
      earningsGrowth: 0,
      farmerProfile: null,
      payouts: [],
      earnings: [],
    };
  }
}

export default async function FarmerPayoutsPage() {
  await requirePermission("read:payouts");

  const payoutData = await getFarmerPayouts();

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4 rotate-180" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payouts & Earnings
          </h1>
          <p className="text-gray-600">
            Track your earnings and payout history
          </p>
        </div>
        <PayoutsHeader />
      </div>

      {/* Earnings Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(payoutData?.totalEarnings ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">All time earnings</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Payouts
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(payoutData?.pendingPayouts ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Paid Out
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(payoutData?.paidOut ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Successfully paid</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(payoutData?.thisMonthEarnings ?? 0).toLocaleString()}
            </div>
            <p
              className={`text-xs flex items-center ${getGrowthColor(payoutData?.earningsGrowth ?? 0)}`}
            >
              {getGrowthIcon(payoutData?.earningsGrowth ?? 0)}
              <span className="ml-1">
                {Math.abs(payoutData?.earningsGrowth ?? 0).toFixed(1)}% from
                last month
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout History */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Recent Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payoutData?.payouts && payoutData.payouts.length > 0 ? (
                payoutData.payouts.slice(0, 5).map((payout: any) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.status === "PAID"
                            ? "bg-green-100"
                            : payout.status === "REJECTED"
                              ? "bg-red-100"
                              : "bg-yellow-100"
                        }`}
                      >
                        {payout.status === "PAID" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : payout.status === "REJECTED" ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Payout #{payout.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {payout.status === "PAID"
                            ? "Completed"
                            : payout.status === "REJECTED"
                              ? "Rejected"
                              : "Processing"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payout.requestedAt
                            ? new Intl.DateTimeFormat("en-US", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }).format(new Date(payout.requestedAt))
                            : "Unknown date"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ₹{Number(payout.amount).toLocaleString()}
                      </p>
                      <Badge
                        className={
                          payout.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : payout.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No payout history yet</p>
                  <p className="text-sm">
                    Payout requests will appear here once you start earning
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">UPI ID</span>
                  <Badge className="bg-green-100 text-green-800">
                    Verified
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {payoutData?.farmerProfile?.upiId || "Not set"}
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Update UPI ID
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    Bank Account
                  </span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Add bank account for direct transfers
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Bank Account
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    Payout Schedule
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">Weekly</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Automatic payouts every Friday
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart Placeholder */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">
                Earnings chart will be displayed here
              </p>
              <p className="text-sm text-gray-400">
                Track your monthly earnings and growth over time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
