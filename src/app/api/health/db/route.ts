import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Database health check endpoint
 * Returns 200 {ok:true} if connected, 503 {ok:false, error:"DB_UNREACHABLE"} if not
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "DB_UNREACHABLE" },
      { status: 503 }
    );
  }
}
