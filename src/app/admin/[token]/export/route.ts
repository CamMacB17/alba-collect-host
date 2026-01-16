import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Escapes a CSV field value
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a date for CSV export
 */
function formatDateForCsv(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }
  return date.toISOString();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate admin token exactly the same way the admin page does
  const adminToken = await prisma.adminToken.findUnique({
    where: { token },
  });

  if (!adminToken) {
    return NextResponse.json({ error: "Admin link not found" }, { status: 404 });
  }

  // Fetch event to get slug for filename
  const event = await prisma.event.findUnique({
    where: { id: adminToken.eventId },
    select: { slug: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Fetch all Payments for the event, ordered by createdAt asc
  const payments = await prisma.payment.findMany({
    where: {
      eventId: adminToken.eventId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      name: true,
      email: true,
      status: true,
      paidAt: true,
      refundedAt: true,
      stripePaymentIntentId: true,
      stripeRefundId: true,
      createdAt: true,
    },
  });

  // Build CSV content
  const headers = [
    "name",
    "email",
    "status",
    "paidAt",
    "refundedAt",
    "stripePaymentIntentId",
    "stripeRefundId",
    "createdAt",
  ];

  const rows = payments.map((payment) => [
    escapeCsvValue(payment.name),
    escapeCsvValue(payment.email),
    escapeCsvValue(payment.status),
    formatDateForCsv(payment.paidAt),
    formatDateForCsv(payment.refundedAt),
    escapeCsvValue(payment.stripePaymentIntentId),
    escapeCsvValue(payment.stripeRefundId),
    formatDateForCsv(payment.createdAt),
  ]);

  // Combine header and rows
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ];

  const csvContent = csvLines.join("\n");

  // Return CSV response
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alba-event-${event.slug}.csv"`,
    },
  });
}
