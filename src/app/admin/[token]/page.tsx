import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import RemoveButton from "./RemoveButton";
import MarkPaidButton from "./MarkPaidButton";
import RefundButton from "./RefundButton";
import RefundAllButton from "./RefundAllButton";
import EditTitleForm from "./EditTitleForm";
import EditMaxSpotsForm from "./EditMaxSpotsForm";
import EditPriceForm from "./EditPriceForm";
import CloseReopenButton from "./CloseReopenButton";
import CopyButton from "./CopyButton";
import CleanupButton from "./CleanupButton";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Build baseUrl safely for Next.js 16
  const h = await headers();
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  let baseUrl: string;
  if (envBase) {
    baseUrl = envBase.replace(/\/$/, ""); // strip trailing slash
  } else {
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    baseUrl = `${proto}://${host}`;
  }

  // Look up AdminToken by token string
  const adminToken = await prisma.adminToken.findUnique({
    where: { token },
  });

  if (!adminToken) {
    return (
      <main className="min-h-screen p-8">
        <p>Admin link not found</p>
      </main>
    );
  }

  // Get the Event from AdminToken
  const event = await prisma.event.findUnique({
    where: { id: adminToken.eventId },
  });

  if (!event) {
    return (
      <main className="min-h-screen p-8">
        <p>Event not found</p>
      </main>
    );
  }

  // Fetch Payments for that event, ordered by createdAt ascending
  const payments = await prisma.payment.findMany({
    where: {
      eventId: event.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      stripePaymentIntentId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Calculate spotsTaken (payments that occupy a spot: PLEDGED + PAID)
  const spotsTaken = await prisma.payment.count({
    where: {
      eventId: event.id,
      status: {
        in: ["PLEDGED", "PAID"],
      },
    },
  });

  // Count PAID payments for refund-all button
  const paidCount = await prisma.payment.count({
    where: {
      eventId: event.id,
      status: "PAID",
    },
  });

  // Count PLEDGED payments
  const pledgedCount = await prisma.payment.count({
    where: {
      eventId: event.id,
      status: "PLEDGED",
    },
  });

  // Count CANCELLED payments
  const cancelledCount = await prisma.payment.count({
    where: {
      eventId: event.id,
      status: "CANCELLED",
    },
  });

  // Total payments count
  const totalPayments = payments.length;

  // Calculate spotsLeft
  const spotsLeft = event.maxSpots === null ? null : Math.max(0, event.maxSpots - spotsTaken);

  // Format price for display
  const priceDisplay = event.pricePence === null ? "Free" : `£${(event.pricePence / 100).toFixed(2)}`;
  const isClosed = event.closedAt !== null;

  // Build absolute URLs
  const publicUrl = `${baseUrl}/e/${event.slug}`;
  const adminUrl = `${baseUrl}/admin/${token}`;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <EditTitleForm eventId={event.id} currentTitle={event.title} token={token} />
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Links</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Public link:</span>
            <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
              {publicUrl}
            </code>
            <CopyButton text={publicUrl} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Admin link:</span>
            <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
              {adminUrl}
            </code>
            <CopyButton text={adminUrl} />
          </div>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        <CleanupButton token={token} />
        
        <div className="flex items-center gap-4">
          <p>
            <span className="font-medium">Status:</span> {isClosed ? "CLOSED" : "OPEN"}
          </p>
          <CloseReopenButton eventId={event.id} token={token} isClosed={isClosed} />
        </div>
        
        {paidCount > 0 && (
          <div>
            <RefundAllButton token={token} />
          </div>
        )}
        
        <div>
          <p className="mb-2">
            <span className="font-medium">Current price:</span> {priceDisplay}
          </p>
          <EditPriceForm eventId={event.id} currentPricePence={event.pricePence} token={token} />
        </div>
        
        <div>
          <p className="mb-2">
            <span className="font-medium">Current max spots:</span> {event.maxSpots === null ? "Unlimited" : event.maxSpots}
          </p>
          <EditMaxSpotsForm eventId={event.id} currentMaxSpots={event.maxSpots} token={token} />
        </div>
        {event.maxSpots === null ? (
          <p>
            <span className="font-medium">Spots:</span> unlimited
          </p>
        ) : (
          <p>
            <span className="font-medium">Spots left:</span> {spotsLeft}
          </p>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Total payments:</span>
              <span className="ml-2 font-medium">{totalPayments}</span>
            </div>
            <div>
              <span className="text-gray-600">PAID:</span>
              <span className="ml-2 font-medium text-green-700">{paidCount}</span>
            </div>
            <div>
              <span className="text-gray-600">PLEDGED:</span>
              <span className="ml-2 font-medium text-yellow-700">{pledgedCount}</span>
            </div>
            <div>
              <span className="text-gray-600">CANCELLED:</span>
              <span className="ml-2 font-medium text-gray-700">{cancelledCount}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-gray-200">
              <span className="text-gray-600">Spots filled:</span>
              <span className="ml-2 font-medium">
                {spotsTaken}
                {event.maxSpots !== null ? ` / ${event.maxSpots}` : " (unlimited)"}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">People who've joined</h2>
        {payments.length === 0 ? (
          <p className="text-gray-600">No one has joined yet</p>
        ) : (
          <ul className="space-y-3">
            {payments.map((payment) => (
              <li key={payment.id} className="border-b pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{payment.name}</p>
                    <p className="text-sm text-gray-600">{payment.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-sm ${
                        payment.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : payment.status === "PLEDGED"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {payment.status}
                    </span>
                    {payment.status === "CANCELLED" && payment.stripePaymentIntentId && (
                      <span className="text-sm text-gray-600">Refunded</span>
                    )}
                    {payment.status === "PLEDGED" && (
                      <>
                        <MarkPaidButton paymentId={payment.id} token={token} />
                        <RemoveButton paymentId={payment.id} token={token} />
                      </>
                    )}
                    {payment.status === "PAID" && (
                      <RefundButton paymentId={payment.id} token={token} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
