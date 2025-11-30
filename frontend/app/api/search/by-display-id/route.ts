import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidDisplayId, getRoleFromDisplayId } from "@/lib/utils/display-id";

export const dynamic = "force-dynamic";

/**
 * GET - Search by Display ID
 * Query params: displayId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({ message: "Unauthorized" }, 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const displayId = searchParams.get("displayId");

    if (!displayId) {
      return createErrorResponse({ message: "Display ID is required" }, 400);
    }

    // Validate display ID format
    if (!isValidDisplayId(displayId)) {
      return createErrorResponse({ message: "Invalid display ID format" }, 400);
    }

    // Find user by display ID
    const user = await prisma.user.findUnique({
      where: { displayId },
      include: {
        farmerProfile: true,
        crProfile: true,
        pickupAgentProfile: true,
        addresses: {
          take: 1,
        },
      },
    });

    if (!user) {
      return createErrorResponse({ message: "User not found" }, 404);
    }

    // Get user statistics based on role
    let stats: any = {
      orders: 0,
      totalEarnings: 0,
      pendingPayout: 0,
      totalRevenue: 0,
      totalProfit: 0,
      products: 0,
      activeListings: 0,
    };

    if (user.role === "FARMER" && user.farmerProfile) {
      // Farmer stats
      const farmerOrders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              listing: {
                product: {
                  farmerId: user.farmerProfile.id,
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
        },
      });

      stats.orders = farmerOrders.length;

      // Calculate earnings
      const earnings = await prisma.earnings.findMany({
        where: { farmerId: user.farmerProfile.id },
      });
      stats.totalEarnings = earnings.reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      );

      // Pending payout
      const pendingPayouts = await prisma.payout.findMany({
        where: {
          farmerId: user.farmerProfile.id,
          status: "PENDING",
        },
      });
      stats.pendingPayout = pendingPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      // Products
      const products = await prisma.product.findMany({
        where: { farmerId: user.farmerProfile.id },
      });
      stats.products = products.length;

      const activeListings = await prisma.productListing.findMany({
        where: {
          productId: { in: products.map((p) => p.id) },
          isActive: true,
        },
      });
      stats.activeListings = activeListings.length;
    } else if (user.role === "CUSTOMER") {
      // Customer stats
      const orders = await prisma.order.findMany({
        where: { customerId: user.id },
      });
      stats.orders = orders.length;
      stats.totalRevenue = orders.reduce(
        (sum, o) => sum + Number(o.totalAmount),
        0,
      );
    } else if (user.role === "ADMIN") {
      // Admin stats - get all orders
      const allOrders = await prisma.order.findMany({
        where: { paymentStatus: "SUCCESS" },
        include: {
          items: {
            include: {
              listing: true,
            },
          },
        },
      });

      stats.orders = allOrders.length;
      stats.totalRevenue = allOrders.reduce(
        (sum, o) => sum + Number(o.totalAmount),
        0,
      );

      // Calculate profit (storePrice - farmerPrice) * quantity
      let totalProfit = 0;
      allOrders.forEach((order) => {
        order.items.forEach((item) => {
          const storePrice = Number(item.unitPrice);
          const farmerPrice = Number(item.farmerPrice || 0);
          const profit = (storePrice - farmerPrice) * item.quantity;
          totalProfit += profit;
        });
      });
      stats.totalProfit = totalProfit;
    }

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where:
        user.role === "CUSTOMER"
          ? { customerId: user.id }
          : user.role === "FARMER" && user.farmerProfile
            ? {
                items: {
                  some: {
                    listing: {
                      product: {
                        farmerId: user.farmerProfile.id,
                      },
                    },
                  },
                },
              }
            : {},
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: {
          select: {
            name: true,
            displayId: true,
          },
        },
        items: {
          take: 2,
          include: {
            listing: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get recent activity (from audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        OR: [{ userId: user.id }, { displayId: user.displayId }],
      },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    return createSuccessResponse(
      {
        user: {
          id: user.id,
          internalId: user.internalId,
          displayId: user.displayId,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt,
          location: user.addresses[0]
            ? `${user.addresses[0].city}, ${user.addresses[0].state}`
            : null,
        },
        stats,
        recentOrders: recentOrders.slice(0, 5),
        recentActivity: recentActivity.slice(0, 10),
      },
      "Search results retrieved successfully",
    );
  } catch (error) {
    console.error("Error searching by display ID:", error);
    return createErrorResponse(error);
  }
}
