"use server";

import { prisma } from "@/lib/prisma";
import { cleanupPledges } from "@/lib/cleanupPledges";
import { getStripe } from "@/lib/stripe";

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

  // Do not allow marking CANCELLED payments as PAID
  if (payment.status === "CANCELLED") {
    throw new Error("Cannot mark cancelled payment as paid");
  }

  // Update payment status to PAID
  await prisma.payment.update({
    where: { id: trimmedPaymentId },
    data: { status: "PAID" },
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

export async function refundPayment(paymentId: string, adminToken: string): Promise<void> {
  const trimmedPaymentId = paymentId?.trim();
  const trimmedToken = adminToken?.trim();

  if (!trimmedPaymentId || !trimmedToken) {
    throw new Error("Invalid inputs");
  }

  const adminTokenRecord = await prisma.adminToken.findUnique({
    where: { token: trimmedToken },
  });

  if (!adminTokenRecord) {
    throw new Error("Admin link not found");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: trimmedPaymentId },
  });

  if (!payment || payment.eventId !== adminTokenRecord.eventId || payment.status !== "PAID") {
    throw new Error("Payment not found or not eligible for refund");
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("Payment has no Stripe Payment Intent ID for refund");
  }

  const stripe = getStripe();
  await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });

  await prisma.payment.update({
    where: { id: trimmedPaymentId },
    data: {
      status: "CANCELLED",
      paidAt: null,
      amountPenceCaptured: 0,
    },
  });
}

export async function refundAllPaidPayments(adminToken: string): Promise<{ refunded: number; failed: number }> {
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

  // Find all PAID payments for this event
  const paidPayments = await prisma.payment.findMany({
    where: {
      eventId: adminTokenRecord.eventId,
      status: "PAID",
    },
  });

  const stripe = getStripe();
  let refunded = 0;
  let failed = 0;

  // Refund each payment
  for (const payment of paidPayments) {
    try {
      if (!payment.stripePaymentIntentId) {
        failed++;
        continue;
      }

      await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CANCELLED",
          paidAt: undefined,
          amountPenceCaptured: 0,
        },
      });

      refunded++;
    } catch (err) {
      console.error(`[refundAllPaidPayments] Failed to refund payment ${payment.id}:`, err);
      failed++;
    }
  }

  return { refunded, failed };
}
