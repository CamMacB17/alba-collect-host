import { prisma } from "@/lib/prisma";

export async function getPublicEventView(slug: string): Promise<{
  event: { id: string; title: string; organiserName: string; price: number | null; maxSpots: number | null; status?: any; slug: string };
  spotsTaken: number;
  spotsLeft: number | null;
  isFull: boolean;
} | null> {
  console.log("[getPublicEventView] raw:", slug);
  const trimmed = (slug ?? "").trim();
  console.log("[getPublicEventView] trimmed:", trimmed, "len:", trimmed.length);
  console.log("[getPublicEventView] DB:", (process.env.DATABASE_URL || "").split("@").slice(-1)[0]);

  // Validate slug: trim + non-empty + length <= 100
  const trimmedSlug = trimmed;
  const validationReject = !trimmedSlug || trimmedSlug.length === 0 || trimmedSlug.length > 100;
  console.log("[getPublicEventView] validation reject:", validationReject);
  
  if (!trimmedSlug || trimmedSlug.length === 0 || trimmedSlug.length > 100) {
    return null;
  }

  // Query Prisma for the Event by slug with minimal fields
  console.log("[getPublicEventView] querying slug:", trimmed);
  const event = await prisma.event.findFirst({
    where: { slug: trimmed },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });
  console.log("[getPublicEventView] event:", event);
  
  const sample = await prisma.event.findMany({ take: 5, select: { slug: true, title: true } });
  console.log("[getPublicEventView] sample events:", sample);

  if (!event) {
    return null;
  }

  // Fetch full event data for return
  const fullEvent = await prisma.event.findUnique({
    where: { id: event.id },
    select: {
      id: true,
      slug: true,
      title: true,
      organiserName: true,
      pricePence: true,
      currency: true,
      maxSpots: true,
    },
  });

  if (!fullEvent) {
    return null;
  }

  // Count payments with status in [PLEDGED, PAID] - these occupy spots
  const spotsTaken = await prisma.payment.count({
    where: {
      eventId: fullEvent.id,
      status: {
        in: ["PLEDGED", "PAID"],
      },
    },
  });

  // Calculate spotsLeft
  // Note: Schema shows maxSpots as Int (not nullable), but handling null for safety
  const maxSpots = fullEvent.maxSpots ?? null;
  const spotsLeft = maxSpots === null ? null : Math.max(0, maxSpots - spotsTaken);

  // isFull: true only when maxSpots is not null AND spotsTaken >= maxSpots
  const isFull = maxSpots !== null && spotsTaken >= maxSpots;

  return {
    event: {
      id: fullEvent.id,
      title: fullEvent.title,
      organiserName: fullEvent.organiserName,
      price: fullEvent.pricePence,
      maxSpots: maxSpots,
      slug: fullEvent.slug,
    },
    spotsTaken,
    spotsLeft,
    isFull,
  };
}
