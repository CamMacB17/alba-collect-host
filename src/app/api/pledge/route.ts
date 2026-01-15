import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Count spots taken (PLEDGED + PAID)
    const spotsTaken = await prisma.payment.count({
      where: {
        eventId: event.id,
        status: {
          in: ["PLEDGED", "PAID"],
        },
      },
    });

    // Check if event is full
    if (event.maxSpots !== null && spotsTaken >= event.maxSpots) {
      return NextResponse.json(
        { error: "Event is full" },
        { status: 409 }
      );
    }

    // Check if payment already exists for this event and email (duplicate pledge check)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        eventId: event.id,
        email: trimmedEmail,
        status: {
          in: ["PLEDGED", "PAID"],
        },
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "Duplicate pledge" },
        { status: 409 }
      );
    }

    // Create Payment with PLEDGED status
    await prisma.payment.create({
      data: {
        eventId: event.id,
        name: name.trim(),
        email: trimmedEmail,
        amountPence: event.pricePence,
        status: "PLEDGED",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating pledge:", error);
    return NextResponse.json(
      { error: "Failed to create pledge" },
      { status: 500 }
    );
  }
}
