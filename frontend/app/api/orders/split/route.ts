/**
 * Order Splitting API
 * Splits a large order into sub-orders per farmer for multi-seller support
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  OrderStatus,
  PaymentStatus,
  NotificationChannel,
  Prisma,
} from "@prisma/client";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins or the customer can split their own orders
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Get the original order
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
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
        shippingAddress: true,
        coupon: true,
      },
    });

    if (!originalOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify permissions
    if (
      session.user.role !== "ADMIN" &&
      originalOrder.customerId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only split your own orders" },
        { status: 403 },
      );
    }

    // Only split orders that are CREATED or PAID
    if (originalOrder.status !== "CREATED" && originalOrder.status !== "PAID") {
      return NextResponse.json(
        {
          error: `Cannot split order in ${originalOrder.status} status. Only CREATED or PAID orders can be split.`,
        },
        { status: 400 },
      );
    }

    // Group items by farmer
    const itemsByFarmer = new Map<
      string,
      {
        farmerId: string;
        farmerUserId: string;
        items: (typeof originalOrder.items)[number][];
      }
    >();

    for (const item of originalOrder.items) {
      const farmerId = item.listing.product.farmerId;
      const farmerUserId = item.listing.product.farmer.userId;

      if (!itemsByFarmer.has(farmerId)) {
        itemsByFarmer.set(farmerId, {
          farmerId,
          farmerUserId,
          items: [],
        });
      }

      itemsByFarmer.get(farmerId)!.items.push(item);
    }

    // If only one farmer, no need to split
    if (itemsByFarmer.size <= 1) {
      return NextResponse.json({
        success: false,
        message: "Order contains items from only one farmer. No split needed.",
        orderId,
      });
    }

    // Calculate discount distribution
    const originalTotal = Number(originalOrder.totalAmount);
    const discountAmount = Number(originalOrder.discountAmount || 0);
    const itemsTotal = originalOrder.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    // Split orders
    const splitOrders = await prisma.$transaction(async (tx) => {
      const createdOrders = [];

      for (const [farmerId, farmerData] of Array.from(
        itemsByFarmer.entries(),
      )) {
        // Calculate order total for this farmer
        const farmerItemsTotal = farmerData.items.reduce(
          (sum: number, item: (typeof farmerData.items)[0]) =>
            sum + Number(item.unitPrice) * item.quantity,
          0,
        );

        // Distribute discount proportionally
        const farmerDiscount =
          itemsTotal > 0 ? (farmerItemsTotal / itemsTotal) * discountAmount : 0;

        const farmerOrderTotal = farmerItemsTotal - farmerDiscount;

        // Create sub-order - use type assertion for parentOrderId (new field)
        const subOrder = (await tx.order.create({
          data: {
            customerId: originalOrder.customerId,
            status: originalOrder.status, // Keep same status as parent
            paymentStatus: originalOrder.paymentStatus, // Keep same payment status
            totalAmount: farmerOrderTotal,
            discountAmount: farmerDiscount > 0 ? farmerDiscount : null,
            couponCode: originalOrder.couponCode,
            shippingAddressId: originalOrder.shippingAddressId,
            ...({ parentOrderId: originalOrder.id } as any), // Type assertion for new field
            items: {
              create: farmerData.items.map(
                (item: (typeof farmerData.items)[0]) => ({
                  listingId: item.listingId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  farmerPrice: item.farmerPrice,
                  platformFee: item.platformFee,
                }),
              ),
            },
          },
          include: {
            items: {
              include: {
                listing: {
                  include: {
                    product: {
                      include: {
                        farmer: {
                          include: {
                            user: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })) as any; // Type assertion to include items

        createdOrders.push(subOrder);

        // If original order was PAID, create earnings for this sub-order
        if (originalOrder.paymentStatus === "SUCCESS") {
          for (const item of farmerData.items) {
            const farmerPrice =
              Number(item.farmerPrice) || Number(item.listing.farmerPrice) || 0;

            if (farmerPrice > 0) {
              const orderItem = subOrder.items.find(
                (oi: (typeof subOrder.items)[0]) =>
                  oi.listingId === item.listingId &&
                  oi.quantity === item.quantity,
              );

              if (orderItem) {
                await tx.earnings.create({
                  data: {
                    farmerId: farmerId,
                    orderId: subOrder.id,
                    orderItemId: orderItem.id,
                    amount: farmerPrice * item.quantity,
                    status: "PENDING",
                  },
                });
              }
            }
          }
        }

        // Create pickup job for this sub-order if parent had one
        const parentPickupJob = await tx.pickupJob.findUnique({
          where: { orderId: originalOrder.id },
        });

        if (parentPickupJob) {
          await tx.pickupJob.create({
            data: {
              orderId: subOrder.id,
              agentId: parentPickupJob.agentId,
              status: parentPickupJob.status,
            },
          });
        }

        // Notify farmer about their sub-order
        await tx.notification.create({
          data: {
            userId: farmerData.farmerUserId,
            type: "ORDER_SPLIT",
            channel: NotificationChannel.INAPP,
            payload: {
              title: "Order Split - New Sub-Order",
              message: `Your items from order #${originalOrder.id.slice(-8)} have been split into a separate sub-order #${subOrder.id.slice(-8)}`,
              orderId: subOrder.id,
              parentOrderId: originalOrder.id,
            } as Prisma.InputJsonValue,
          },
        });
      }

      // Update original order to mark as split (or cancel it)
      // We'll mark it as CANCELLED and create a note that it was split
      await tx.order.update({
        where: { id: originalOrder.id },
        data: {
          status: "CANCELLED",
          // Keep a note in metadata or we could add a splitReason field
        },
      });

      return createdOrders;
    });

    // Log activity
    await createActivityLog({
      userId: session.user.id,
      userRole: session.user.role,
      action: "ORDER_SPLIT",
      entityType: "Order",
      entityId: orderId,
      oldValue: {
        orderId: originalOrder.id,
        itemCount: originalOrder.items.length,
      },
      newValue: {
        splitOrders: splitOrders.map((so: any) => ({
          id: so.id,
          totalAmount: Number(so.totalAmount),
          itemCount: so.items?.length || 0,
        })),
      },
      metadata: {
        farmersCount: itemsByFarmer.size,
        splitBy: session.user.id,
      },
    });

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: originalOrder.customerId,
        type: "ORDER_SPLIT",
        channel: NotificationChannel.INAPP,
        payload: {
          title: "Order Split",
          message: `Your order #${originalOrder.id.slice(-8)} has been split into ${splitOrders.length} sub-orders for better delivery management`,
          parentOrderId: originalOrder.id,
          splitOrderIds: splitOrders.map((so) => so.id),
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Order split into ${splitOrders.length} sub-orders`,
      parentOrderId: originalOrder.id,
      splitOrders: splitOrders.map((order: any) => {
        const firstItem = order.items?.[0];
        const farmerId = firstItem?.listing?.product?.farmerId || "unknown";
        return {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: Number(order.totalAmount),
          itemCount: order.items?.length || 0,
          farmerId: itemsByFarmer.get(farmerId)?.farmerId || "unknown",
        };
      }),
    });
  } catch (error) {
    console.error("Error splitting order:", error);
    return NextResponse.json(
      { error: "Failed to split order" },
      { status: 500 },
    );
  }
}
