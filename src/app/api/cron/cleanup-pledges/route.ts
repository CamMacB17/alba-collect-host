import { NextRequest, NextResponse } from "next/server";
import { cleanupPledges } from "@/lib/cleanupPledges";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleaned = await cleanupPledges();

  return NextResponse.json({ cleaned });
}
