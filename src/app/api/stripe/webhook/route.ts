import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendPaymentConfirmationEmail, sendEmail } from "@/lib/email";
import { assertValidPaymentTransition } from "@/lib/paymentTransitions";
import { logger, generateCorrelationId } from "@/lib/logger";
import { getRequiredEnv } from "@/lib/env";
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

      // Lookup payment by stripeCheckoutSessionId (canonical identifier)
      // Fallback to paymentId from metadata for backward compatibility
      let existingPayment = await prisma.payment.findFirst({
        where: {
          stripeCheckoutSessionId: session.id,
        },
      });

      if (!existingPayment) {
        const paymentId = session.metadata?.paymentId;
        if (paymentId) {
          existingPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
          });
        }

        if (!existingPayment) {
          logger.error("Payment not found", { 
            correlationId, 
            sessionId: session.id,
            metadataPaymentId: session.metadata?.paymentId,
          });
          return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }
      }

      const paymentId = existingPayment.id;

      try {

        // If already PAID, skip update and emails (idempotent)
        if (existingPayment.status === "PAID") {
          logger.info("Payment already PAID, skipping update", {
            correlationId,
            paymentId,
            sessionId: session.id,
          });
          return NextResponse.json({ received: true });
        }

        // Validate transition: only allow PLEDGED -> PAID
        try {
          assertValidPaymentTransition(existingPayment.status, "PAID");
        } catch (err) {
          logger.error("Invalid payment status transition", {
            correlationId,
            paymentId,
            from: existingPayment.status,
            to: "PAID",
            error: err instanceof Error ? err.message : String(err),
          });
          // Return success to prevent Stripe retries, but log the error
          return NextResponse.json({ received: true });
        }

        // Prepare update data, preserving existing paidAt and amountPenceCaptured if set
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

        // Only set paidAt when transitioning PLEDGED -> PAID, and if not already set
        if (existingPayment.status === "PLEDGED" && !existingPayment.paidAt) {
          updateData.paidAt = new Date();
        }

        // Only set amountPenceCaptured if not already set
        if (existingPayment.amountPenceCaptured === null && session.amount_total) {
          updateData.amountPenceCaptured = session.amount_total;
        }

        // Update Payment
        await prisma.payment.update({
          where: { id: paymentId },
          data: updateData,
        });

        logger.info("Payment updated to PAID", { correlationId, paymentId, sessionId: session.id });

        // Fetch payment with event details for email (check receiptEmailSentAt)
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { event: true },
        });

        if (payment && payment.event && !payment.receiptEmailSentAt) {
          // Validate payment.email exists and is not empty
          if (!payment.email || payment.email.trim().length === 0) {
            logger.error("Payment missing email address - cannot send confirmation", {
              correlationId,
              paymentId,
              paymentName: payment.name,
            });
          } else {
            // Build baseUrl for event link
            const h = await headers();
            const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
            let baseUrl: string;
            if (envBase) {
              baseUrl = envBase.replace(/\/$/, "");
            } else {
              const proto = h.get("x-forwarded-proto") ?? "http";
              const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
              baseUrl = `${proto}://${host}`;
            }

            // Send payment confirmation email (idempotent: only if receiptEmailSentAt is null)
            // Recipient: attendee (payer) email
            try {
              const eventUrl = `${baseUrl}/e/${payment.event.slug}`;
              
              await sendPaymentConfirmationEmail({
                to: payment.email,
                name: payment.name,
                eventTitle: payment.event.title,
                amountPence: payment.amountPence,
                eventUrl,
                correlationId,
                replyTo: payment.event.organiserEmail && payment.event.organiserEmail.trim().length > 0
                  ? payment.event.organiserEmail.trim()
                  : undefined,
              });

              // Mark email as sent
              await prisma.payment.update({
                where: { id: paymentId },
                data: { receiptEmailSentAt: new Date() },
              });
            } catch (emailErr) {
              // Log email error but don't fail the webhook
              logger.error("Failed to send payment confirmation email", {
                correlationId,
                paymentId,
                recipient: payment.email,
                error: emailErr,
              });
            }
          }

          // Send notification email to organiser if email exists and not already sent (idempotent)
          // Recipient: organiserEmail (not attendee email)
          if (
            payment.event.organiserEmail &&
            payment.event.organiserEmail.trim().length > 0 &&
            !payment.organiserNotificationSentAt
          ) {
            try {
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

${spotsDisplay}`,
                correlationId,
              });

              // Mark organiser notification email as sent (only after successful send)
              await prisma.payment.update({
                where: { id: paymentId },
                data: { organiserNotificationSentAt: new Date() },
              });
            } catch (emailErr) {
              // Log email error but don't fail the webhook
              // Do NOT set organiserNotificationSentAt if send fails (allows retry)
              logger.error("Failed to send organiser notification email", {
                correlationId,
                paymentId,
                recipient: payment.event.organiserEmail,
                error: emailErr,
              });
            }
          }
        }
      } catch (err) {
        logger.error("Failed to update payment", { correlationId, paymentId: existingPayment.id, error: err });
        return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    // Handle checkout.session.expired event
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Lookup payment by stripeCheckoutSessionId (canonical identifier)
      let existingPayment = await prisma.payment.findFirst({
        where: {
          stripeCheckoutSessionId: session.id,
        },
      });

      // Fallback to paymentId from metadata
      if (!existingPayment) {
        const paymentId = session.metadata?.paymentId;
        if (paymentId) {
          existingPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
          });
        }
      }

      if (!existingPayment) {
        logger.warn("Payment not found for expired session", {
          correlationId,
          sessionId: session.id,
          metadataPaymentId: session.metadata?.paymentId,
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
            paymentId: existingPayment.id,
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
        logger.error("Failed to update payment on expired session", { correlationId, paymentId: existingPayment.id, error: err });
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
