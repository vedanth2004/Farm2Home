/**
 * Global Search by Display ID
 * Searches across all entities by user display ID
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: { displayId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requirePermission("read:dashboard");

    const { displayId } = params;

    if (!displayId) {
      return NextResponse.json(
        { error: "Display ID is required" },
        { status: 400 },
      );
    }

    // Search for user by display ID
    const user = await prisma.user.findUnique({
      where: { displayId },
      include: {
        farmerProfile: true,
        pickupAgentProfile: true,
        crProfile: true,
        addresses: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No user found with this display ID",
      });
    }

    // Get user stats based on role
    let stats: any = {};

    if (user.role === "FARMER" && user.farmerProfile) {
      // Farmer stats
      const [totalOrders, totalEarnings, pendingEarnings] = await Promise.all([
        prisma.order.count({
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
        }),
        prisma.earnings.aggregate({
          where: {
            farmerId: user.farmerProfile.id,
            status: {
              in: ["PENDING", "PAID"],
            },
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.earnings.aggregate({
          where: {
            farmerId: user.farmerProfile.id,
            status: "PENDING",
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      stats = {
        totalOrders,
        totalEarnings: Number(totalEarnings._sum.amount || 0),
        pendingEarnings: Number(pendingEarnings._sum.amount || 0),
      };
    } else if (user.role === "CUSTOMER") {
      // Customer stats
      const [totalOrders, completedOrders] = await Promise.all([
        prisma.order.count({
          where: { customerId: user.id },
        }),
        prisma.order.count({
          where: {
            customerId: user.id,
            status: "DELIVERED",
          },
        }),
      ]);

      stats = {
        totalOrders,
        completedOrders,
      };
    } else if (user.role === "PICKUP_AGENT" && user.pickupAgentProfile) {
      // Agent stats
      const [totalJobs, completedJobs] = await Promise.all([
        prisma.pickupJob.count({
          where: {
            agentId: user.pickupAgentProfile.id,
          },
        }),
        prisma.pickupJob.count({
          where: {
            agentId: user.pickupAgentProfile.id,
            status: "DELIVERED",
          },
        }),
      ]);

      stats = {
        totalJobs,
        completedJobs,
      };
    } else if (user.role === "CR" && user.crProfile) {
      // CR stats
      const totalOrders = await prisma.order.count({
        where: {
          delivery: {
            crId: user.crProfile.id,
          },
        },
      });

      stats = {
        totalOrders,
      };
    }

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: { displayId },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    // Get approval status if exists
    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: { displayId },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          internalId: user.internalId,
          displayId: user.displayId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt,
          profile:
            user.farmerProfile || user.pickupAgentProfile || user.crProfile,
        },
        stats,
        approvalRequest,
        recentActivity: recentActivity.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error searching by display ID:", error);
    return NextResponse.json(
      { error: "Failed to search by display ID" },
      { status: 500 },
    );
  }
}
