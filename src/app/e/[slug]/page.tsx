import { getPublicEventView } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import JoinAndPayClient from "./JoinAndPayClient";
import BookingWrapper from "./BookingWrapper";
import { unstable_noStore } from "next/cache";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatPrice(pence: number | null): string {
  if (pence === null) return "Free";
  const pounds = (pence / 100).toFixed(2);
  return `£${pounds}`;
}

export default async function EventPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ canceled?: string; session_id?: string }>;
}) {
  unstable_noStore();
  
  const { slug } = await params;
  const { canceled, session_id } = await searchParams;

  const result = await getPublicEventView(slug);

  if (!result || !result.event) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <p>Event not found</p>
        </div>
      </main>
    );
  }

  const { event, spotsTaken, spotsLeft, isFull } = result;

  // Check if event is closed
  const eventRecord = await prisma.event.findUnique({
    where: { id: event.id },
    select: { closedAt: true },
  });
  const isClosed = eventRecord?.closedAt !== null;

  // Determine if we should show booking confirmation (session_id present)
  const hasSessionId = !!session_id;

  // Determine status message (only if no session_id)
  let statusMessage: { type: "info" | "error"; text: string } | null = null;
  if (!hasSessionId) {
    if (canceled === "1") {
      statusMessage = {
        type: "info",
        text: "Payment cancelled. You can try again.",
      };
    } else if (isClosed) {
      statusMessage = {
        type: "error",
        text: "This event is closed.",
      };
    } else if (isFull) {
      statusMessage = {
        type: "error",
        text: "This event is full.",
      };
    }
  }

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Event Header Card */}
        <Card>
          <h1 className="text-2xl font-semibold mb-4">
            {event.title}
          </h1>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-label mb-1.5">Price</div>
              <div className="text-xl font-semibold" style={{ color: "var(--alba-yellow)" }}>
                {event.price !== null ? formatPrice(event.price) : "Free"}
              </div>
            </div>

            {event.maxSpots !== null ? (
              <div>
                <div className="text-label mb-1.5">Spots</div>
                <div className="text-xl font-semibold">
                  {spotsLeft} of {event.maxSpots}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-label mb-1.5">Spots</div>
                <div className="text-xl font-semibold">
                  Unlimited
                </div>
              </div>
            )}

            <div>
              <div className="text-label mb-1.5">Status</div>
              <div>
                {isClosed ? (
                  <Badge variant="error">Closed</Badge>
                ) : isFull ? (
                  <Badge variant="error">Full</Badge>
                ) : (
                  <Badge variant="warning">Open</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Booking Confirmation (when session_id present) */}
        {hasSessionId && (
          <BookingWrapper sessionId={session_id!} slug={slug} isFull={isFull} isClosed={isClosed} />
        )}

        {/* Status Messages (only when no session_id) */}
        {!hasSessionId && statusMessage && (
          <Alert variant={statusMessage.type === "error" ? "error" : "info"}>
            {statusMessage.text}
          </Alert>
        )}

        {/* Join Card - Hide if session_id present */}
        {!hasSessionId && !isClosed && !isFull && (
          <Card>
            <JoinAndPayClient slug={slug} isFull={isFull} isClosed={isClosed} />
          </Card>
        )}
      </div>
    </main>
  );
}
