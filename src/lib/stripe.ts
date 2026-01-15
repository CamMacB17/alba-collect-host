import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }

  stripeClient = new Stripe(key, {
    apiVersion: "2025-12-15.clover",
    typescript: true,
  });

  return stripeClient;
}
