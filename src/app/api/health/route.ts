import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const checks = {
    db: false,
    stripe: false,
    resendKeyPresent: false,
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (err) {
    // DB check failed
    checks.db = false;
  }

  // Check Stripe API connectivity
  try {
    // Check if Stripe key is present first
    if (!process.env.STRIPE_SECRET_KEY) {
      checks.stripe = false;
    } else {
      const stripe = getStripe();
      // Safe API call: list customers with limit 1 (read-only, lightweight)
      await stripe.customers.list({ limit: 1 });
      checks.stripe = true;
    }
  } catch (err) {
    // Stripe check failed (could be API key missing, network issue, etc.)
    checks.stripe = false;
  }

  // Check if Resend API key is present
  checks.resendKeyPresent = !!process.env.RESEND_API_KEY;

  // Determine overall status
  let status: "ok" | "degraded" | "down";
  if (checks.db && checks.stripe && checks.resendKeyPresent) {
    status = "ok";
  } else if (checks.db) {
    // DB is critical, if it's up but other services are down, we're degraded
    status = "degraded";
  } else {
    // DB is down, we're down
    status = "down";
  }

  // Version info
  const version = {
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || null,
  };

  return NextResponse.json({
    status,
    checks,
    version,
  });
}
