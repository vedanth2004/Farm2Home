import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import pino from "pino";

const logger = pino({ name: "atomic-payment" });

export interface PaymentSuccessData {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  correlationId?: string;
}

export interface PaymentFailureData {
  orderId: string;
  razorpayOrderId: string;
  correlationId?: string;
}

/**
 * Atomic payment success handler that processes all related operations in a single transaction
 */
export async function handleAtomicPaymentSuccess(data: PaymentSuccessData) {
  const { orderId, razorpayOrderId, razorpayPaymentId, amount, correlationId } =
    data;
  const logId = correlationId || `payment-${Date.now()}`;

  logger.info(
    { logId, orderId, amount },
    "Starting atomic payment success processing",
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify order exists and is not already processed
      const existingOrder = await tx.order.findUnique({
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
          payments: true,
        },
      });

      if (!existingOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (existingOrder.paymentStatus === "SUCCESS") {
        logger.warn({ logId, orderId }, "Order already processed successfully");
        return { success: true, message: "Order already processed" };
      }

      // 2. Update payment record
      logger.info({ logId, orderId }, "Updating payment record");
      await tx.payment.updateMany({
        where: {
          orderId,
          gatewayOrderId: razorpayOrderId,
        },
        data: {
          gatewayPaymentId: razorpayPaymentId,
          status: "SUCCESS",
        },
      });

      // 3. Update order status
      logger.info({ logId, orderId }, "Updating order status");
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentStatus: "SUCCESS",
        },
      });

      // 3.5. Award loyalty points (async, non-blocking)
      // This will be processed after transaction commits
      const loyaltyData = {
        customerId: existingOrder.customerId,
        orderId,
        orderAmount: Number(existingOrder.totalAmount),
      };

      // 4. Process inventory and create earnings for each order item
      const earningsCreated = [];
      const farmerEarningsMap = new Map<string, number>();

      for (const item of existingOrder.items) {
        const listing = item.listing;
        const product = listing.product;
        const farmerId = product.farmerId;

        // Calculate pricing
        const storePrice = Number(
          (listing as any).storePrice || listing.pricePerUnit,
        );
        const farmerPrice = Number(
          (listing as any).farmerPrice || listing.pricePerUnit,
        );
        const platformFee = storePrice - farmerPrice;
        const farmerShare = farmerPrice * item.quantity;
        const adminMargin = platformFee * item.quantity;

        // Check inventory availability
        if (listing.availableQty < item.quantity) {
          throw new Error(
            `Insufficient inventory for product ${product.name}. Available: ${listing.availableQty}, Required: ${item.quantity}`,
          );
        }

        // Create inventory transaction
        logger.info(
          { logId, orderId, listingId: listing.id, quantity: item.quantity },
          "Creating inventory transaction",
        );
        await tx.inventoryTransaction.create({
          data: {
            listingId: listing.id,
            delta: -item.quantity,
            reason: "ORDER_RESERVE",
          },
        });

        // Update available quantity
        await tx.productListing.update({
          where: { id: listing.id },
          data: {
            availableQty: {
              decrement: item.quantity,
            },
          },
        });

        // Create earnings record for farmer
        logger.info(
          { logId, orderId, farmerId, farmerShare },
          "Creating earnings record",
        );
        const earnings = await (tx as any).earnings.create({
          data: {
            farmerId,
            orderId: orderId,
            orderItemId: item.id,
            amount: farmerShare,
            status: "PENDING",
          },
        });

        earningsCreated.push(earnings);

        // Track farmer earnings for potential payout creation
        const currentEarnings = farmerEarningsMap.get(farmerId) || 0;
        farmerEarningsMap.set(farmerId, currentEarnings + farmerShare);

        logger.info(
          { logId, orderId, farmerId, farmerShare, adminMargin },
          "Earnings created for farmer",
        );
      }

      // 5. Create pickup job with agent assignment and distance calculation
      logger.info({ logId, orderId }, "Creating pickup job");

      // Get customer address to find nearest agent
      const customerAddress = await tx.address.findUnique({
        where: { id: existingOrder.shippingAddressId },
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

      // 6. Update farmer earnings totals (if we have a farmer earnings tracking table)
      // For now, we'll rely on the Earnings table for calculations

      logger.info(
        { logId, orderId, earningsCount: earningsCreated.length },
        "Atomic payment processing completed successfully",
      );

      const result = {
        success: true,
        orderId,
        earningsCreated: earningsCreated.length,
        farmerEarnings: Object.fromEntries(farmerEarningsMap),
        loyaltyData: {
          customerId: existingOrder.customerId,
          orderId,
          orderAmount: Number(existingOrder.totalAmount),
        },
      };

      // Process loyalty points after transaction commits (non-blocking)
      setImmediate(async () => {
        try {
          const { earnPointsForOrder, processReferralBonus } = await import(
            "@/lib/loyalty"
          );
          await earnPointsForOrder(
            result.loyaltyData.customerId,
            result.loyaltyData.orderId,
            result.loyaltyData.orderAmount,
          );

          // Check if this is user's first successful order
          const userOrderCount = await prisma.order.count({
            where: {
              customerId: result.loyaltyData.customerId,
              paymentStatus: "SUCCESS",
            },
          });
          if (userOrderCount === 1) {
            await processReferralBonus(
              result.loyaltyData.customerId,
              result.loyaltyData.orderId,
            );
          }
        } catch (loyaltyError) {
          logger.warn(
            { logId, orderId, error: loyaltyError },
            "Failed to process loyalty points (non-critical)",
          );
        }
      });

      return result;
    });

    // 7. Emit real-time events after successful transaction
    await emitPaymentSuccessEvent({
      orderId,
      amount,
      correlationId: logId,
      farmerEarnings:
        result.success && "farmerEarnings" in result
          ? result.farmerEarnings
          : {},
    });

    return result;
  } catch (error) {
    logger.error(
      {
        logId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Atomic payment processing failed",
    );
    throw error;
  }
}

