import { NextRequest, NextResponse } from "next/server";
import { cleanupPledges } from "@/lib/cleanupPledges";
import { getRequiredEnv } from "@/lib/env";

async function handleCleanup(req: NextRequest): Promise<NextResponse> {
  const expectedSecret = getRequiredEnv("CRON_SECRET");

  // Try to get secret from header (POST) or query param (GET)
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleaned = await cleanupPledges();

  return NextResponse.json({ cleaned });
}

export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}
