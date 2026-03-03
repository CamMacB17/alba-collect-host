/**
 * Reconciliation logic for transitioning CANCELLED payments to PAID
 * when Stripe confirms payment was actually completed.
 * 
 * This is used by both webhook handler and admin reconciliation endpoint.
 */

import { prisma } from "@/lib/prisma";
import { assertValidPaymentTransition, PaymentTransitionSource } from "@/lib/paymentTransitions";
import { logger, generateCorrelationId } from "@/lib/logger";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { joinUrl, assertNoDoubleSlashes } from "@/lib/url";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export interface ReconciliationResult {
  paymentId: string;
  reconciled: boolean;
  wasAlreadyPaid: boolean;
  emailSent: boolean;
  error?: string;
}

/**
 * Reconcile a payment from Stripe checkout session
 * @param session Stripe checkout session with payment_status="paid"
 * @param correlationId Optional correlation ID for logging
 * @returns Reconciliation result
 */
export async function reconcilePaymentFromSession(
  session: Stripe.Checkout.Session,
  correlationId?: string
): Promise<ReconciliationResult> {
  const corrId = correlationId || generateCorrelationId();

  // Resolve Payment with fallback chain: metadata.paymentId -> client_reference_id -> stripeCheckoutSessionId
  let existingPayment = null;
  let resolutionPath = "";

  // Try 1: metadata.paymentId
  const metadataPaymentId = session.metadata?.paymentId;
  if (metadataPaymentId) {
    existingPayment = await prisma.payment.findUnique({
      where: { id: metadataPaymentId },
    });
    if (existingPayment) {
      resolutionPath = "metadata.paymentId";
    }
  }

  // Try 2: client_reference_id
  if (!existingPayment && session.client_reference_id) {
    existingPayment = await prisma.payment.findUnique({
      where: { id: session.client_reference_id },
    });
    if (existingPayment) {
      resolutionPath = "client_reference_id";
    }
  }

  // Try 3: stripeCheckoutSessionId (canonical identifier)
  if (!existingPayment) {
    existingPayment = await prisma.payment.findFirst({
      where: {
        stripeCheckoutSessionId: session.id,
      },
    });
    if (existingPayment) {
      resolutionPath = "stripeCheckoutSessionId";
    }
  }

  if (!existingPayment) {
    return {
      paymentId: "unknown",
      reconciled: false,
      wasAlreadyPaid: false,
      emailSent: false,
      error: "Payment not found",
    };
  }

  const paymentId = existingPayment.id;

  // If already PAID, skip update and emails (idempotent)
  if (existingPayment.status === "PAID") {
    return {
      paymentId,
      reconciled: false,
      wasAlreadyPaid: true,
      emailSent: false,
    };
  }

  // Determine if this is a reconciliation (CANCELLED -> PAID)
  const isReconciliation = existingPayment.status === "CANCELLED";
  const transitionSource: PaymentTransitionSource = isReconciliation 
    ? "stripe_webhook_reconcile" 
    : "stripe_webhook";

  // Validate transition: allow PLEDGED -> PAID or CANCELLED -> PAID (via reconcile)
  try {
    assertValidPaymentTransition(existingPayment.status, "PAID", transitionSource);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Invalid payment status transition during reconciliation", {
      correlationId: corrId,
      sessionId: session.id,
      paymentId,
      resolutionPath,
      from: existingPayment.status,
      to: "PAID",
      transitionSource,
      error: errorMsg,
    });
    return {
      paymentId,
      reconciled: false,
      wasAlreadyPaid: false,
      emailSent: false,
      error: errorMsg,
    };
  }

  // Log reconciliation if applicable
  if (isReconciliation) {
    logger.info("Reconciling payment from CANCELLED to PAID", {
      correlationId: corrId,
      paymentId,
      sessionId: session.id,
      resolutionPath,
      metadataPaymentId: metadataPaymentId || null,
      clientReferenceId: session.client_reference_id || null,
    });
  }

  // Prepare update data
  const updateData: {
    status: "PAID";
    paidAt?: Date;
    stripePaymentIntentId: string | null;
    amountPenceCaptured?: number | null;
  } = {
    status: "PAID",
    stripePaymentIntentId: session.payment_intent
      ? (typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id)
      : null,
  };

  // Set paidAt if not already set (applies to both PLEDGED -> PAID and CANCELLED -> PAID)
  if (!existingPayment.paidAt) {
    updateData.paidAt = new Date();
  }

  // Only set amountPenceCaptured if not already set
  if (existingPayment.amountPenceCaptured === null && session.amount_total) {
    updateData.amountPenceCaptured = session.amount_total;
  }

  // Update Payment
  try {
    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });
  } catch (updateErr) {
    logger.error("Payment update failed during reconciliation", {
      correlationId: corrId,
      sessionId: session.id,
      paymentId,
      resolutionPath,
      error: updateErr instanceof Error ? updateErr.message : String(updateErr),
    });
    return {
      paymentId,
      reconciled: false,
      wasAlreadyPaid: false,
      emailSent: false,
      error: "Failed to update payment",
    };
  }

  logger.info("Payment updated to PAID", { 
    correlationId: corrId, 
    paymentId, 
    sessionId: session.id,
    wasReconciliation: isReconciliation,
  });

  // Fetch payment with event details for email (check receiptEmailSentAt)
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { event: true },
  });

  let emailSent = false;
  if (payment && payment.event && !payment.receiptEmailSentAt) {
    // Validate payment.email exists and is not empty
    if (!payment.email || payment.email.trim().length === 0) {
      logger.error("Payment missing email address - cannot send confirmation", {
        correlationId: corrId,
        paymentId,
        paymentName: payment.name,
      });
    } else {
      // Build baseUrl for event link
      const h = await headers();
      const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
      let baseUrl: string;
      if (envBase) {
        baseUrl = envBase;
      } else {
        const proto = h.get("x-forwarded-proto") ?? "http";
        const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
        baseUrl = `${proto}://${host}`;
      }

      // Send payment confirmation email (idempotent: only if receiptEmailSentAt is null)
      try {
        const eventUrl = joinUrl(baseUrl, "e", payment.event.slug);
        assertNoDoubleSlashes(eventUrl, "reconciliation eventUrl");
        
        await sendPaymentConfirmationEmail({
          to: payment.email,
          name: payment.name,
          eventTitle: payment.event.title,
          amountPence: payment.amountPence,
          eventUrl,
          sessionId: session.id,
          correlationId: corrId,
          replyTo: payment.event.organiserEmail && payment.event.organiserEmail.trim().length > 0
            ? payment.event.organiserEmail.trim()
            : undefined,
        });

        // Mark email as sent
        await prisma.payment.update({
          where: { id: paymentId },
          data: { receiptEmailSentAt: new Date() },
        });
        
        emailSent = true;
      } catch (emailErr) {
        // Log email error but don't fail the reconciliation
        logger.error("Failed to send payment confirmation email during reconciliation", {
          correlationId: corrId,
          paymentId,
          recipient: payment.email,
          error: emailErr,
        });
      }
    }
  }

  return {
    paymentId,
    reconciled: true,
    wasAlreadyPaid: false,
    emailSent,
  };
}
