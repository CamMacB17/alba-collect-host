import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("eventId");
  const email = searchParams.get("email");

  if (!eventId || eventId.trim().length === 0) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  if (!email || email.trim().length === 0) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    // Find latest payment for this event + email, ordered by createdAt desc
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
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch payment status" }, { status: 500 });
  }
}
