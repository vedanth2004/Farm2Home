/**
 * Finite State Machine for Order Status Management
 * Ensures only valid status transitions are allowed
 */

import { OrderStatus, PaymentStatus } from "@prisma/client";

export type OrderState = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
};

/**
 * Valid transitions from each order status
 */
const VALID_TRANSITIONS: Record<
  OrderStatus,
  { allowed: OrderStatus[]; requiredPaymentStatus?: PaymentStatus[] }
> = {
  CREATED: {
    allowed: ["PAID", "CANCELLED", "PICKUP_ASSIGNED"],
    requiredPaymentStatus: ["PENDING", "SUCCESS"],
  },
  PAID: {
    allowed: ["PICKUP_ASSIGNED", "CANCELLED"],
    requiredPaymentStatus: ["SUCCESS"],
  },
  PICKUP_ASSIGNED: {
    allowed: ["PICKED_UP", "CANCELLED"],
    requiredPaymentStatus: ["SUCCESS", "PENDING"], // COD can be PENDING
  },
  PICKED_UP: {
    allowed: ["AT_CR", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  },
  AT_CR: {
    allowed: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  },
  OUT_FOR_DELIVERY: {
    allowed: ["DELIVERED", "CANCELLED"],
  },
  DELIVERED: {
    allowed: [], // Terminal state - no transitions allowed
  },
  CANCELLED: {
    allowed: [], // Terminal state - no transitions allowed
  },
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  currentPaymentStatus?: PaymentStatus,
): { valid: boolean; reason?: string } {
  // Same status is always valid (no-op)
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Terminal states cannot transition
  if (currentStatus === "DELIVERED" || currentStatus === "CANCELLED") {
    return {
      valid: false,
      reason: `Cannot transition from terminal state: ${currentStatus}`,
    };
  }

  const transitions = VALID_TRANSITIONS[currentStatus];

  if (!transitions) {
    return {
      valid: false,
      reason: `Unknown current status: ${currentStatus}`,
    };
  }

  // Check if transition is allowed
  if (!transitions.allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Invalid transition from ${currentStatus} to ${newStatus}. Allowed: ${transitions.allowed.join(", ")}`,
    };
  }

  // Check payment status requirement if specified
  if (
    transitions.requiredPaymentStatus &&
    currentPaymentStatus &&
    !transitions.requiredPaymentStatus.includes(currentPaymentStatus)
  ) {
    // Special case: COD orders can have PENDING payment until delivery
    if (newStatus === "PICKUP_ASSIGNED" && currentPaymentStatus === "PENDING") {
      return { valid: true }; // COD is valid
    }

    if (newStatus === "DELIVERED" && currentPaymentStatus === "PENDING") {
      // COD orders can be delivered with PENDING payment (cash collected on delivery)
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Payment status ${currentPaymentStatus} not allowed for transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
}

/**
 * Get allowed next statuses from current status
 */
export function getNextAllowedStatuses(
  currentStatus: OrderStatus,
): OrderStatus[] {
  const transitions = VALID_TRANSITIONS[currentStatus];
  return transitions?.allowed || [];
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  // Can only cancel if not already cancelled or delivered
  if (status === "CANCELLED" || status === "DELIVERED") {
    return false;
  }

  // Can cancel if payment is pending or failed
  if (paymentStatus === "PENDING" || paymentStatus === "FAILED") {
    return true;
  }

  // Can cancel if payment is success but order not yet picked up
  if (paymentStatus === "SUCCESS") {
    return ["CREATED", "PAID", "PICKUP_ASSIGNED"].includes(status);
  }

  return false;
}

/**
 * Validate status transition and throw if invalid
 */
export function validateTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  currentPaymentStatus?: PaymentStatus,
): void {
  const result = isValidTransition(
    currentStatus,
    newStatus,
    currentPaymentStatus,
  );

  if (!result.valid) {
    throw new Error(result.reason || "Invalid status transition");
  }
}
