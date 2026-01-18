import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";

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
            pricePence: true,
            maxSpots: true,
            closedAt: true,
            organiserEmail: true,
            adminTokens: {
              select: {
                token: true,
              },
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    let status: "PAID" | "PLEDGED" | "CANCELLED" | "REFUNDED" | "NOT_FOUND";
    if (!payment) {
      status = "NOT_FOUND";
    } else if (payment.status === "CANCELLED" && payment.refundedAt) {
      status = "REFUNDED";
    } else {
      status = payment.status as "PAID" | "PLEDGED" | "CANCELLED";
    }

    return NextResponse.json({
      status,
      event: payment
        ? {
            id: payment.event.id,
            title: payment.event.title,
            slug: payment.event.slug,
            pricePence: payment.event.pricePence,
            maxSpots: payment.event.maxSpots,
            closedAt: payment.event.closedAt,
            organiserEmail: payment.event.organiserEmail,
            adminToken: payment.event.adminTokens[0]?.token || null,
          }
        : null,
      payment: payment
        ? {
            id: payment.id,
            name: payment.name,
            email: payment.email,
            status: payment.status,
            paidAt: payment.paidAt,
            refundedAt: payment.refundedAt,
            amountPenceCaptured: payment.amountPenceCaptured,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}
