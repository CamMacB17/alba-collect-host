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

  try {
    const cleaned = await cleanupPledges();
    return NextResponse.json({ cleaned });
  } catch (error) {
    console.error("Cleanup pledges error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: "Failed to cleanup pledges", 
        message: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}
