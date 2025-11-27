import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, EarningsStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create earnings records
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Get order with items and their listings
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            listing: {
              include: {
                product: {
                  include: {
                    farmer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const createdEarnings = [];

    // Create earnings record for each order item
    for (const item of order.items) {
      const farmerId = item.listing.product.farmerId;
      const farmerPrice = Number(item.farmerPrice || 0);
      const quantity = item.quantity;
      const earningsAmount = farmerPrice * quantity;

      if (earningsAmount > 0) {
        const earnings = await prisma.earnings.create({
          data: {
            farmerId,
            orderId: order.id,
            orderItemId: item.id,
            amount: earningsAmount,
            status: EarningsStatus.PENDING,
          },
        });

        createdEarnings.push(earnings);
      }
    }

    return NextResponse.json({
      success: true,
      earnings: createdEarnings,
      message: `Created ${createdEarnings.length} earnings records`,
    });
  } catch (error) {
    console.error("Error creating earnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
