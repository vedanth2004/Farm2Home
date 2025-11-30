import { UserRole } from "@prisma/client";

// Re-export UserRole for use in tests
export { UserRole };
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Action =
  | "read:users"
  | "write:users"
  | "read:products"
  | "write:products"
  | "approve:products"
  | "read:orders"
  | "write:orders"
  | "read:payments"
  | "write:payments"
  | "read:payouts"
  | "write:payouts"
  | "read:analytics"
  | "write:analytics"
  | "read:dashboard"
  | "read:pickup"
  | "write:pickup"
  | "read:delivery"
  | "write:delivery"
  | "read:reviews"
  | "write:reviews"
  | "read:coupons"
  | "write:coupons"
  | "read:refunds"
  | "write:refunds"
  | "read:logs";

export type Resource =
  | "users"
  | "products"
  | "orders"
  | "payments"
  | "payouts"
  | "analytics"
  | "pickup"
  | "delivery";

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.ADMIN]: 5,
    [UserRole.FARMER]: 4,
    [UserRole.CR]: 3,
    [UserRole.PICKUP_AGENT]: 2,
    [UserRole.CUSTOMER]: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function can(
  userRole: UserRole,
  action: Action,
  resource?: Resource,
): boolean {
  const permissions: Record<UserRole, Action[]> = {
    [UserRole.ADMIN]: [
      "read:users",
      "write:users",
      "read:products",
      "write:products",
      "approve:products",
      "read:orders",
      "write:orders",
      "read:payments",
      "write:payments",
      "read:payouts",
      "write:payouts",
      "read:analytics",
      "write:analytics",
      "read:dashboard",
      "read:pickup",
      "write:pickup",
      "read:delivery",
      "write:delivery",
      "read:reviews",
      "write:reviews",
      "read:coupons",
      "write:coupons",
      "read:refunds",
      "write:refunds",
      "read:logs",
    ],
    [UserRole.FARMER]: [
      "read:products",
      "write:products",
      "read:orders",
      "read:payouts",
      "read:analytics",
    ],
    [UserRole.CR]: [
      "read:orders",
      "read:delivery",
      "write:delivery",
      "read:payouts",
      "read:dashboard",
      "read:analytics",
    ],
    [UserRole.PICKUP_AGENT]: [
      "read:pickup",
      "write:pickup",
      "read:payouts",
      "read:analytics",
    ],
    [UserRole.CUSTOMER]: [
      "read:products",
      "read:orders",
      "write:orders",
      "read:refunds",
      "write:refunds",
    ],
  };

  return permissions[userRole]?.includes(action) ?? false;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }
  return session;
}

export async function requireRole(requiredRole: UserRole) {
  const session = await requireAuth();
  if (!hasRole(session.user.role, requiredRole)) {
    redirect("/dashboard");
  }
  return session;
}

export async function requirePermission(action: Action, resource?: Resource) {
  const session = await requireAuth();
  if (!can(session.user.role, action, resource)) {
    redirect("/dashboard");
  }
  return session;
}

export function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "/dashboard/admin";
    case UserRole.FARMER:
      return "/dashboard/farmer";
    case UserRole.CR:
      return "/dashboard/cr";
    case UserRole.PICKUP_AGENT:
      return "/dashboard/agent";
    case UserRole.CUSTOMER:
      return "/dashboard/customer";
    default:
      return "/dashboard";
  }
}
