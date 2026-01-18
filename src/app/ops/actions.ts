"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getOptionalEnv } from "@/lib/env";

export async function refundPaymentOps(paymentId: string, key: string): Promise<{ success: true } | { error: string }> {
  // Validate access
  const opsPassword = getOptionalEnv("OPS_PASSWORD", "");
  if (!opsPassword || opsPassword.trim().length === 0 || key !== opsPassword) {
    throw new Error("NOT_AUTHORISED");
  }

  // Fetch payment with event
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { event: true },
  });

  if (!payment) {
    return { error: "Payment not found" };
  }

  // Only allow refund if payment.status === "PAID" and stripePaymentIntentId exists
  if (payment.status !== "PAID") {
    return { error: "Payment is not PAID and cannot be refunded" };
  }

  if (!payment.stripePaymentIntentId) {
    return { error: "Missing Stripe payment intent id; cannot refund" };
  }

  // Call Stripe refund
  const stripe = getStripe();
  let refund;
  try {
    refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
  } catch (stripeError) {
    // If Stripe fails, do not update DB. Throw.
    const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
    throw new Error(`Stripe refund failed: ${errorMessage}`);
  }

  // Update payment in DB
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "CANCELLED",
      refundedAt: new Date(),
      stripeRefundId: refund.id,
      amountPenceCaptured: 0,
      paidAt: null,
    },
  });

  // Log success
  console.log("OPS_REFUND_SUCCESS", {
    paymentId,
    eventId: payment.eventId,
    refundId: refund.id,
  });

  return { success: true };
}
