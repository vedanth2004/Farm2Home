import { prisma } from "@/lib/prisma";
import {
  OrderStatus,
  PaymentStatus,
  EarningsStatus,
  PayoutStatus,
} from "@prisma/client";
import pino from "pino";

const logger = pino({ name: "payment-revenue-system" });

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentSuccessData {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  correlationId?: string;
}

export interface RevenueCalculation {
  storePrice: number; // Final price seen by customer
  farmerPrice: number; // Base price set by farmer
  quantity: number; // Number of units ordered
  farmerShare: number; // farmerPrice × quantity
  adminProfit: number; // (storePrice - farmerPrice) × quantity
  totalAmount: number; // storePrice × quantity
}

export interface DashboardMetrics {
  totalRevenue: number; // Sum of all paid order totals
  totalProfit: number; // Sum of admin profits from paid orders
  pendingOrders: number; // Count of pending orders
  completedOrders: number; // Count of paid/delivered orders
  totalOrders?: number; // Total orders count (for compatibility)
  activeFarmers?: number; // Active farmers count (for compatibility)
  pendingEarnings?: number; // Pending earnings (for compatibility)
  lastUpdated: string;
}

export interface FarmerMetrics {
  totalEarnings: number; // Sum of all farmer earnings from paid orders
  pendingPayouts: number; // Amount awaiting payout approval
  paidEarnings: number; // Amount already paid out
  payoutHistory: any[];
  lastUpdated: string;
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

/**
 * Process successful payment atomically with all revenue calculations
 */
export async function processPaymentSuccess(data: PaymentSuccessData) {
  const { orderId, correlationId } = data;
  const logId = correlationId || `payment-${Date.now()}`;

  logger.info({ logId, orderId }, "Processing payment success");

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch order with all necessary relations
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: {
              id: true,
              internalId: true,
              displayId: true,
              role: true,
            },
          },
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

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (order.paymentStatus === "SUCCESS") {
        logger.warn({ logId, orderId }, "Order already processed");
        return { success: true, message: "Already processed" };
      }

      // 2. Update payment and order status
      await tx.payment.updateMany({
        where: { orderId, gatewayOrderId: data.razorpayOrderId },
        data: {
          gatewayPaymentId: data.razorpayPaymentId,
          status: "SUCCESS",
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentStatus: "SUCCESS",
        },
      });

      // 3. Process each order item with revenue calculations
      const revenueData: RevenueCalculation[] = [];
      const earningsCreated = [];

