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
    const { title, pricePence, maxSpots, organiserName, organiserEmail, startsAt } = body;

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

    // Validate startsAt if provided
    let startsAtDate: Date | null = null;
    if (startsAt !== undefined && startsAt !== null) {
      if (typeof startsAt !== "string" || startsAt.trim().length === 0) {
        return NextResponse.json(
          { error: "startsAt must be a valid ISO date string if provided" },
          { status: 400 }
        );
      }
      startsAtDate = new Date(startsAt);
      if (isNaN(startsAtDate.getTime())) {
        return NextResponse.json(
          { error: "startsAt must be a valid date" },
          { status: 400 }
        );
      }
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
    // Set expiresAt to 90 days from now for new tokens
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const event = await prisma.event.create({
      data: {
        slug,
        title: title.trim(),
        pricePence,
        maxSpots,
        organiserName: organiserName.trim(),
        organiserEmail: organiserEmail?.trim() || null,
        startsAt: startsAtDate,
        adminTokens: {
          create: {
            token,
            expiresAt,
          },
        },
      },
      include: {
        adminTokens: true,
      },
    });

    // Get the newly created admin token (should be the first/latest one)
    const adminToken = event.adminTokens[0];
    if (!adminToken) {
      throw new Error("Failed to create admin token");
    }

    return NextResponse.json(
      {
        slug: event.slug,
        token: adminToken.token,
        eventUrl: `/e/${event.slug}`,
        adminUrl: `/admin/${adminToken.token}`,
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
