import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/payments";
import { processPaymentSuccess } from "@/lib/payment-revenue-system";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      await request.json();

    // Verify payment signature
    const isValid = await verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 },
      );
    }

    // Use centralized payment processing
    const correlationId = `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await processPaymentSuccess({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      amount: 0, // Amount will be retrieved from the order
      correlationId,
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Payment processed successfully with atomic transaction",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 },
    );
  }
}
