/**
 * Activity Logging Utility
 * Tracks all changes to orders, payments, refunds, etc.
 */

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

export interface ActivityLogData {
  userId?: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an activity log entry
 */
export async function createActivityLog(data: ActivityLogData): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId || null,
        userRole: data.userRole,
        action: data.action,
        entityType: data.entityType as any,
        entityId: data.entityId,
        oldValue: data.oldValue
          ? (data.oldValue as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        newValue: data.newValue
          ? (data.newValue as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    // Log but don't fail the operation if activity logging fails
    console.error("Failed to create activity log:", error);
  }
}

/**
 * Get activity logs for an entity
 */
export async function getActivityLogs(
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return prisma.activityLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    // Note: User relation can be added to ActivityLog model if needed
  });
}

/**
 * Log order status change
 */
export async function logOrderStatusChange(
  orderId: string,
  userId: string | undefined,
  userRole: UserRole,
  oldStatus: string,
  newStatus: string,
  oldPaymentStatus?: string,
  newPaymentStatus?: string,
) {
  await createActivityLog({
    userId,
    userRole,
    action: "ORDER_STATUS_UPDATE",
    entityType: "Order",
    entityId: orderId,
    oldValue: {
      status: oldStatus,
      paymentStatus: oldPaymentStatus,
    },
    newValue: {
      status: newStatus,
      paymentStatus: newPaymentStatus,
    },
  });
}

/**
 * Log payment status change
 */
export async function logPaymentStatusChange(
  paymentId: string,
  orderId: string,
  userId: string | undefined,
  userRole: UserRole,
  oldStatus: string,
  newStatus: string,
) {
  await createActivityLog({
    userId,
    userRole,
    action: "PAYMENT_STATUS_UPDATE",
    entityType: "Payment",
    entityId: paymentId,
    metadata: {
      orderId,
    },
    oldValue: {
      status: oldStatus,
    },
    newValue: {
      status: newStatus,
    },
  });
}

/**
 * Log refund request/approval
 */
export async function logRefundAction(
  refundId: string,
  orderId: string,
  userId: string | undefined,
  userRole: UserRole,
  action: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED",
  data?: any,
) {
  await createActivityLog({
    userId,
    userRole,
    action: `REFUND_${action}`,
    entityType: "Refund",
    entityId: refundId,
    metadata: {
      orderId,
      ...data,
    },
  });
}
