import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import {
  processPaymentSuccess,
  processPaymentFailure,
} from "@/lib/payment-revenue-system";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 },
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    const correlationId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    switch (event.event) {
      case "payment.captured":
        await processPaymentSuccess({
          orderId: event.payload.payment.entity.order_id,
          razorpayOrderId: event.payload.payment.entity.order_id,
          razorpayPaymentId: event.payload.payment.entity.id,
          amount: event.payload.payment.entity.amount / 100,
          correlationId,
        });
        break;

      case "payment.failed":
        await processPaymentFailure({
          orderId: event.payload.payment.entity.order_id,
          razorpayOrderId: event.payload.payment.entity.order_id,
          correlationId,
        });
        break;

      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
