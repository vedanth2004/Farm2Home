import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, PaymentGateway } from "@prisma/client";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export interface CreateOrderData {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, any>;
}

export async function createRazorpayOrder(data: CreateOrderData) {
  try {
    const order = await razorpay.orders.create({
      amount: data.amount * 100, // Convert to paise
      currency: data.currency,
      receipt: data.receipt,
      notes: data.notes,
    });

    return order;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new Error("Failed to create payment order");
  }
}

export async function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<boolean> {
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === razorpaySignature;
}

export async function handlePaymentSuccess(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  amount: number,
) {
  try {
    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.payment.updateMany({
        where: {
          orderId,
          gatewayOrderId: razorpayOrderId,
        },
        data: {
          gatewayPaymentId: razorpayPaymentId,
          status: PaymentStatus.SUCCESS,
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });

      // Reserve inventory
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: { listing: true },
      });

      for (const item of orderItems) {
        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            listingId: item.listingId,
            delta: -item.quantity,
            reason: "ORDER_RESERVE",
          },
        });

        // Update available quantity
        await tx.productListing.update({
          where: { id: item.listingId },
          data: {
            availableQty: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Create pickup job with agent assignment and distance calculation
      // Get order to find shipping address
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { shippingAddressId: true },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Get customer address to find nearest agent
      const customerAddress = await tx.address.findUnique({
        where: { id: order.shippingAddressId },
        select: { postalCode: true, lat: true, lon: true },
      });

      let pickupJobData: any = {
        orderId,
        agentId: "default-agent", // Fallback
        status: "REQUESTED",
        deliveryDistance: null,
        agentFee: null,
      };

      // If customer address has coordinates, find nearest agent
      if (customerAddress?.postalCode) {
        const { findNearestAgentForDelivery } = await import(
          "@/lib/geocoding-distance"
        );
        const agentAssignment = await findNearestAgentForDelivery(
          customerAddress.postalCode,
        );

        if (
          agentAssignment.agentFound &&
          agentAssignment.agentId &&
          agentAssignment.distanceKm
        ) {
          const deliveryDistance = agentAssignment.distanceKm;

          // If customer and agent have same pincode, use fixed commission (20-30 rupees)
          let agentFee: number;
          if (customerAddress.postalCode === agentAssignment.agentPincode) {
            // Same pincode: random commission between 20-30 rupees
            agentFee = Math.floor(Math.random() * 11) + 20; // Random between 20-30
          } else {
            // Different pincode: 8 rupees per kilometer
            const agentFeePerKm = 8;
            agentFee = deliveryDistance * agentFeePerKm;
          }

          pickupJobData = {
            orderId,
            agentId: agentAssignment.agentId,
            status: "REQUESTED",
            deliveryDistance: deliveryDistance,
            agentFee: agentFee,
          };
        }
      }

      await tx.pickupJob.create({
        data: pickupJobData,
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error handling payment success:", error);
    throw new Error("Failed to process payment");
  }
}

export async function handlePaymentFailure(
  orderId: string,
  razorpayOrderId: string,
) {
  try {
    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.payment.updateMany({
        where: {
          orderId,
          gatewayOrderId: razorpayOrderId,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error handling payment failure:", error);
    throw new Error("Failed to process payment failure");
  }
}
