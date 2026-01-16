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
export function assertValidPaymentTransition(from: string, to: string): void {
  // Allow no-op transitions
  if (from === to) {
    return;
  }

  // Define allowed transitions
  const allowedTransitions: Record<string, string[]> = {
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
