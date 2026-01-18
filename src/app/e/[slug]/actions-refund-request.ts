"use server";

import { sendEmail } from "@/lib/email";
import { logger, generateCorrelationId } from "@/lib/logger";
import { getRequiredEnv } from "@/lib/env";

export async function requestRefund(args: {
  eventTitle: string;
  attendeeName: string;
  attendeeEmail: string;
  paymentId: string;
  amountPence: number;
  organiserEmail: string;
  adminToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const correlationId = generateCorrelationId();
  const { eventTitle, attendeeName, attendeeEmail, paymentId, amountPence, organiserEmail, adminToken } = args;

  if (!organiserEmail || organiserEmail.trim().length === 0) {
    return { ok: false, error: "Organiser email not available" };
  }

  const appUrl = getRequiredEnv("APP_URL").replace(/\/$/, "");
  const adminUrl = `${appUrl}/admin/${adminToken}`;
  const amountDisplay = amountPence === 0 ? "Free" : `£${(amountPence / 100).toFixed(2)}`;

  const emailBody = `A refund has been requested for a payment.

Event: ${eventTitle}
Attendee: ${attendeeName} (${attendeeEmail})
Payment ID: ${paymentId}
Amount: ${amountDisplay}

Process refund: ${adminUrl}`;

  try {
    // Send to organiser and CC ops email (if configured)
    const opsEmail = process.env.ALBA_OPS_EMAIL?.trim();
    const toEmails = opsEmail ? [organiserEmail, opsEmail] : [organiserEmail];

    await sendEmail({
      to: toEmails.join(", "),
      subject: `Refund requested – ${eventTitle}`,
      body: emailBody,
      correlationId,
    });

    logger.info("Refund request email sent", {
      correlationId,
      eventTitle,
      attendeeEmail,
      paymentId,
      organiserEmail,
      adminUrl,
      opsEmailCc: opsEmail || null,
    });

    return { ok: true };
  } catch (err) {
    logger.error("Failed to send refund request email", {
      correlationId,
      eventTitle,
      attendeeEmail,
      paymentId,
      organiserEmail,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "Failed to send refund request" };
  }
}
