/**
 * Audit Logging Utilities
 * Centralized logging for all system actions with user IDs
 */

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export interface AuditLogData {
  userId?: string;
  displayId?: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    // If userId is provided but displayId is not, fetch it
    let displayId = data.displayId;
    if (data.userId && !displayId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { displayId: true, internalId: true },
      });
      if (user) {
        displayId = user.displayId || undefined;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        displayId: displayId || undefined,
        role: data.role,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue
          ? JSON.parse(JSON.stringify(data.oldValue))
          : null,
        newValue: data.newValue
          ? JSON.parse(JSON.stringify(data.newValue))
          : null,
        metadata: data.metadata
          ? JSON.parse(JSON.stringify(data.metadata))
          : null,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Create audit log for user actions
 */
export async function logUserAction(
  userId: string,
  role: UserRole,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayId: true, internalId: true },
  });

  await createAuditLog({
    userId: user?.internalId || userId,
    displayId: user?.displayId || undefined,
    role,
    action,
    entityType,
    entityId,
    metadata,
  });
}

/**
 * Create audit log for payment processing
 */
export async function logPaymentProcessing(
  userId: string,
  orderId: string,
  amount: number,
  farmerEarnings: Record<string, number>,
  adminProfit: number,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayId: true, internalId: true, role: true },
  });

  await createAuditLog({
    userId: user?.internalId || userId,
    displayId: user?.displayId || undefined,
    role: (user?.role as UserRole) || "CUSTOMER",
    action: "Payment Processed",
    entityType: "Order",
    entityId: orderId,
    metadata: {
      amount,
      farmerEarnings,
      adminProfit,
    },
  });
}
