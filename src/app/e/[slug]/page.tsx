import { getPublicEventView } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import JoinAndPayClient from "./JoinAndPayClient";

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
  searchParams: Promise<{ success?: string; canceled?: string; email?: string }>;
}) {
  const { slug } = await params;
  const { success, canceled, email } = await searchParams;

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

  // Determine status message
  let statusMessage: { type: "success" | "info" | "error"; text: string } | null = null;
  if (success === "1") {
    statusMessage = {
      type: "success",
      text: "You're in.",
    };
  } else if (canceled === "1") {
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

        {/* Status Messages */}
        {statusMessage && (
          <div
            className="p-3 rounded border"
            style={{
              background: statusMessage.type === "success" 
                ? "rgba(16, 185, 129, 0.15)" 
                : statusMessage.type === "error"
                ? "rgba(226, 54, 66, 0.15)"
                : "rgba(247, 130, 34, 0.15)",
              borderColor: statusMessage.type === "success"
                ? "#10b981"
                : statusMessage.type === "error"
                ? "#E23642"
                : "#F78222"
            }}
          >
            {statusMessage.type === "success" ? (
              <>
                <h2 className="text-base font-semibold mb-1" style={{ color: "#10b981" }}>
                  {statusMessage.text}
                </h2>
                <p className="mb-1 text-xs" style={{ color: "#FFFFE0" }}>
                  Confirming payment… If this hasn't updated in 30 seconds, refresh.
                </p>
                {email && (
                  <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                    Paid as: {email}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>
                  Stripe will email your receipt.
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ 
                color: statusMessage.type === "error" ? "#E23642" : "#FFFFE0" 
              }}>
                {statusMessage.text}
              </p>
            )}
          </div>
        )}

        {/* Join Card - Hide if user has already joined (success state) */}
        {!isClosed && !isFull && statusMessage?.type !== "success" && (
          <div className="card">
            <JoinAndPayClient slug={slug} isFull={isFull} isClosed={isClosed} />
          </div>
        )}
      </div>
    </main>
  );
}
