import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");
  const eventId = searchParams.get("eventId");
  const email = searchParams.get("email");

  try {
    // Primary lookup: by session_id (canonical booking identifier)
    if (sessionId && sessionId.trim().length > 0) {
      const payment = await prisma.payment.findFirst({
        where: {
          stripeCheckoutSessionId: sessionId.trim(),
        },
        select: { status: true },
      });

      if (payment) {
        return NextResponse.json({ status: payment.status });
      }
      // If session_id not found, return NONE (don't fall back to email)
      return NextResponse.json({ status: "NONE" });
    }

    // Fallback lookup: by eventId + email (for backward compatibility)
    if (eventId && eventId.trim().length > 0 && email && email.trim().length > 0) {
      const payment = await prisma.payment.findFirst({
        where: {
          eventId: eventId.trim(),
          email: email.trim().toLowerCase(),
        },
        select: { status: true },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!payment) {
        return NextResponse.json({ status: "NONE" });
      }

      return NextResponse.json({ status: payment.status });
    }

    return NextResponse.json({ error: "session_id or (eventId + email) is required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch payment status" }, { status: 500 });
  }
}
