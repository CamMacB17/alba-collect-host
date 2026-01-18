import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";

function formatICSDate(date: Date): string {
  // Format date as YYYYMMDDTHHmmssZ (UTC)
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeICSValue(value: string): string {
  // Escape special characters in ICS values
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(request: NextRequest) {
  unstable_noStore();

  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");

  if (!sessionId || sessionId.trim().length === 0) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        stripeCheckoutSessionId: sessionId.trim(),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            organiserName: true,
            organiserEmail: true,
            startsAt: true,
          },
        },
      },
    });

    if (!payment || !payment.event) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!payment.event.startsAt) {
      return NextResponse.json({ error: "Event has no start time" }, { status: 400 });
    }

    const startDate = new Date(payment.event.startsAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 60 minutes duration

    const now = new Date();
    const uid = `event-${payment.event.id}-${payment.id}@alba-collect`;

    // Generate ICS content
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Alba Events//NONSGML v1.0//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(now)}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${escapeICSValue(payment.event.title)}`,
      payment.event.organiserEmail
        ? `ORGANIZER;CN=${escapeICSValue(payment.event.organiserName)}:mailto:${payment.event.organiserEmail}`
        : `ORGANIZER;CN=${escapeICSValue(payment.event.organiserName)}`,
      `DESCRIPTION:${escapeICSValue(`Event: ${payment.event.title}\nOrganiser: ${payment.event.organiserName}`)}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const icsContent = icsLines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${payment.event.title.replace(/[^a-z0-9]/gi, "_")}.ics"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate calendar file" }, { status: 500 });
  }
}
