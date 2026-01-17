import Stripe from "stripe";
import { getRequiredEnv } from "./env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = getRequiredEnv("STRIPE_SECRET_KEY");

  stripeClient = new Stripe(key, {
    apiVersion: "2025-12-15.clover",
    typescript: true,
  });

  return stripeClient;
}
