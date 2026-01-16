import { Resend } from "resend";

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
}): Promise<void> {
  const { to, name, eventTitle, amountPence, eventUrl } = args;

  // Guard missing email address
  if (!to || to.trim().length === 0) {
    console.warn("[email] Missing email address, skipping payment confirmation", { name, eventTitle });
    return;
  }

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping payment confirmation email", { to });
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
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Payment confirmed – ${eventTitle}`,
      html: htmlBody,
      text: textBody,
    });
  } catch (error) {
    console.error("[email] Failed to send payment confirmation email", { to, error });
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
}): Promise<void> {
  const { to, name, eventTitle, amountPence, eventUrl } = args;

  // Guard missing email address
  if (!to || to.trim().length === 0) {
    console.warn("[email] Missing email address, skipping refund confirmation", { name, eventTitle });
    return;
  }

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping refund confirmation email", { to });
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
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Refund processed – ${eventTitle}`,
      html: htmlBody,
      text: textBody,
    });
  } catch (error) {
    console.error("[email] Failed to send refund confirmation email", { to, error });
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
}): Promise<void> {
  const { to, subject, body } = args;

  if (!to || to.trim().length === 0) {
    console.warn("[email] Missing email address, skipping email", { subject });
    return;
  }

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping email", { to, subject });
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
    });
  } catch (error) {
    console.error("[email] Failed to send email", { to, subject, error });
    throw error;
  }
}
