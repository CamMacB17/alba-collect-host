/**
 * Placeholder email sending helper.
 * TODO: Replace with actual email provider integration (e.g., SendGrid, Resend, AWS SES).
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const { to, subject, body } = args;

  // Placeholder implementation - log instead of sending
  console.log("[sendEmail] Would send email:", {
    to,
    subject,
    body,
  });

  // TODO: Implement actual email sending
  // Example with a future provider:
  // await emailProvider.send({ to, subject, body });
}
