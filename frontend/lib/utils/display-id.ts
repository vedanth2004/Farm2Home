/**
 * Display ID Generation Utilities
 * Creates human-readable, prefixed IDs for users
 */

import { UserRole } from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * Get prefix for user role
 */
export function getRolePrefix(role: UserRole): string {
  const prefixMap: Record<UserRole, string> = {
    FARMER: "FARM",
    CUSTOMER: "CUST",
    ADMIN: "ADM",
    PICKUP_AGENT: "AGT",
    CR: "CRP",
  };
  return prefixMap[role] || "USR";
}

/**
 * Generate display ID for a user
 */
export function generateDisplayId(role: UserRole): string {
  const prefix = getRolePrefix(role);
  const random = nanoid(6).toUpperCase();
  return `${prefix}-${random}`;
}

/**
 * Validate display ID format
 */
export function isValidDisplayId(displayId: string): boolean {
  const pattern = /^(FARM|CUST|ADM|AGT|CRP|USR)-[A-Z0-9]{6}$/;
  return pattern.test(displayId);
}

/**
 * Extract role from display ID
 */
export function getRoleFromDisplayId(displayId: string): UserRole | null {
  const prefix = displayId.split("-")[0];
  const roleMap: Record<string, UserRole> = {
    FARM: "FARMER",
    CUST: "CUSTOMER",
    ADM: "ADMIN",
    AGT: "PICKUP_AGENT",
    CRP: "CR",
  };
  return roleMap[prefix] || null;
}
