import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Database health check endpoint
 * Returns 200 if database is reachable, 500 if not
 */
export async function GET() {
  const health = await checkDbHealth();
  
  return NextResponse.json(
    health,
    { status: health.status === "ok" ? 200 : 500 }
  );
}