      for (const item of order.items) {
        const listing = item.listing;
        const storePrice = Number(
          (listing as any).storePrice || listing.pricePerUnit,
        );
        const farmerPrice = Number(
          (listing as any).farmerPrice || listing.pricePerUnit,
        );
        const quantity = item.quantity;

        // Calculate revenue splits
        const revenue: RevenueCalculation = {
          storePrice,
          farmerPrice,
          quantity,
          farmerShare: farmerPrice * quantity,
          adminProfit: (storePrice - farmerPrice) * quantity,
          totalAmount: storePrice * quantity,
        };

        revenueData.push(revenue);

        // Check inventory
        if (listing.availableQty < quantity) {
          throw new Error(
            `Insufficient inventory: ${listing.availableQty} < ${quantity}`,
          );
        }

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            listingId: listing.id,
            delta: -quantity,
            reason: "ORDER_RESERVE",
            // Note: orderId field doesn't exist in schema, removed for now
          },
        });

        // Update inventory
        await tx.productListing.update({
          where: { id: listing.id },
          data: { availableQty: { decrement: quantity } },
        });

        // Update OrderItem with adminProfit if not already set
        // Note: adminProfit field will be available after Prisma migration
        await (tx as any).orderItem.update({
          where: { id: item.id },
          data: {
            adminProfit: revenue.adminProfit,
          },
        });

        // Create admin revenue record if not exists
        // Note: AdminRevenue model will be available after Prisma migration
        const existingAdminRevenue = await (tx as any).adminRevenue.findFirst({
          where: {
            orderId,
            orderItemId: item.id,
          },
        });

        if (!existingAdminRevenue && revenue.adminProfit > 0) {
          await (tx as any).adminRevenue.create({
            data: {
              orderId,
              orderItemId: item.id,
              amount: revenue.adminProfit,
            },
          });
        }

        // Create farmer earnings
        if (listing.product.farmerId) {
          const earnings = await (tx as any).earnings.create({
            data: {
              farmerId: listing.product.farmerId,
              orderId,
              orderItemId: item.id,
              amount: revenue.farmerShare,
              status: "PENDING",
            },
          });
          earningsCreated.push(earnings);
        }
      }

      // 4. Create pickup job with agent assignment and distance calculation
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

      logger.info(
        { logId, orderId, earningsCount: earningsCreated.length },
        "Payment processed successfully",
      );

      return {
        success: true,
        orderId,
        revenueData,
        earningsCreated: earningsCreated.length,
        customerId: order.customerId,
        customerInternalId: order.customer.internalId,
        customerDisplayId: order.customer.displayId,
        customerRole: order.customer.role,
      };
    });

    // Create audit log for payment processing (outside transaction)
    if (result.success && result.revenueData) {
      try {
        const { createAuditLog } = await import("@/lib/utils/audit-log");
        await createAuditLog({
          userId: result.customerInternalId || result.customerId,
          displayId: result.customerDisplayId || undefined,
          role: result.customerRole as any,
          action: "Payment Processed",
          entityType: "Order",
          entityId: orderId,
          metadata: {
            amount: result.revenueData.reduce(
              (sum: number, r: any) => sum + r.totalAmount,
              0,
            ),
            revenueData: result.revenueData.map((r: any) => ({
              farmerShare: r.farmerShare,
              adminProfit: r.adminProfit,
              totalAmount: r.totalAmount,
            })),
          },
        });
      } catch (auditError) {
        // Don't fail payment if audit log fails
        logger.error(
          { logId, orderId, auditError },
          "Failed to create audit log",
        );
      }
    }

    // 5. Emit real-time events
    await emitDashboardUpdateEvent({ orderId, correlationId: logId });

    return result;
  } catch (error: any) {
    logger.error(
      { logId, orderId, error: error.message },
      "Payment processing failed",
    );
    throw error;
  }
}

/**
 * Process payment failure
 */
