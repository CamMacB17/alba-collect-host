"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getRequiredEnv } from "@/lib/env";

export async function payAndJoin(args: { slug: string; name: string; email: string }): Promise<{ checkoutUrl: string } | { error: string }> {
  const { slug, name, email } = args;

  // Normalise email: trim + toLowerCase
  const normalisedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  // Validate name and email are non-empty
  if (!trimmedName || trimmedName.length === 0) {
    return { error: "Name is required" };
  }

  if (!email || typeof email !== "string" || email.trim().length === 0) {
    return { error: "Email is required" };
  }

  // Find event by slug
  const event = await prisma.event.findFirst({
    where: { slug },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  // Check if event is closed
  if (event.closedAt !== null) {
    return { error: "This event is closed" };
  }

  // Capacity check + payment creation/update in a single transaction
  let payment;
  try {
    payment = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findFirst({
        where: {
          eventId: event.id,
          email: normalisedEmail,
        },
      });

      if (existingPayment && (existingPayment.status === "PAID" || existingPayment.status === "PLEDGED")) {
        throw new Error("ALREADY_BOOKED");
      }

      if (event.maxSpots !== null) {
        const spotsTaken = await tx.payment.count({
          where: {
            eventId: event.id,
            status: {
              in: ["PLEDGED", "PAID"],
            },
          },
        });

        if (spotsTaken >= event.maxSpots) {
          throw new Error("EVENT_FULL");
        }
      }

      if (existingPayment) {
        return tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            name: trimmedName,
            email: normalisedEmail,
            amountPence: event.pricePence,
            status: "PLEDGED",
          },
        });
      }

      return tx.payment.create({
        data: {
          eventId: event.id,
          name: trimmedName,
          email: normalisedEmail,
          amountPence: event.pricePence,
          status: "PLEDGED",
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_BOOKED") {
      return { error: "You're already booked for this event." };
    }
    if (err instanceof Error && err.message === "EVENT_FULL") {
      return { error: "This event is full" };
    }
    throw err;
  }

  const appUrl = getRequiredEnv("APP_URL").replace(/\/$/, ""); // strip trailing slash

  // Create Stripe Checkout Session
  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "gbp",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: event.title,
            },
            unit_amount: payment.amountPence,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        eventId: event.id,
        slug: event.slug,
      },
      client_reference_id: payment.id,
      success_url: `${appUrl}/e/${slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/e/${slug}?canceled=1`,
    });
  } catch (err) {
    console.error("[payAndJoin] Stripe checkout failed", err);
    if (err && typeof err === "object" && "message" in err) {
      console.error("[payAndJoin] stripe message:", err.message);
    }
    return { error: "Could not start payment (CHECKOUT_FAILED)" };
  }

  if (!session.url) {
    return { error: "No checkout URL returned" };
  }

  if (!session.id) {
    return { error: "No checkout session ID returned" };
  }

  // Persist stripeCheckoutSessionId on Payment (canonical booking identifier)
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stripeCheckoutSessionId: session.id,
    },
  });

  return { checkoutUrl: session.url };
}

