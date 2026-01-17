import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || null;
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA || null;
  const deployedAt = process.env.NEXT_PUBLIC_DEPLOYED_AT || null;

  return NextResponse.json({
    buildId,
    commit,
    deployedAt,
  });
}
