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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isUnreachable = errorMessage.includes("DATABASE_UNREACHABLE") ||
                         errorMessage.includes("Database unreachable") ||
                         errorMessage.includes("Can't reach database server") ||
                         errorMessage.includes("ECONNREFUSED");
    
    if (isUnreachable) {
      // Log single-line error and return 200 to avoid spam retries
      console.error("Cleanup skipped: database unreachable");
      return NextResponse.json({ cleaned: 0, skipped: true, reason: "database_unreachable" }, { status: 200 });
    }
    
    // Other errors - return 500 to trigger alerts
    console.error("Cleanup pledges error:", error);
    return NextResponse.json(
      { 
        error: "Failed to cleanup pledges", 
        message: errorMessage,
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
