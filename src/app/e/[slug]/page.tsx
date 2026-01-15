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
        <p>Event not found</p>
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
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{event.title}</h1>

      <p className="mb-2">
        <span className="font-medium">
          {event.price !== null ? formatPrice(event.price) : "Free"}
        </span>{" "}
        per person
      </p>

      {event.maxSpots !== null ? (
        <p className="mb-4">
          <span className="font-medium">
            {spotsLeft} of {event.maxSpots} spots left
          </span>
        </p>
      ) : (
        <p className="mb-4">
          <span className="font-medium">Unlimited spots</span>
        </p>
      )}

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-md border ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-200"
              : statusMessage.type === "error"
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <>
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                {statusMessage.text}
              </h2>
              <p className="text-green-700 mb-2">
                Thanks for your payment. You're confirmed for this event.
              </p>
              {email && (
                <p className="text-sm text-green-600 mt-2">Paid as: {email}</p>
              )}
              <p className="text-xs text-green-600 mt-2">Stripe will email your receipt.</p>
            </>
          ) : (
            <p className={statusMessage.type === "error" ? "text-red-700" : "text-gray-700"}>
              {statusMessage.text}
            </p>
          )}
        </div>
      )}

      <JoinAndPayClient slug={slug} isFull={isFull} isClosed={isClosed} />
    </main>
  );
}
