import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, name, email } = body;

    // Validate required fields
    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      return NextResponse.json(
        { error: "slug is required and must be non-empty" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required and must be non-empty" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "email is required and must be non-empty" },
        { status: 400 }
      );
    }

    // Basic email validation
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Find Event by slug
    const event = await prisma.event.findUnique({
      where: { slug },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if event is closed
    if (event.closedAt !== null) {
      return NextResponse.json(
        { error: "Event is closed" },
        { status: 409 }
      );
    }

    // Atomic transaction: capacity check + duplicate check + payment creation
    try {
      await prisma.$transaction(async (tx) => {
        // Count spots taken (PLEDGED + PAID) within transaction
        const spotsTaken = await tx.payment.count({
          where: {
            eventId: event.id,
            status: {
              in: ["PLEDGED", "PAID"],
            },
          },
        });

        // Check if event is full
        if (event.maxSpots !== null && spotsTaken >= event.maxSpots) {
          throw new Error("EVENT_FULL");
        }

        // Check if payment already exists for this event and email (duplicate pledge check)
        const existingPayment = await tx.payment.findFirst({
          where: {
            eventId: event.id,
            email: trimmedEmail,
            status: {
              in: ["PLEDGED", "PAID"],
            },
          },
        });

        if (existingPayment) {
          throw new Error("DUPLICATE_PLEDGE");
        }

        // Create Payment with PLEDGED status
        await tx.payment.create({
          data: {
            eventId: event.id,
            name: name.trim(),
            email: trimmedEmail,
            amountPence: event.pricePence,
            status: "PLEDGED",
          },
        });
      });
    } catch (txError) {
      // Handle transaction errors
      if (txError instanceof Error) {
        if (txError.message === "EVENT_FULL") {
          return NextResponse.json(
            { error: "Event is full" },
            { status: 409 }
          );
        }
        if (txError.message === "DUPLICATE_PLEDGE") {
          return NextResponse.json(
            { error: "Already joined" },
            { status: 409 }
          );
        }
      }

      // Handle unique constraint violation (race condition: another request created payment)
      if (
        txError instanceof Prisma.PrismaClientKnownRequestError &&
        txError.code === "P2002"
      ) {
        console.error("[pledge] Unique constraint violation (race condition):", {
          slug,
          email: trimmedEmail,
        });
        return NextResponse.json(
          { error: "Already joined" },
          { status: 409 }
        );
      }

      // Re-throw unknown errors to be caught by outer catch
      throw txError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[pledge] Error creating pledge:", error);
    return NextResponse.json(
      { error: "Failed to create pledge" },
      { status: 500 }
    );
  }
}
