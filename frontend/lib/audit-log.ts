/**
 * Global Audit Log System
 * Centralized logging for all system actions
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface CreateAuditLogParams {
  userId?: string;
  displayId?: string;
  role: string;
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
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        displayId: params.displayId || null,
        role: params.role as any,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        metadata: params.metadata || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should never fail the main operation
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(params: {
  userId?: string;
  displayId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.AuditLogWhereInput = {};

  if (params.userId) {
    where.userId = params.userId;
  }

  if (params.displayId) {
    where.displayId = params.displayId;
  }

  if (params.entityType) {
    where.entityType = params.entityType;
  }

  if (params.entityId) {
    where.entityId = params.entityId;
  }

  if (params.action) {
    where.action = params.action;
  }

  return prisma.auditLog.findMany({
    where,
    take: params.limit || 100,
    skip: params.offset || 0,
    orderBy: {
      timestamp: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          displayId: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Count audit logs
 */
export async function countAuditLogs(where: Prisma.AuditLogWhereInput = {}) {
  return prisma.auditLog.count({ where });
}
