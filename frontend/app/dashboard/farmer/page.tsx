import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, ShoppingCart, DollarSign, Plus } from "lucide-react";
import WeatherCard from "@/components/weather/WeatherCard";
import PayoutRequestButton from "@/components/farmer/PayoutRequestButton";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getFarmerData() {
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

    // Get farmer's products with active listings
    const products = await prisma.product.findMany({
      where: { farmerId: farmerProfile.id },
      include: {
        listings: {
          where: { isActive: true },
        },
        drafts: {
          where: { status: "PENDING" },
        },
      },
    });

    // Get orders for this farmer's products
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            listing: {
              product: {
                farmerId: farmerProfile.id,
              },
            },
          },
        },
      },
      include: {
        items: {
          include: {
            listing: {
              include: {
                product: true,
              },
            },
          },
        },
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculate metrics
    const activeProducts = products.filter((p) => p.listings.length > 0).length;
    const pendingOrders = orders.filter(
      (o) => o.status === "CREATED" || o.status === "PICKUP_ASSIGNED",
    ).length;
    const thisMonth = new Date();
    thisMonth.setDate(1);

    const thisMonthRevenue = orders
      .filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= thisMonth && o.paymentStatus === "SUCCESS";
      })
      .reduce((sum, order) => {
        const farmerItems = order.items.filter(
          (item) => item.listing.product.farmerId === farmerProfile.id,
        );
        return (
          sum +
          farmerItems.reduce(
            (itemSum, item) =>
              itemSum + Number(item.unitPrice) * Number(item.quantity),
            0,
          )
        );
      }, 0);

    // Get earnings data
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

    // Calculate pending payouts from earnings
    const pendingPayouts = pendingEarnings;

    // Get payout status
    const currentPayout = await (prisma as any).payout.findFirst({
      where: {
        farmerId: farmerProfile.id,
        status: "PENDING",
      },
      orderBy: { requestedAt: "desc" },
    });

    // Get payout history
    const payoutHistory = await (prisma as any).payout.findMany({
      where: { farmerId: farmerProfile.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
    });

    return {
      activeProducts,
      pendingOrders,
      thisMonthRevenue,
      pendingPayouts,
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      recentOrders: orders.slice(0, 5),
      farmerProfile,
      earnings: earnings.slice(0, 10), // Recent earnings
      currentPayout,
      payoutHistory,
    };
  } catch (error) {
    console.error("Error fetching farmer data:", error);
    return {
      activeProducts: 0,
      pendingOrders: 0,
      thisMonthRevenue: 0,
      pendingPayouts: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      recentOrders: [],
      farmerProfile: null,
      earnings: [],
    };
  }
}

export default async function FarmerDashboard() {
  await requirePermission("read:products");

  const farmerData = await getFarmerData();

  // Mock coordinates for farmer location
  const farmerLat = 12.9716;
  const farmerLon = 77.5946;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
        <p className="text-gray-600">
          Manage your products and track your business
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farmerData?.activeProducts ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(farmerData?.activeProducts ?? 0) > 0
                ? "Products with active listings"
                : "No active products"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farmerData?.pendingOrders ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(farmerData?.pendingOrders ?? 0) > 0
                ? "Orders awaiting processing"
                : "No pending orders"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sales This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(farmerData?.thisMonthRevenue ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(farmerData?.thisMonthRevenue ?? 0) > 0
                ? "Sales from your products"
                : "No sales this month"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payouts
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Number(farmerData?.pendingPayouts ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(farmerData?.pendingPayouts ?? 0) > 0
                ? "Available for withdrawal"
                : "No pending payouts"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Earnings Overview</span>
            <PayoutRequestButton
              pendingEarnings={farmerData?.pendingEarnings ?? 0}
              currentPayout={
                farmerData?.currentPayout
                  ? {
                      id: farmerData.currentPayout.id,
                      status: farmerData.currentPayout.status,
                      amount: Number(farmerData.currentPayout.amount),
                      requestedAt: farmerData.currentPayout.requestedAt
                        ? new Date(farmerData.currentPayout.requestedAt)
                        : undefined,
                    }
                  : null
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ₹{Number(farmerData?.totalEarnings ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Earnings</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                ₹{Number(farmerData?.pendingEarnings ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Pending Payout</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ₹{Number(farmerData?.paidEarnings ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Paid Out</div>
            </div>
          </div>

          {/* Recent Earnings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Earnings</h3>
            <div className="space-y-3">
              {farmerData?.earnings && farmerData.earnings.length > 0 ? (
                farmerData.earnings.map((earning: any) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {earning.orderItem.listing.product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Order #{earning.order.id.slice(-8)} •{" "}
                        {earning.orderItem.quantity}{" "}
                        {earning.orderItem.listing.product.baseUnit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Customer: {earning.order.customer.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        ₹{Number(earning.amount).toLocaleString()}
                      </p>
                      <p
                        className={`text-sm ${
                          earning.status === "PENDING"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {earning.status === "PENDING" ? "Pending" : "Paid"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No earnings yet</p>
                  <p className="text-sm">
                    Earnings will appear here when customers purchase your
                    products
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History Section */}
      {farmerData?.payoutHistory && farmerData.payoutHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {farmerData.payoutHistory.map((payout: any) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        ₹{Number(payout.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Requested:{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(payout.requestedAt))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payout.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : payout.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {payout.status}
                    </span>
                    {payout.approvedAt && (
                      <span className="text-xs text-gray-500">
                        Approved:{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(payout.approvedAt))}
                      </span>
                    )}
                    {payout.rejectedAt && (
                      <span className="text-xs text-gray-500">
                        Rejected:{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(payout.rejectedAt))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Card */}
        <WeatherCard lat={farmerLat} lon={farmerLon} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/dashboard/farmer/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/farmer/products">
                <Package className="h-4 w-4 mr-2" />
                Manage Products
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/farmer/orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {farmerData?.recentOrders && farmerData.recentOrders.length > 0 ? (
              farmerData.recentOrders.map((order: any) => {
                const farmerItems = order.items.filter(
                  (item: any) =>
                    item.listing.product.farmerId ===
                    farmerData.farmerProfile?.id,
                );
                const totalAmount = farmerItems.reduce(
                  (sum: number, item: any) =>
                    sum + Number(item.unitPrice * item.quantity),
                  0,
                );
                const productNames = farmerItems
                  .map(
                    (item: any) =>
                      `${item.listing.product.name} - ${item.quantity}${item.listing.product.baseUnit}`,
                  )
                  .join(", ");

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">Order #{order.id.slice(-8)}</p>
                      <p className="text-sm text-gray-600">{productNames}</p>
                      <p className="text-xs text-gray-500">
                        Customer: {order.customer.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ₹{Number(totalAmount).toLocaleString()}
                      </p>
                      <p
                        className={`text-sm ${
                          order.paymentStatus === "SUCCESS"
                            ? "text-green-600"
                            : order.paymentStatus === "PENDING"
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {order.paymentStatus === "SUCCESS"
                          ? "Paid"
                          : order.paymentStatus === "PENDING"
                            ? "Pending"
                            : "Failed"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recent orders</p>
                <p className="text-sm">
                  Orders for your products will appear here
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
