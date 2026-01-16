import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(args: {
  to: string;
  event: { title: string; slug: string; organiserName?: string | null };
  payment: { name: string; amountPence: number };
  baseUrl: string;
}): Promise<void> {
  const { to, event, payment, baseUrl } = args;

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping payment receipt email", { to });
    return;
  }

  const priceDisplay =
    payment.amountPence === null || payment.amountPence === 0
      ? "Free"
      : `£${(payment.amountPence / 100).toFixed(2)}`;

  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const organiserLine = event.organiserName ? `\nOrganiser: ${event.organiserName}` : "";

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>You're in – ${escapeHtml(event.title)}</h2>
        <p>Hi ${escapeHtml(payment.name)},</p>
        <p>You're confirmed for: <strong>${escapeHtml(event.title)}</strong></p>
        <p>Price paid: <strong>${escapeHtml(priceDisplay)}</strong>${organiserLine ? escapeHtml(organiserLine) : ""}</p>
        <p><a href="${eventUrl}" style="color: #0066cc;">View event page</a></p>
        <p>See you there!</p>
      </body>
    </html>
  `;

  const textBody = `Hi ${payment.name},

You're confirmed for: ${event.title}

Price paid: ${priceDisplay}${organiserLine}

View event: ${eventUrl}

See you there!`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `You're in – ${event.title}`,
      html: htmlBody,
      text: textBody,
    });
  } catch (error) {
    console.error("[email] Failed to send payment receipt", { to, error });
    throw error;
  }
}

/**
 * Send refund receipt email
 */
export async function sendRefundReceipt(args: {
  to: string;
  event: { title: string; slug: string };
  payment: { name: string; amountPence: number };
  refund: { id: string; amount: number };
  baseUrl: string;
}): Promise<void> {
  const { to, event, payment, refund, baseUrl } = args;

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping refund receipt email", { to });
    return;
  }

  const priceDisplay =
    payment.amountPence === null || payment.amountPence === 0
      ? "Free"
      : `£${(payment.amountPence / 100).toFixed(2)}`;

  const refundAmountDisplay = `£${(refund.amount / 100).toFixed(2)}`;
  const eventUrl = `${baseUrl}/e/${event.slug}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Refund processed – ${escapeHtml(event.title)}</h2>
        <p>Hi ${escapeHtml(payment.name)},</p>
        <p>Your payment for <strong>${escapeHtml(event.title)}</strong> has been refunded.</p>
        <p>Original amount: <strong>${escapeHtml(priceDisplay)}</strong></p>
        <p>Refund amount: <strong>${escapeHtml(refundAmountDisplay)}</strong></p>
        <p>Refund ID: ${escapeHtml(refund.id)}</p>
        <p><a href="${eventUrl}" style="color: #0066cc;">View event page</a></p>
        <p>If you have any questions, please contact the event organiser.</p>
      </body>
    </html>
  `;

  const textBody = `Hi ${payment.name},

Your payment for ${event.title} has been refunded.

Original amount: ${priceDisplay}
Refund amount: ${refundAmountDisplay}
Refund ID: ${refund.id}

View event: ${eventUrl}

If you have any questions, please contact the event organiser.`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Refund processed – ${event.title}`,
      html: htmlBody,
      text: textBody,
    });
  } catch (error) {
    console.error("[email] Failed to send refund receipt", { to, error });
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
 * Legacy sendEmail function for backward compatibility
 * @deprecated Use sendPaymentReceipt or sendRefundReceipt instead
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const { to, subject, body } = args;

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
