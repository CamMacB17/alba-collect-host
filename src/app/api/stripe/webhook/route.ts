import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendPaymentConfirmationEmail, sendEmail } from "@/lib/email";
import { assertValidPaymentTransition } from "@/lib/paymentTransitions";
import Stripe from "stripe";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[webhook] Missing stripe-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify signature and construct event
    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[webhook] Signature verification failed:", err);
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
        console.log("[webhook] Stripe event already processed, skipping", {
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

      // Read paymentId from metadata
      const paymentId = session.metadata?.paymentId;
      if (!paymentId) {
        console.warn("[webhook] checkout.session.completed missing metadata.paymentId", {
          sessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      try {
        // Load payment first to check if already PAID (idempotency check)
        const existingPayment = await prisma.payment.findUnique({
          where: { id: paymentId },
        });

        if (!existingPayment) {
          console.error("[webhook] Payment not found", { paymentId, sessionId: session.id });
          return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        // If already PAID, skip update and emails (idempotent)
        if (existingPayment.status === "PAID") {
          console.log("[webhook] Payment already PAID, skipping update", {
            paymentId,
            sessionId: session.id,
          });
          return NextResponse.json({ received: true });
        }

        // Validate transition: only allow PLEDGED -> PAID
        try {
          assertValidPaymentTransition(existingPayment.status, "PAID");
        } catch (err) {
          console.error("[webhook] Invalid payment status transition", {
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

        console.log("[webhook] Payment updated to PAID", { paymentId, sessionId: session.id });

        // Fetch payment with event details for email (check receiptEmailSentAt)
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { event: true },
        });

        if (payment && payment.event && !payment.receiptEmailSentAt) {
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
          try {
            const eventUrl = `${baseUrl}/e/${payment.event.slug}`;
            
            await sendPaymentConfirmationEmail({
              to: payment.email,
              name: payment.name,
              eventTitle: payment.event.title,
              amountPence: payment.amountPence,
              eventUrl,
            });

            // Mark email as sent
            await prisma.payment.update({
              where: { id: paymentId },
              data: { receiptEmailSentAt: new Date() },
            });
          } catch (emailErr) {
            // Log email error but don't fail the webhook
            console.error("[webhook] Failed to send payment confirmation email", {
              paymentId,
              error: emailErr,
            });
          }

          // Send notification email to organiser if email exists
          if (payment.event.organiserEmail && payment.event.organiserEmail.trim().length > 0) {
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
              });
            } catch (emailErr) {
              // Log email error but don't fail the webhook
              console.error("[webhook] Failed to send organiser notification email", {
                paymentId,
                organiserEmail: payment.event.organiserEmail,
                error: emailErr,
              });
            }
          }
        }
      } catch (err) {
        console.error("[webhook] Failed to update payment", { paymentId, error: err });
        return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    // Handle checkout.session.expired event
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentId = session.metadata?.paymentId;
      if (!paymentId) {
        console.warn("[webhook] checkout.session.expired missing metadata.paymentId", {
          sessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      try {
        // Load payment to check current status
        const existingPayment = await prisma.payment.findUnique({
          where: { id: paymentId },
        });

        if (!existingPayment) {
          console.warn("[webhook] Payment not found for expired session", {
            paymentId,
            sessionId: session.id,
          });
          return NextResponse.json({ received: true });
        }

        // Validate transition: only allow PLEDGED -> CANCELLED
        try {
          assertValidPaymentTransition(existingPayment.status, "CANCELLED");
        } catch (err) {
          console.error("[webhook] Invalid payment status transition for expired session", {
            paymentId,
            from: existingPayment.status,
            to: "CANCELLED",
            error: err instanceof Error ? err.message : String(err),
          });
          // Return success to prevent Stripe retries, but log the error
          return NextResponse.json({ received: true });
        }

        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "CANCELLED" },
        });
        console.log("[webhook] Payment updated to CANCELLED", { paymentId, sessionId: session.id });
      } catch (err) {
        console.error("[webhook] Failed to update payment on expired session", { paymentId, error: err });
        return NextResponse.json({ received: true });
      }
    }

    // Handle payment_intent.succeeded (optional)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("[webhook] payment_intent.succeeded", { paymentIntentId: paymentIntent.id });
      // Could update Payment here if needed, but checkout.session.completed is primary
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Unexpected error:", err);
    // Always return 200 to prevent Stripe retries
    return NextResponse.json({ received: true });
  }
}
