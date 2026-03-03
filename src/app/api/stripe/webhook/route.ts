import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendPaymentConfirmationEmail, sendEmail } from "@/lib/email";
import { reconcilePaymentFromSession } from "@/lib/reconcilePayment";
import { logger, generateCorrelationId } from "@/lib/logger";
import { getRequiredEnv } from "@/lib/env";
import { joinUrl, assertNoDoubleSlashes } from "@/lib/url";
import Stripe from "stripe";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      logger.error("Missing stripe-signature header", { correlationId });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook secret
    const webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SECRET");

    // Verify signature and construct event
    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.error("Signature verification failed", { correlationId, error: err });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process if payment_status is "paid"
      if (session.payment_status !== "paid") {
        logger.info("Session payment_status is not 'paid', skipping", {
          correlationId,
          stripeEventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });
        return NextResponse.json({ received: true });
      }

      // Check if this Stripe event has already been processed
      const existingWebhookEvent = await prisma.stripeWebhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      if (existingWebhookEvent) {
        logger.info("Stripe event already processed, skipping", {
          correlationId,
          stripeEventId: event.id,
          type: event.type,
        });
        return NextResponse.json({ received: true });
      }

      // Create webhook event record before processing
      await prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
        },
      });

      // Use shared reconciliation function
      const result = await reconcilePaymentFromSession(session, correlationId);

      // Handle results
      if (result.error === "Payment not found") {
        logger.error("Payment resolution failed", {
          correlationId,
          stripeEventId: event.id,
          sessionId: session.id,
          metadataPaymentId: session.metadata?.paymentId || null,
          clientReferenceId: session.client_reference_id || null,
        });
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      if (result.wasAlreadyPaid) {
        // Already handled, return success
        return NextResponse.json({ received: true });
      }

      if (result.error) {
        // Transition validation failed or update failed
        // Return success to prevent Stripe retries, but error is already logged
        return NextResponse.json({ received: true });
      }

      // Success - payment reconciled or updated
      // Send organiser notification if needed (this is not in reconcilePaymentFromSession)
      if (result.reconciled || result.emailSent) {
        try {
          const payment = await prisma.payment.findUnique({
            where: { id: result.paymentId },
            include: { event: true },
          });

          if (
            payment &&
            payment.event &&
            payment.event.organiserEmail &&
            payment.event.organiserEmail.trim().length > 0 &&
            !payment.organiserNotificationSentAt
          ) {
            // Count current spots filled (PAID + PLEDGED)
            const spotsFilled = await prisma.payment.count({
              where: {
                eventId: payment.event.id,
                status: {
                  in: ["PAID", "PLEDGED"],
                },
              },
            });

            const spotsDisplay =
              payment.event.maxSpots === null
                ? `${spotsFilled} spots filled (unlimited)`
                : `${spotsFilled} of ${payment.event.maxSpots} spots filled`;

            const priceDisplay =
              payment.amountPence === null || payment.amountPence === 0
                ? "Free"
                : `£${(payment.amountPence / 100).toFixed(2)}`;

            await sendEmail({
              to: payment.event.organiserEmail,
              subject: `New joiner – ${payment.event.title}`,
              body: `A new person has joined your event.

Joiner: ${payment.name} (${payment.email})
Amount paid: ${priceDisplay}

${spotsDisplay}

Payment information:
All guest payments are held securely via Stripe. Payout is processed after the event completes. Refunds (if any) are handled before payout.`,
              correlationId,
            });

            // Mark organiser notification email as sent
            await prisma.payment.update({
              where: { id: result.paymentId },
              data: { organiserNotificationSentAt: new Date() },
            });
          }
        } catch (emailErr) {
          // Log email error but don't fail the webhook
          logger.error("Failed to send organiser notification email", {
            correlationId,
            paymentId: result.paymentId,
            error: emailErr,
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    // Handle checkout.session.expired event
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;

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
        logger.warn("Payment not found for expired session", {
          correlationId,
          stripeEventId: event.id,
          sessionId: session.id,
          metadataPaymentId: metadataPaymentId || null,
          clientReferenceId: session.client_reference_id || null,
          resolutionPathUsed: "none",
        });
        return NextResponse.json({ received: true });
      }

      try {
        // Validate transition: only allow PLEDGED -> CANCELLED
        try {
          assertValidPaymentTransition(existingPayment.status, "CANCELLED");
        } catch (err) {
          logger.error("Invalid payment status transition for expired session", {
            correlationId,
            stripeEventId: event.id,
            sessionId: session.id,
            paymentId: existingPayment.id,
            resolutionPathUsed: resolutionPath,
            from: existingPayment.status,
            to: "CANCELLED",
            error: err instanceof Error ? err.message : String(err),
          });
          // Return success to prevent Stripe retries, but log the error
          return NextResponse.json({ received: true });
        }

        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { status: "CANCELLED" },
        });
        logger.info("Payment updated to CANCELLED", { correlationId, paymentId: existingPayment.id, sessionId: session.id });
      } catch (err) {
        logger.error("Payment update failed (expired session)", {
          correlationId,
          stripeEventId: event.id,
          sessionId: session.id,
          paymentId: existingPayment.id,
          resolutionPathUsed: resolutionPath,
          error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ received: true });
      }
    }

    // Handle payment_intent.succeeded (optional)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logger.info("payment_intent.succeeded", { correlationId, paymentIntentId: paymentIntent.id });
      // Could update Payment here if needed, but checkout.session.completed is primary
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Unexpected error", { correlationId, error: err });
    // Always return 200 to prevent Stripe retries
    return NextResponse.json({ received: true });
  }
}
