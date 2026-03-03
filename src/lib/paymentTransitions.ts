/**
 * Transition context/source for payment status changes
 */
export type PaymentTransitionSource = 
  | "ui" // UI/admin actions
  | "stripe_webhook" // Normal Stripe webhook
  | "stripe_webhook_reconcile"; // Stripe webhook reconciliation (CANCELLED -> PAID)

/**
 * Validates payment status transitions.
 * Allowed transitions:
 * - PLEDGED -> PAID (any source)
 * - PLEDGED -> CANCELLED (any source)
 * - PAID -> CANCELLED (any source)
 * - CANCELLED -> PAID (only stripe_webhook_reconcile source)
 * - Any status -> same status (no-op)
 *
 * @throws Error if transition is invalid
 */
export function assertValidPaymentTransition(
  from: string, 
  to: string, 
  source: PaymentTransitionSource = "ui"
): void {
  // Allow no-op transitions
  if (from === to) {
    return;
  }

  // Special case: CANCELLED -> PAID only allowed via webhook reconciliation
  if (from === "CANCELLED" && to === "PAID") {
    if (source === "stripe_webhook_reconcile") {
      return; // Allow this transition
    }
    throw new Error(
      `Invalid payment status transition: ${from} -> ${to}. CANCELLED -> PAID is only allowed via Stripe webhook reconciliation.`
    );
  }

  // Define allowed transitions for other cases
  const allowedTransitions: Record<string, string[]> = {
    PLEDGED: ["PAID", "CANCELLED"],
    PAID: ["CANCELLED"],
    CANCELLED: [], // No other transitions allowed from CANCELLED (except PAID via reconcile, handled above)
  };

  const allowed = allowedTransitions[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid payment status transition: ${from} -> ${to}`
    );
  }
}