export async function processPaymentFailure(data: {
  orderId: string;
  razorpayOrderId: string;
  correlationId?: string;
}) {
  const { orderId, correlationId } = data;
  const logId = correlationId || `payment-fail-${Date.now()}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId, gatewayOrderId: data.razorpayOrderId },
        data: { status: "FAILED" },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
        },
      });
    });

    await emitDashboardUpdateEvent({ orderId, correlationId: logId });
    return { success: true };
  } catch (error: any) {
    logger.error(
      { logId, orderId, error: error.message },
      "Payment failure processing failed",
    );
    throw error;
  }
}

// ============================================================================
// ADMIN DASHBOARD METRICS
// ============================================================================

/**
 * Get comprehensive admin dashboard metrics
 * ONLY paid orders contribute to revenue and profit
 */
export async function getAdminDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [
      paidOrders,
      totalOrders,
      pendingCount,
      completedCount,
      activeFarmersCount,
      allEarnings,
      pendingEarnings,
    ] = await Promise.all([
      // Get all PAID orders with their items and earnings
      prisma.order.findMany({
        where: { paymentStatus: "SUCCESS" },
        include: {
          items: {
            include: {
              listing: true,
            },
          },
          earnings: true,
        },
      }),

      // Total orders count (all statuses)
      prisma.order.count(),

      // Pending orders count
      prisma.order.count({
        where: { paymentStatus: "PENDING" },
      }),

      // Completed orders count
      prisma.order.count({
        where: {
          OR: [{ paymentStatus: "SUCCESS" }, { status: "DELIVERED" }],
        },
      }),

      // Active farmers count (farmers with at least one paid order)
      prisma.farmerProfile.findMany({
        where: {
          products: {
            some: {
              listings: {
                some: {
                  orderItems: {
                    some: {
                      order: {
                        paymentStatus: "SUCCESS",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
        },
      }),

      // All earnings from paid orders only (to verify calculations)
      (prisma as any).earnings.findMany({
        where: {
          order: {
            paymentStatus: "SUCCESS",
          },
        },
        select: {
          amount: true,
        },
      }),

      // Pending earnings total (sum of all pending farmer earnings from paid orders)
      (prisma as any).earnings.aggregate({
        where: {
          status: "PENDING",
          order: {
            paymentStatus: "SUCCESS",
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // Calculate total revenue and profit from paid orders only
    // Use order.totalAmount for revenue (what customer actually paid)
    // This ensures consistency across all dashboards
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalFarmerEarningsFromPaidOrders = 0;

    for (const order of paidOrders) {
      // Use order totalAmount for revenue (what customer actually paid)
      const orderRevenue = Number(order.totalAmount);
      totalRevenue += orderRevenue;

      // Calculate profit from items if they exist, otherwise estimate
      if (order.items.length > 0) {
        for (const item of order.items) {
          // Use actual order item price (what customer paid)
          const storePrice = Number(item.unitPrice);
          const quantity = item.quantity;

          // Get farmer price from item field, listing, or earnings records
          let farmerPrice = Number((item as any).farmerPrice || 0);

          // If farmerPrice is not set in item, use earnings amount for this item
          if (farmerPrice === 0) {
            const itemEarnings = (order as any).earnings.filter(
              (e: any) => e.orderItemId === item.id,
            );
            const earningsSum = itemEarnings.reduce(
              (sum: number, e: any) => sum + Number(e.amount),
              0,
            );
            if (earningsSum > 0) {
              farmerPrice = earningsSum / quantity; // Calculate per-unit price
            } else {
              // Fallback to listing price if no earnings
              farmerPrice = Number(
                (item.listing as any).farmerPrice ||
                  item.listing.pricePerUnit ||
                  0,
              );
            }
          }

          // Calculate profit per item: (storePrice - farmerPrice) * quantity
          const adminMargin = (storePrice - farmerPrice) * quantity;
          totalProfit += adminMargin;

          // Track farmer earnings from paid orders only
          totalFarmerEarningsFromPaidOrders += farmerPrice * quantity;
        }
      } else {
        // For orders with 0 items but non-zero totalAmount, estimate profit
        // Use earnings if available, otherwise assume 50% margin
        const orderEarnings = (order as any).earnings.reduce(
          (sum: number, e: any) => sum + Number(e.amount),
          0,
        );
        if (orderEarnings > 0) {
          totalProfit += orderRevenue - orderEarnings;
          totalFarmerEarningsFromPaidOrders += orderEarnings;
        } else {
          // Estimate: assume 30% admin margin
          const estimatedMargin = orderRevenue * 0.3;
          totalProfit += estimatedMargin;
          totalFarmerEarningsFromPaidOrders += orderRevenue * 0.7;
        }
      }
    }

    return {
      totalRevenue,
      totalProfit,
      pendingOrders: pendingCount,
      completedOrders: completedCount,
      totalOrders,
      activeFarmers: activeFarmersCount.length,
      pendingEarnings: Number(pendingEarnings._sum.amount || 0),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get admin metrics");
    throw error;
  }
}

// ============================================================================
// FARMER DASHBOARD METRICS
// ============================================================================

/**
 * Get comprehensive farmer dashboard metrics
 */
export async function getFarmerDashboardMetrics(
  farmerId: string,
): Promise<FarmerMetrics> {
  try {
    const [totalEarnings, pendingEarnings, paidEarnings, payoutHistory] =
      await Promise.all([
        // Total earnings from all orders
        (prisma as any).earnings.aggregate({
          where: { farmerId },
          _sum: { amount: true },
        }),

        // Pending earnings (awaiting payout)
        (prisma as any).earnings.aggregate({
          where: { farmerId, status: "PENDING" },
          _sum: { amount: true },
        }),

        // Paid earnings (already paid out)
        (prisma as any).earnings.aggregate({
          where: { farmerId, status: "PAID" },
          _sum: { amount: true },
        }),

        // Payout history
        (prisma as any).payout.findMany({
          where: { farmerId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    return {
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      pendingPayouts: Number(pendingEarnings._sum.amount || 0),
      paidEarnings: Number(paidEarnings._sum.amount || 0),
      payoutHistory,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error(
      { farmerId, error: error.message },
      "Failed to get farmer metrics",
    );
    throw error;
  }
}

// ============================================================================
// PAYOUT MANAGEMENT
// ============================================================================

/**
 * Request payout for farmer
 */
export async function requestPayout(farmerId: string, amount: number) {
  const logId = `payout-request-${Date.now()}`;

  try {
    // Check for existing pending payout
    const existingPayout = await (prisma as any).payout.findFirst({
      where: {
        farmerId,
        status: "PENDING",
      },
    });

    if (existingPayout) {
      throw new Error(
        "You already have a pending payout request. Please wait for admin approval.",
      );
    }

    // Verify available earnings
    const { pendingPayouts } = await getFarmerDashboardMetrics(farmerId);
    if (amount > pendingPayouts) {
      throw new Error("Insufficient pending earnings");
    }

    // Create payout request
    const payout = await (prisma as any).payout.create({
      data: {
        beneficiaryType: "FARMER",
        beneficiaryId: farmerId,
        amount,
        status: "PENDING",
        requestType: "FARMER_REQUEST",
        farmerId,
        requestedAt: new Date(),
      },
    });

    logger.info({ logId, farmerId, amount }, "Payout requested");
    return { success: true, payout };
  } catch (error: any) {
    logger.error(
      { logId, farmerId, error: error.message },
      "Payout request failed",
    );
    throw error;
  }
}

/**
 * Approve payout by admin
 */
export async function approvePayout(payoutId: string) {
  const logId = `payout-approve-${Date.now()}`;

  try {
    await prisma.$transaction(async (tx) => {
      const payout = await (tx as any).payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout || payout.status !== "PENDING") {
        throw new Error("Invalid payout request");
      }

      // Update payout status
      await (tx as any).payout.update({
        where: { id: payoutId },
        data: {
          status: "PAID",
          approvedAt: new Date(),
        },
      });

      // Mark all pending earnings as paid
      if (payout.farmerId) {
        await (tx as any).earnings.updateMany({
          where: {
            farmerId: payout.farmerId,
            status: "PENDING",
          },
          data: { status: "PAID" },
        });
      }
    });

    await emitDashboardUpdateEvent({ correlationId: logId });
    return { success: true };
  } catch (error: any) {
    logger.error(
      { logId, payoutId, error: error.message },
      "Payout approval failed",
    );
    throw error;
  }
}

/**
 * Reject payout by admin
 */
export async function rejectPayout(payoutId: string, reason: string) {
  const logId = `payout-reject-${Date.now()}`;

  try {
    await (prisma as any).payout.update({
      where: { id: payoutId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        reference: reason,
      },
    });

    await emitDashboardUpdateEvent({ correlationId: logId });
    return { success: true };
  } catch (error: any) {
    logger.error(
      { logId, payoutId, error: error.message },
      "Payout rejection failed",
    );
    throw error;
  }
}

// ============================================================================
// EVENT EMISSION
// ============================================================================

async function emitDashboardUpdateEvent(data: {
  orderId?: string;
  correlationId: string;
}) {
  try {
    logger.info({ ...data }, "Emitting dashboard update event");

    // TODO: Implement Redis pub/sub or WebSocket events
    // For now, we'll use cache invalidation pattern
    console.log("Dashboard Update Event:", {
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to emit dashboard update");
  }
}
