import { PaymentStatus } from "@prisma/client";

/**
 * Validates payment status transitions.
 * Allowed transitions:
 * - PLEDGED -> PAID
 * - PLEDGED -> CANCELLED
 * - PAID -> CANCELLED
 * - Any status -> same status (no-op)
 *
 * @throws Error if transition is invalid
 */
export function assertValidTransition(
  from: PaymentStatus,
  to: PaymentStatus
): void {
  // Allow no-op transitions
  if (from === to) {
    return;
  }

  // Define allowed transitions
  const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    PLEDGED: ["PAID", "CANCELLED"],
    PAID: ["CANCELLED"],
    CANCELLED: [], // No transitions allowed from CANCELLED
  };

  const allowed = allowedTransitions[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid payment status transition: ${from} -> ${to}`
    );
  }
}
