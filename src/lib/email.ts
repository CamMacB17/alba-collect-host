import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(args: {
  to: string;
  name: string;
  eventTitle: string;
  amountPence: number;
  eventUrl: string;
  correlationId?: string;
  replyTo?: string;
}): Promise<void> {
  const { to, name, eventTitle, amountPence, eventUrl, correlationId, replyTo } = args;

  // Guard missing email address
  if (!to || to.trim().length === 0) {
    logger.warn("Missing email address, skipping payment confirmation", { correlationId, name, eventTitle });
    return;
  }

  if (!resend) {
    logger.warn("RESEND_API_KEY not set, skipping payment confirmation email", { correlationId, to });
    return;
  }

  const amountDisplay =
    amountPence === null || amountPence === 0
      ? "Free"
      : `£${(amountPence / 100).toFixed(2)}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Payment confirmed – ${escapeHtml(eventTitle)}</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your payment of <strong>${escapeHtml(amountDisplay)}</strong> for <strong>${escapeHtml(eventTitle)}</strong> has been confirmed.</p>
        <p><a href="${eventUrl}">View event page</a></p>
      </body>
    </html>
  `;

  const textBody = `Hi ${name},

Your payment of ${amountDisplay} for ${eventTitle} has been confirmed.

View event: ${eventUrl}`;

  try {
    const emailOptions: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
      replyTo?: string;
    } = {
      from: fromEmail,
      to,
      subject: `Payment confirmed – ${eventTitle}`,
      html: htmlBody,
      text: textBody,
    };

    if (replyTo && replyTo.trim().length > 0) {
      emailOptions.replyTo = replyTo.trim();
    }

    await resend.emails.send(emailOptions);
    logger.info("Payment confirmation email sent", { correlationId, to, recipient: to, eventTitle, replyTo });
  } catch (error) {
    logger.error("Failed to send payment confirmation email", { correlationId, to, error });
    throw error;
  }
}

/**
 * Send refund confirmation email
 */
export async function sendRefundConfirmationEmail(args: {
  to: string;
  name: string;
  eventTitle: string;
  amountPence: number;
  eventUrl: string;
  correlationId?: string;
  replyTo?: string;
}): Promise<void> {
  const { to, name, eventTitle, amountPence, eventUrl, correlationId, replyTo } = args;

  // Guard missing email address
  if (!to || to.trim().length === 0) {
    logger.warn("Missing email address, skipping refund confirmation", { correlationId, name, eventTitle });
    return;
  }

  if (!resend) {
    logger.warn("RESEND_API_KEY not set, skipping refund confirmation email", { correlationId, to });
    return;
  }

  const amountDisplay =
    amountPence === null || amountPence === 0
      ? "Free"
      : `£${(amountPence / 100).toFixed(2)}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Refund processed – ${escapeHtml(eventTitle)}</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your payment of <strong>${escapeHtml(amountDisplay)}</strong> for <strong>${escapeHtml(eventTitle)}</strong> has been refunded.</p>
        <p><a href="${eventUrl}">View event page</a></p>
      </body>
    </html>
  `;

  const textBody = `Hi ${name},

Your payment of ${amountDisplay} for ${eventTitle} has been refunded.

View event: ${eventUrl}`;

  try {
    const emailOptions: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
      replyTo?: string;
    } = {
      from: fromEmail,
      to,
      subject: `Refund processed – ${eventTitle}`,
      html: htmlBody,
      text: textBody,
    };

    if (replyTo && replyTo.trim().length > 0) {
      emailOptions.replyTo = replyTo.trim();
    }

    await resend.emails.send(emailOptions);
    logger.info("Refund confirmation email sent", { correlationId, to, eventTitle, replyTo });
  } catch (error) {
    logger.error("Failed to send refund confirmation email", { correlationId, to, error });
    throw error;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Legacy sendEmail function for backward compatibility (organiser notifications)
 * @deprecated Use sendPaymentConfirmationEmail or sendRefundConfirmationEmail instead
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
  correlationId?: string;
}): Promise<void> {
  const { to, subject, body, correlationId } = args;

  if (!to || to.trim().length === 0) {
    logger.warn("Missing email address, skipping email", { correlationId, subject });
    return;
  }

  if (!resend) {
    logger.warn("RESEND_API_KEY not set, skipping email", { correlationId, to, subject });
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
    });
    logger.info("Email sent", { correlationId, to, recipient: to, subject });
  } catch (error) {
    logger.error("Failed to send email", { correlationId, to, subject, error });
    throw error;
  }
}
