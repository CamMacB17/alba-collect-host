"use server";

import { prisma } from "@/lib/prisma";
import { cleanupPledges } from "@/lib/cleanupPledges";
import { getStripe } from "@/lib/stripe";
import { assertValidPaymentTransition } from "@/lib/paymentTransitions";
import { logAdminAction } from "@/lib/adminActionLog";
import { sendRefundConfirmationEmail } from "@/lib/email";
import { headers } from "next/headers";

export async function cancelPledge(paymentId: string, adminToken: string): Promise<void> {
  // Validate inputs are non-empty after trim
  const trimmedPaymentId = paymentId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedPaymentId || trimmedPaymentId.length === 0) {
    throw new Error("Payment ID is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Payment by id AND ensure it belongs to the same eventId as the admin token
  const payment = await prisma.payment.findUnique({
    where: { id: trimmedPaymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Verify payment belongs to the same event as the admin token
  if (payment.eventId !== adminTokenRecord.eventId) {
    throw new Error("Payment not found");
  }

  // Validate transition: only allow PLEDGED -> CANCELLED
  assertValidPaymentTransition(payment.status, "CANCELLED");

  // Update that Payment status to CANCELLED
  await prisma.payment.update({
    where: { id: trimmedPaymentId },
    data: { status: "CANCELLED" },
  });
}

export async function markPaid(paymentId: string, adminToken: string): Promise<void> {
  // Validate inputs are non-empty after trim
  const trimmedPaymentId = paymentId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedPaymentId || trimmedPaymentId.length === 0) {
    throw new Error("Payment ID is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Payment by id AND ensure it belongs to the same eventId as the admin token
  const payment = await prisma.payment.findUnique({
    where: { id: trimmedPaymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Verify payment belongs to the same event as the admin token
  if (payment.eventId !== adminTokenRecord.eventId) {
    throw new Error("Payment not found");
  }

  // Validate transition: only allow PLEDGED -> PAID
  assertValidPaymentTransition(payment.status, "PAID");

  // Prepare update data
  const updateData: { status: "PAID"; paidAt?: Date } = {
    status: "PAID",
  };

  // Only set paidAt when transitioning PLEDGED -> PAID, and if not already set
  if (payment.status === "PLEDGED" && !payment.paidAt) {
    updateData.paidAt = new Date();
  }

  // Update payment status to PAID
  await prisma.payment.update({
    where: { id: trimmedPaymentId },
    data: updateData,
  });
}

export async function updateEventTitle(eventId: string, title: string, adminToken: string): Promise<void> {
  // Validate inputs are non-empty after trim
  const trimmedEventId = eventId?.trim();
  const trimmedTitle = title?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedEventId || trimmedEventId.length === 0) {
    throw new Error("Event ID is required");
  }

  if (!trimmedTitle || trimmedTitle.length === 0) {
    throw new Error("Title is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Event by id
  const event = await prisma.event.findUnique({
    where: { id: trimmedEventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Validate eventId matches the admin token's eventId
  if (event.id !== adminTokenRecord.eventId) {
    throw new Error("Event not found");
  }

  // Update Event.title
  await prisma.event.update({
    where: { id: trimmedEventId },
    data: { title: trimmedTitle },
  });
}

export async function updateMaxSpots(
  eventId: string,
  maxSpots: number | null,
  adminToken: string
): Promise<void> {
  // Validate inputs
  const trimmedEventId = eventId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedEventId || trimmedEventId.length === 0) {
    throw new Error("Event ID is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Validate maxSpots is a number
  if (maxSpots === null || maxSpots === undefined || isNaN(maxSpots)) {
    throw new Error("Max spots must be a number");
  }

  // Ensure maxSpots is a number type
  const maxSpotsNumber = Number(maxSpots);
  if (isNaN(maxSpotsNumber)) {
    throw new Error("Max spots must be a number");
  }

  // maxSpots must be >= 1
  if (maxSpotsNumber < 1) {
    throw new Error("Max spots must be at least 1");
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Event by id
  const event = await prisma.event.findUnique({
    where: { id: trimmedEventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Validate eventId matches the admin token's eventId
  if (event.id !== adminTokenRecord.eventId) {
    throw new Error("Event not found");
  }

  // Count current active payments for the event
  const activeCount = await prisma.payment.count({
    where: {
      eventId: event.id,
      status: {
        in: ["PLEDGED", "PAID"],
      },
    },
  });

  // If maxSpots < activeCount, throw error
  if (maxSpotsNumber < activeCount) {
    throw new Error("Cannot set max spots below current number of participants");
  }

  // Update Event.maxSpots (always a number now)
  await prisma.event.update({
    where: { id: trimmedEventId },
    data: { maxSpots: maxSpotsNumber },
  });
}

export async function updateEventPrice(
  eventId: string,
  pricePence: number | null,
  adminToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Validate inputs
  const trimmedEventId = eventId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedEventId || trimmedEventId.length === 0) {
    throw new Error("Event ID is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Validate pricePence is a number
  if (pricePence === null || pricePence === undefined || isNaN(pricePence)) {
    return { ok: false, error: "Price must be a number" };
  }

  // Ensure pricePence is a number type
  const pricePenceNumber = Number(pricePence);
  if (isNaN(pricePenceNumber)) {
    return { ok: false, error: "Price must be a number" };
  }

  // pricePence must be >= 0
  if (pricePenceNumber < 0) {
    return { ok: false, error: "Price must be 0 or more" };
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Event by id and count PAID payments in a single query if possible
  const event = await prisma.event.findUnique({
    where: { id: trimmedEventId },
    select: {
      id: true,
      pricePence: true,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Validate eventId matches the admin token's eventId
  if (event.id !== adminTokenRecord.eventId) {
    throw new Error("Event not found");
  }

  // Hard rule: Price cannot change after any PAID payments exist
  const paidCount = await prisma.payment.count({
    where: {
      eventId: event.id,
      status: "PAID",
    },
  });

  if (paidCount > 0) {
    // Check if price is actually changing
    if (event.pricePence !== pricePenceNumber) {
      return { ok: false, error: "Price is locked after the first payment." };
    }
  }

  // Update ONLY Event.pricePence (always a number now)
  await prisma.event.update({
    where: { id: trimmedEventId },
    data: { pricePence: pricePenceNumber },
  });

  return { ok: true };
}

export async function closeEvent(eventId: string, adminToken: string): Promise<void> {
  // Validate inputs
  const trimmedEventId = eventId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedEventId || trimmedEventId.length === 0) {
    throw new Error("Event ID is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Event by id
  const event = await prisma.event.findUnique({
    where: { id: trimmedEventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Validate eventId matches the admin token's eventId
  if (event.id !== adminTokenRecord.eventId) {
    throw new Error("Event not found");
  }

  // Update Event.closedAt to new Date()
  await prisma.event.update({
    where: { id: trimmedEventId },
    data: { closedAt: new Date() },
  });

  // Log the action
  await logAdminAction({
    eventId: event.id,
    adminToken: trimmedToken,
    actionType: "EVENT_CLOSE",
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

export async function reopenEvent(eventId: string, adminToken: string): Promise<void> {
  // Validate inputs
  const trimmedEventId = eventId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedEventId || trimmedEventId.length === 0) {
    throw new Error("Event ID is required");
  }

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Look up AdminToken by token string
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Look up Event by id
  const event = await prisma.event.findUnique({
    where: { id: trimmedEventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Validate eventId matches the admin token's eventId
  if (event.id !== adminTokenRecord.eventId) {
    throw new Error("Event not found");
  }

  // Update Event.closedAt to null (use undefined for Prisma)
  await prisma.event.update({
    where: { id: trimmedEventId },
    data: { closedAt: undefined },
  });

  // Log the action
  await logAdminAction({
    eventId: event.id,
    adminToken: trimmedToken,
    actionType: "EVENT_REOPEN",
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

export async function cleanupAbandonedPledges(adminToken: string): Promise<{ cleaned: number }> {
  // Validate admin token
  const trimmedToken = adminToken?.trim();

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  // Look up AdminToken by token string to verify it's valid
  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Call the cleanup function and return the count
  const count = await cleanupPledges();
  return { cleaned: count };
}

export async function refundPayment(paymentId: string, adminToken: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedPaymentId = paymentId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedPaymentId || !trimmedToken) {
    return { ok: false, error: "Invalid inputs" };
  }

  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    return { ok: false, error: "Admin link not found" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Read payment row within transaction
      const payment = await tx.payment.findUnique({
        where: { id: trimmedPaymentId },
      });

      if (!payment || payment.eventId !== adminTokenRecord.eventId) {
        throw new Error("Payment not found");
      }

      // Hard fail if not PAID
      if (payment.status !== "PAID") {
        throw new Error("Payment is not PAID and cannot be refunded");
      }

      // Hard fail if already refunded
      if (payment.refundedAt !== null || payment.stripeRefundId !== null) {
        throw new Error("Payment has already been refunded");
      }

      // Must have Stripe payment intent ID to refund
      if (!payment.stripePaymentIntentId) {
        throw new Error("Missing Stripe payment intent id; cannot refund.");
      }

      // Extract to const for type narrowing
      const paymentIntentId = payment.stripePaymentIntentId;

      // Call Stripe refund
      const stripe = getStripe();
      const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

      // Update payment with refund metadata
      await tx.payment.update({
        where: { id: trimmedPaymentId },
        data: {
          status: "CANCELLED",
          paidAt: undefined,
          amountPenceCaptured: 0,
          refundedAt: new Date(),
          stripeRefundId: refund.id,
        },
      });
    });

    // Send refund email if not already sent (after transaction succeeds)
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: trimmedPaymentId },
      include: { event: true },
    });

    if (updatedPayment && updatedPayment.event && !updatedPayment.refundEmailSentAt) {
      try {
        // Build baseUrl
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

        const eventUrl = `${baseUrl}/e/${updatedPayment.event.slug}`;
        const refundAmount = updatedPayment.amountPenceCaptured || updatedPayment.amountPence;

        await sendRefundConfirmationEmail({
          to: updatedPayment.email,
          name: updatedPayment.name,
          eventTitle: updatedPayment.event.title,
          amountPence: refundAmount,
          eventUrl,
        });

        // Mark refund email as sent
        await prisma.payment.update({
          where: { id: trimmedPaymentId },
          data: { refundEmailSentAt: new Date() },
        });
      } catch (emailErr) {
        // Log email error but don't fail the refund
        console.error("[refundPayment] Failed to send refund receipt email", {
          paymentId: trimmedPaymentId,
          error: emailErr,
        });
      }
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Failed to refund payment" };
  }
}

export async function refundAllPaidPayments(adminToken: string): Promise<{ attempted: number; refunded: number; skippedAlreadyRefunded: number; failed: number }> {
  const trimmedToken = adminToken?.trim();

  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error("Admin token is required");
  }

  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  // Find all PAID payments for this event that are not already refunded
  const paidPayments = await prisma.payment.findMany({
    where: {
      eventId: adminTokenRecord.eventId,
      status: "PAID",
      refundedAt: null,
      stripeRefundId: null,
    },
  });

  const stripe = getStripe();
  let refunded = 0;
  let failed = 0;
  let skippedAlreadyRefunded = 0;

  // Also count payments that are PAID but already have refund metadata (shouldn't happen, but defensive)
  const alreadyRefundedCount = await prisma.payment.count({
    where: {
      eventId: adminTokenRecord.eventId,
      status: "PAID",
      OR: [
        { refundedAt: { not: null } },
        { stripeRefundId: { not: null } },
      ],
    },
  });
  skippedAlreadyRefunded = alreadyRefundedCount;

  // Build baseUrl once for all emails
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

  // Refund each payment
  for (const payment of paidPayments) {
    try {
      // Must have Stripe payment intent ID to refund
      if (!payment.stripePaymentIntentId) {
        failed++;
        continue;
      }

      // Extract to const for type narrowing
      const paymentIntentId = payment.stripePaymentIntentId;
      let refundId: string | null = null;

      // Use transaction for each refund to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Re-check within transaction to prevent double-refund
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });

        if (!currentPayment) {
          throw new Error("Payment not found");
        }

        // Validate transition: only allow PAID -> CANCELLED
        assertValidPaymentTransition(currentPayment.status, "CANCELLED");

        // Hard fail if already refunded
        if (currentPayment.refundedAt !== null || currentPayment.stripeRefundId !== null) {
          throw new Error("Payment has already been refunded");
        }

        // Must have Stripe payment intent ID to refund
        if (!currentPayment.stripePaymentIntentId) {
          throw new Error("Missing Stripe payment intent id; cannot refund.");
        }
        const paymentIntentId = currentPayment.stripePaymentIntentId;

        // Call Stripe refund
        const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
        refundId = refund.id;

        // Prepare update data
        const updateData: {
          status: "CANCELLED";
          paidAt: undefined;
          amountPenceCaptured: number;
          refundedAt: Date;
          stripeRefundId: string;
        } = {
          status: "CANCELLED",
          paidAt: undefined,
          amountPenceCaptured: 0,
          refundedAt: new Date(),
          stripeRefundId: refund.id,
        };

        // Only set refundedAt when transitioning PAID -> CANCELLED (already validated above)
        // refundedAt is already set in updateData above

        // Update payment with refund metadata
        await tx.payment.update({
          where: { id: payment.id },
          data: updateData,
        });
      });

      // Send refund email if not already sent (after transaction succeeds)
      if (refundId) {
        const updatedPayment = await prisma.payment.findUnique({
          where: { id: payment.id },
          include: { event: true },
        });

        if (updatedPayment && updatedPayment.event && !updatedPayment.refundEmailSentAt) {
          try {
            const eventUrl = `${baseUrl}/e/${updatedPayment.event.slug}`;
            const refundAmount = updatedPayment.amountPenceCaptured || updatedPayment.amountPence;

            await sendRefundConfirmationEmail({
              to: updatedPayment.email,
              name: updatedPayment.name,
              eventTitle: updatedPayment.event.title,
              amountPence: refundAmount,
              eventUrl,
            });

            // Mark refund email as sent
            await prisma.payment.update({
              where: { id: payment.id },
              data: { refundEmailSentAt: new Date() },
            });
          } catch (emailErr) {
            // Log email error but don't fail the refund
            console.error(`[refundAllPaidPayments] Failed to send refund receipt email for payment ${payment.id}:`, emailErr);
          }
        }
      }

      refunded++;
    } catch (err) {
      console.error(`[refundAllPaidPayments] Failed to refund payment ${payment.id}:`, err);
      failed++;
    }
  }

  const result = { attempted: paidPayments.length, refunded, skippedAlreadyRefunded, failed };

  // Log the action
  await logAdminAction({
    eventId: adminTokenRecord.eventId,
    adminToken: trimmedToken,
    actionType: "REFUND_ALL",
    metadata: {
      attempted: result.attempted,
      refunded: result.refunded,
      skippedAlreadyRefunded: result.skippedAlreadyRefunded,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    },
  });

  return result;
}
