import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Create date filter if date range is provided
    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate + "T00:00:00.000Z"),
              lte: new Date(endDate + "T23:59:59.999Z"),
            },
          }
        : {};

    // Get date range info for response
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      recentOrders,
      // Get additional metrics for better chart data
      ordersByMonth,
      revenueByMonth,
      userRegistrationsByMonth,
    ] = await Promise.all([
      prisma.user.count({
        where: hasDateFilter ? dateFilter : {},
      }),
      prisma.order.count({
        where: hasDateFilter ? dateFilter : {},
      }),
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          ...(hasDateFilter && {
            order: dateFilter,
          }),
        },
        _sum: { amount: true },
      }),
      prisma.order.findMany({
        where: hasDateFilter ? dateFilter : {},
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
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
      }),
      // Get monthly order data for charts
      prisma.order.groupBy({
        by: ["createdAt"],
        where: hasDateFilter ? dateFilter : {},
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      // Get monthly revenue data for charts
      prisma.payment.groupBy({
        by: ["createdAt"],
        where: {
          status: "SUCCESS",
          ...(hasDateFilter && {
            order: dateFilter,
          }),
        },
        _sum: { amount: true },
        orderBy: { createdAt: "asc" },
      }),
      // Get monthly user registration data
      prisma.user.groupBy({
        by: ["createdAt"],
        where: hasDateFilter ? dateFilter : {},
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Process chart data
    const chartData = {
      ordersByMonth: ordersByMonth.map((item) => ({
        month: item.createdAt.toISOString().slice(0, 7), // YYYY-MM format
        count: item._count.id,
      })),
      revenueByMonth: revenueByMonth.map((item) => ({
        month: item.createdAt.toISOString().slice(0, 7),
        amount: Number(item._sum.amount || 0),
      })),
      userRegistrationsByMonth: userRegistrationsByMonth.map((item) => ({
        month: item.createdAt.toISOString().slice(0, 7),
        count: item._count.id,
      })),
    };

    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      recentOrders,
      chartData,
      dateRange: hasDateFilter ? { startDate, endDate } : null,
      hasData:
        totalOrders > 0 ||
        totalUsers > 0 ||
        Number(totalRevenue._sum.amount || 0) > 0,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
