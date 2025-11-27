import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only customers can view their feedback
    if (session.user.role !== UserRole.CUSTOMER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedback = await prisma.review.findMany({
      where: {
        authorId: session.user.id,
      },
      include: {
        order: {
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
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only customers can submit feedback
    if (session.user.role !== UserRole.CUSTOMER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, rating, comment, type } = body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid order ID or rating" },
        { status: 400 },
      );
    }

    // Verify the order belongs to the customer and is delivered
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: session.user.id,
        status: "DELIVERED",
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not delivered" },
        { status: 404 },
      );
    }

    // Check if feedback already exists for this order and type
    const existingFeedback = await prisma.review.findFirst({
      where: {
        authorId: session.user.id,
        targetId: orderId,
        targetType: type.toUpperCase(),
      },
    });

    if (existingFeedback) {
      return NextResponse.json(
        { error: "Feedback already submitted for this order" },
        { status: 400 },
      );
    }

    // Create feedback
    const feedback = await prisma.review.create({
      data: {
        authorId: session.user.id,
        targetType: type.toUpperCase(),
        targetId: orderId,
        rating,
        comment: comment || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 },
    );
  }
}