/**
 * Atomic payment failure handler
 */
export async function handleAtomicPaymentFailure(data: PaymentFailureData) {
  const { orderId, razorpayOrderId, correlationId } = data;
  const logId = correlationId || `payment-fail-${Date.now()}`;

  logger.info({ logId, orderId }, "Starting atomic payment failure processing");

  try {
    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.payment.updateMany({
        where: {
          orderId,
          gatewayOrderId: razorpayOrderId,
        },
        data: {
          status: "FAILED",
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
        },
      });
    });

    // Emit failure event
    await emitPaymentFailureEvent({ orderId, correlationId: logId });

    logger.info(
      { logId, orderId },
      "Atomic payment failure processing completed",
    );
    return { success: true };
  } catch (error) {
    logger.error(
      {
        logId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Atomic payment failure processing failed",
    );
    throw error;
  }
}

/**
 * Emit real-time events for dashboard updates
 */
async function emitPaymentSuccessEvent(data: {
  orderId: string;
  amount: number;
  correlationId: string;
  farmerEarnings: Record<string, number>;
}) {
  try {
    // TODO: Implement Redis pub/sub or WebSocket events
    // For now, we'll use a simple approach with cache invalidation
    logger.info(
      { correlationId: data.correlationId, orderId: data.orderId },
      "Payment success event emitted",
    );

    // In a real implementation, you would:
    // 1. Publish to Redis channel: "payment:success"
    // 2. Send WebSocket events to connected clients
    // 3. Invalidate relevant cache keys

    // For now, we'll just log the event
    console.log("Payment Success Event:", {
      orderId: data.orderId,
      amount: data.amount,
      farmerEarnings: data.farmerEarnings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to emit payment success event",
    );
  }
}

async function emitPaymentFailureEvent(data: {
  orderId: string;
  correlationId: string;
}) {
  try {
    logger.info(
      { correlationId: data.correlationId, orderId: data.orderId },
      "Payment failure event emitted",
    );

    console.log("Payment Failure Event:", {
      orderId: data.orderId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to emit payment failure event",
    );
  }
}

/**
 * Get real-time dashboard metrics
 */
export async function getDashboardMetrics() {
  try {
    const [totalRevenue, totalOrders, activeFarmers, pendingEarnings] =
      await Promise.all([
        // Total revenue from successful payments
        prisma.payment.aggregate({
          where: { status: "SUCCESS" },
          _sum: { amount: true },
        }),

        // Total orders
        prisma.order.count(),

        // Active farmers
        prisma.farmerProfile.count(),

        // Total pending earnings
        (prisma as any).earnings.aggregate({
          where: { status: "PENDING" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalOrders,
      activeFarmers,
      pendingEarnings: Number(pendingEarnings._sum.amount || 0),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to get dashboard metrics",
    );
    throw error;
  }
}

/**
 * Get farmer earnings metrics
 */
export async function getFarmerEarningsMetrics(farmerId: string) {
  try {
    const [pendingEarnings, totalEarnings, recentEarnings] = await Promise.all([
      // Pending earnings
      (prisma as any).earnings.aggregate({
        where: {
          farmerId,
          status: "PENDING",
        },
        _sum: { amount: true },
      }),

      // Total earnings
      (prisma as any).earnings.aggregate({
        where: { farmerId },
        _sum: { amount: true },
      }),

      // Recent earnings (last 10)
      (prisma as any).earnings.findMany({
        where: { farmerId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          order: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      pendingEarnings: Number(pendingEarnings._sum.amount || 0),
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      recentEarnings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(
      {
        farmerId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to get farmer earnings metrics",
    );
    throw error;
  }
}
