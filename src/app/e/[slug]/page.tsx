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
      <main className="min-h-screen p-8">
        <p style={{ color: "#FFFFE0" }}>Event not found</p>
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
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Event Header Card */}
        <div className="card mb-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: "#FFFFE0" }}>
            {event.title}
          </h1>

          <div className="space-y-3">
            <div>
              <span className="text-sm" style={{ color: "#FFFFE0", opacity: 0.8 }}>Price per person</span>
              <p className="text-2xl font-semibold mt-1" style={{ color: "#FBB924" }}>
                {event.price !== null ? formatPrice(event.price) : "Free"}
              </p>
            </div>

            {event.maxSpots !== null ? (
              <div>
                <span className="text-sm" style={{ color: "#FFFFE0", opacity: 0.8 }}>Spots</span>
                <p className="text-xl font-semibold mt-1" style={{ color: "#FFFFE0" }}>
                  {spotsLeft} of {event.maxSpots} left
                </p>
              </div>
            ) : (
              <div>
                <span className="text-sm" style={{ color: "#FFFFE0", opacity: 0.8 }}>Spots</span>
                <p className="text-xl font-semibold mt-1" style={{ color: "#FFFFE0" }}>
                  Unlimited
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div
            className="mb-6 p-4 rounded-lg border"
            style={{
              background: statusMessage.type === "success" 
                ? "rgba(251, 185, 36, 0.15)" 
                : statusMessage.type === "error"
                ? "rgba(226, 54, 66, 0.15)"
                : "rgba(247, 130, 34, 0.15)",
              borderColor: statusMessage.type === "success"
                ? "#FBB924"
                : statusMessage.type === "error"
                ? "#E23642"
                : "#F78222"
            }}
          >
            {statusMessage.type === "success" ? (
              <>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "#FBB924" }}>
                  {statusMessage.text}
                </h2>
                <p className="mb-2" style={{ color: "#FFFFE0" }}>
                  Thanks for your payment. You're confirmed for this event.
                </p>
                {email && (
                  <p className="text-sm mt-2" style={{ color: "#FFFFE0", opacity: 0.8 }}>
                    Paid as: {email}
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                  Stripe will email your receipt.
                </p>
              </>
            ) : (
              <p style={{ 
                color: statusMessage.type === "error" ? "#E23642" : "#FFFFE0" 
              }}>
                {statusMessage.text}
              </p>
            )}
          </div>
        )}

        {/* Join Card */}
        <div className="card">
          <JoinAndPayClient slug={slug} isFull={isFull} isClosed={isClosed} />
        </div>
      </div>
    </main>
  );
}
