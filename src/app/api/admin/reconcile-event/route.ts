import { NextRequest, NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { reconcilePaymentFromSession } from "@/lib/reconcilePayment";
import { logger, generateCorrelationId } from "@/lib/logger";
import Stripe from "stripe";

/**
 * Admin-only endpoint to reconcile payments for an event
 * 
 * Usage:
 * GET /api/admin/reconcile-event?eventId=<id>&secret=<CRON_SECRET>
 * GET /api/admin/reconcile-event?slug=<slug>&secret=<CRON_SECRET>
 * 
 * This endpoint:
 * 1. Fetches all Stripe checkout sessions for the event
 * 2. Filters for payment_status="paid"
 * 3. Reconciles any CANCELLED payments to PAID
 * 4. Returns a summary of reconciliations
 */
export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const searchParams = request.nextUrl.searchParams;
  
  // Get secret from query param
  const secret = searchParams.get("secret");
  const expectedSecret = getRequiredEnv("CRON_SECRET");

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get event identifier
  const eventId = searchParams.get("eventId");
  const slug = searchParams.get("slug");

  if (!eventId && !slug) {
    return NextResponse.json(
      { error: "eventId or slug is required" },
      { status: 400 }
    );
  }

  try {
    // Find event by ID or slug
    const event = eventId
      ? await prisma.event.findUnique({ where: { id: eventId } })
      : await prisma.event.findUnique({ where: { slug: slug! } });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    logger.info("Starting reconciliation for event", {
      correlationId,
      eventId: event.id,
      slug: event.slug,
    });

    // Get Stripe client
    const stripe = getStripe();

    // Find all CANCELLED payments for this event that have a stripeCheckoutSessionId
    const cancelledPayments = await prisma.payment.findMany({
      where: {
        eventId: event.id,
        status: "CANCELLED",
        stripeCheckoutSessionId: { not: null },
      },
      select: {
        id: true,
        stripeCheckoutSessionId: true,
      },
    });

    logger.info("Found cancelled payments with session IDs", {
      correlationId,
      eventId: event.id,
      cancelledPaymentsCount: cancelledPayments.length,
    });

    // Fetch each session from Stripe and check if payment_status="paid"
    const relevantSessions: Stripe.Checkout.Session[] = [];
    for (const payment of cancelledPayments) {
      if (!payment.stripeCheckoutSessionId) continue;
      
      try {
        const session = await stripe.checkout.sessions.retrieve(
          payment.stripeCheckoutSessionId,
          { expand: ["payment_intent"] }
        );
        
        if (session.payment_status === "paid") {
          relevantSessions.push(session);
        }
      } catch (err) {
        logger.warn("Failed to retrieve Stripe session", {
          correlationId,
          sessionId: payment.stripeCheckoutSessionId,
          paymentId: payment.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("Found paid Stripe sessions for cancelled payments", {
      correlationId,
      eventId: event.id,
      relevantSessions: relevantSessions.length,
    });

    // Reconcile each session
    const results = await Promise.all(
      relevantSessions.map(async (session) => {
        try {
          const result = await reconcilePaymentFromSession(session, correlationId);
          return {
            sessionId: session.id,
            ...result,
          };
        } catch (err) {
          logger.error("Reconciliation failed for session", {
            correlationId,
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          });
          return {
            sessionId: session.id,
            paymentId: "unknown",
            reconciled: false,
            wasAlreadyPaid: false,
            emailSent: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    // Calculate summary
    const summary = {
      totalSessions: relevantSessions.length,
      reconciled: results.filter((r) => r.reconciled).length,
      alreadyPaid: results.filter((r) => r.wasAlreadyPaid).length,
      emailsSent: results.filter((r) => r.emailSent).length,
      errors: results.filter((r) => r.error).length,
    };

    logger.info("Reconciliation complete", {
      correlationId,
      eventId: event.id,
      ...summary,
    });

    return NextResponse.json({
      eventId: event.id,
      slug: event.slug,
      summary,
      results: results.map((r) => ({
        sessionId: r.sessionId,
        paymentId: r.paymentId,
        reconciled: r.reconciled,
        wasAlreadyPaid: r.wasAlreadyPaid,
        emailSent: r.emailSent,
        error: r.error || undefined,
      })),
    });
  } catch (err) {
    logger.error("Reconciliation endpoint error", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "Failed to reconcile event",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
