import { getPublicEventView } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import JoinAndPayClient from "./JoinAndPayClient";
import BookingWrapper from "./BookingWrapper";
import { unstable_noStore } from "next/cache";

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
      <main className="min-h-screen p-8" style={{ background: "#2C2C2F" }}>
        <div className="max-w-5xl mx-auto">
          <p style={{ color: "#FFFFE0" }}>Event not found</p>
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
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: "#2C2C2F" }}>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Event Header Card */}
        <div className="card">
          <h1 className="text-2xl font-semibold mb-4" style={{ color: "#FFFFE0" }}>
            {event.title}
          </h1>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>Price</div>
              <div className="text-xl font-semibold" style={{ color: "#FBB924" }}>
                {event.price !== null ? formatPrice(event.price) : "Free"}
              </div>
            </div>

            {event.maxSpots !== null ? (
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>Spots</div>
                <div className="text-xl font-semibold" style={{ color: "#FFFFE0" }}>
                  {spotsLeft} of {event.maxSpots}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>Spots</div>
                <div className="text-xl font-semibold" style={{ color: "#FFFFE0" }}>
                  Unlimited
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>Status</div>
              <div>
                {isClosed ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{
                    background: "rgba(226, 54, 66, 0.15)",
                    color: "#E23642",
                    border: "1px solid rgba(226, 54, 66, 0.3)"
                  }}>
                    Closed
                  </span>
                ) : isFull ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{
                    background: "rgba(226, 54, 66, 0.15)",
                    color: "#E23642",
                    border: "1px solid rgba(226, 54, 66, 0.3)"
                  }}>
                    Full
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{
                    background: "rgba(251, 185, 36, 0.15)",
                    color: "#FBB924",
                    border: "1px solid rgba(251, 185, 36, 0.3)"
                  }}>
                    Open
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Confirmation (when session_id present) */}
        {hasSessionId && (
          <BookingWrapper sessionId={session_id!} slug={slug} isFull={isFull} isClosed={isClosed} />
        )}

        {/* Status Messages (only when no session_id) */}
        {!hasSessionId && statusMessage && (
          <div
            className="p-3 rounded border"
            style={{
              background: statusMessage.type === "error"
                ? "rgba(226, 54, 66, 0.15)"
                : "rgba(247, 130, 34, 0.15)",
              borderColor: statusMessage.type === "error"
                ? "#E23642"
                : "#F78222"
            }}
          >
            <p className="text-sm" style={{ 
              color: statusMessage.type === "error" ? "#E23642" : "#FFFFE0" 
            }}>
              {statusMessage.text}
            </p>
          </div>
        )}

        {/* Join Card - Hide if session_id present */}
        {!hasSessionId && !isClosed && !isFull && (
          <div className="card">
            <JoinAndPayClient slug={slug} isFull={isFull} isClosed={isClosed} />
          </div>
        )}
      </div>
    </main>
  );
}
