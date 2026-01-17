import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: !!process.env.DATABASE_URL,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    APP_URL: !!process.env.APP_URL,
    BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID || "unknown",
  });
}
