import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

function generateSlug(): string {
  // Generate a 10-character URL-safe random string (lowercase letters + numbers)
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 10; i++) {
    slug += chars[randomBytes(1)[0] % chars.length];
  }
  return slug;
}

function generateToken(): string {
  // Generate a secure random token of at least 24 characters
  return randomBytes(18).toString("base64url");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, pricePence, maxSpots, organiserName, organiserEmail } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required and must be non-empty" },
        { status: 400 }
      );
    }

    if (
      !organiserName ||
      typeof organiserName !== "string" ||
      organiserName.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "organiserName is required and must be non-empty" },
        { status: 400 }
      );
    }

    // Validate positive integers
    if (
      typeof pricePence !== "number" ||
      !Number.isInteger(pricePence) ||
      pricePence <= 0
    ) {
      return NextResponse.json(
        { error: "pricePence must be a positive integer" },
        { status: 400 }
      );
    }

    if (
      typeof maxSpots !== "number" ||
      !Number.isInteger(maxSpots) ||
      maxSpots <= 0
    ) {
      return NextResponse.json(
        { error: "maxSpots must be a positive integer" },
        { status: 400 }
      );
    }

    // Generate slug and token
    let slug = generateSlug();
    let token = generateToken();

    // Ensure slug and token are unique (retry if collision)
    let attempts = 0;
    while (attempts < 10) {
      const existingEvent = await prisma.event.findUnique({
        where: { slug },
      });
      const existingToken = await prisma.adminToken.findUnique({
        where: { token },
      });

      if (!existingEvent && !existingToken) {
        break;
      }

      if (existingEvent) {
        slug = generateSlug();
      }
      if (existingToken) {
        token = generateToken();
      }
      attempts++;
    }

    // Create Event and AdminToken in a transaction
    const event = await prisma.event.create({
      data: {
        slug,
        title: title.trim(),
        pricePence,
        maxSpots,
        organiserName: organiserName.trim(),
        organiserEmail: organiserEmail?.trim() || null,
        adminToken: {
          create: {
            token,
          },
        },
      },
      include: {
        adminToken: true,
      },
    });

    return NextResponse.json(
      {
        slug: event.slug,
        token: event.adminToken!.token,
        eventUrl: `/e/${event.slug}`,
        adminUrl: `/admin/${event.adminToken!.token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
