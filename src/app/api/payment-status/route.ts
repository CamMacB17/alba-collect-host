import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const paymentId = searchParams.get("paymentId");

  if (!paymentId || paymentId.trim().length === 0) {
    return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId.trim() },
      select: { status: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ status: payment.status });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch payment status" }, { status: 500 });
  }
}
