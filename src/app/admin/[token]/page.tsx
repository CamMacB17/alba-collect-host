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
      paidAt: true,
      refundedAt: true,
      stripePaymentIntentId: true,
      stripeRefundId: true,
      amountPence: true,
      amountPenceCaptured: true,
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

  // Fetch last 10 admin action logs for this event
  const actionLogs = await prisma.adminActionLog.findMany({
    where: {
      eventId: event.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    select: {
      id: true,
      actionType: true,
      metadataJson: true,
      createdAt: true,
    },
  });

  // Calculate revenue totals
  const totalPaidRevenue = payments
    .filter((p) => p.status === "PAID" && !p.refundedAt)
    .reduce((sum, p) => sum + (p.amountPenceCaptured || p.amountPence || 0), 0);
  
  const totalRefundedRevenue = payments
    .filter((p) => p.refundedAt !== null)
    .reduce((sum, p) => sum + (p.amountPenceCaptured || p.amountPence || 0), 0);

  // Format price for display
  const priceDisplay = event.pricePence === null ? "Free" : `£${(event.pricePence / 100).toFixed(2)}`;
  const isClosed = event.closedAt !== null;

  // Build absolute URLs
  const publicUrl = `${baseUrl}/e/${event.slug}`;
  const adminUrl = `${baseUrl}/admin/${token}`;

  // Sort payments: PAID first, then PLEDGED, then CANCELLED (client-side sort)
  const sortedPayments = [...payments].sort((a, b) => {
    const statusOrder = { PAID: 0, PLEDGED: 1, CANCELLED: 2 };
    const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Top Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{event.title}</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className="text-lg font-semibold">
              <span className={isClosed ? "text-red-600" : "text-green-600"}>
                {isClosed ? "Closed" : "Open"}
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-1">Price per person</div>
            <div className="text-lg font-semibold">{priceDisplay}</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-1">Spots</div>
            <div className="text-lg font-semibold">
              {spotsTaken}
              {event.maxSpots !== null ? ` / ${event.maxSpots}` : " (unlimited)"}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-1">Revenue</div>
            <div className="text-lg font-semibold text-green-700">
              £{(totalPaidRevenue / 100).toFixed(2)}
            </div>
            {totalRefundedRevenue > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Refunded: £{(totalRefundedRevenue / 100).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <div className="text-sm text-gray-600 mb-1">Paid</div>
            <div className="text-lg font-semibold text-green-700">{paidCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Pledged</div>
            <div className="text-lg font-semibold text-yellow-700">{pledgedCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Cancelled</div>
            <div className="text-lg font-semibold text-gray-700">{cancelledCount}</div>
          </div>
        </div>
      </div>

      {/* Primary Actions Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Event Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
            <EditTitleForm eventId={event.id} currentTitle={event.title} token={token} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price per person</label>
              <EditPriceForm eventId={event.id} currentPricePence={event.pricePence} token={token} isPriceLocked={paidCount > 0} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max spots</label>
              <EditMaxSpotsForm eventId={event.id} currentMaxSpots={event.maxSpots} token={token} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
            <div>
              <span className="text-sm font-medium text-gray-700">Event status: </span>
              <span className={isClosed ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                {isClosed ? "Closed" : "Open"}
              </span>
            </div>
            <CloseReopenButton eventId={event.id} token={token} isClosed={isClosed} />
          </div>

          <div className="pt-2 border-t border-gray-200">
            <a
              href={`/admin/${token}/export`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Download attendees CSV
            </a>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Event Links</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 w-24">Public link:</span>
            <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-sm font-mono break-all border border-gray-200">
              {publicUrl}
            </code>
            <CopyButton text={publicUrl} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 w-24">Admin link:</span>
            <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-sm font-mono break-all border border-gray-200">
              {adminUrl}
            </code>
            <CopyButton text={adminUrl} />
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Attendees</h2>
        {sortedPayments.length === 0 ? (
          <p className="text-gray-600">No one has joined yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm font-medium">{payment.name}</td>
                    <td className="py-3 px-3 text-sm text-gray-600">{payment.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          payment.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "PLEDGED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                      {payment.status === "CANCELLED" && (payment.refundedAt !== null || payment.stripeRefundId !== null) && (
                        <span className="ml-2 text-xs text-gray-500">Refunded</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600">
                      {payment.paidAt ? formatDate(payment.paidAt) : payment.refundedAt ? formatDate(payment.refundedAt) : formatDate(payment.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {payment.status === "PLEDGED" && (
                        <div className="flex items-center justify-end gap-2">
                          <MarkPaidButton paymentId={payment.id} token={token} />
                          <RemoveButton paymentId={payment.id} token={token} />
                        </div>
                      )}
                      {payment.status === "PAID" && (
                        <RefundButton 
                          paymentId={payment.id} 
                          token={token} 
                          isAlreadyRefunded={payment.refundedAt !== null || payment.stripeRefundId !== null}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {paidCount > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-700 mb-4">
            This refunds everyone who has paid. It cannot be undone.
          </p>
          <RefundAllButton token={token} />
        </div>
      )}

      {/* Cleanup Button */}
      <div className="mb-8">
        <CleanupButton token={token} />
      </div>

      {/* Admin Action Log */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Actions</h2>
        {actionLogs.length === 0 ? (
          <p className="text-gray-600 text-sm">No actions logged yet</p>
        ) : (
          <div className="space-y-3">
            {actionLogs.map((log) => {
              const metadata = log.metadataJson as Record<string, unknown>;
              let summary = "";
              
              if (log.actionType === "REFUND_ALL") {
                const refunded = metadata.refunded as number | undefined;
                const attempted = metadata.attempted as number | undefined;
                const failed = metadata.failed as number | undefined;
                summary = `Refunded ${refunded || 0} of ${attempted || 0} payments${failed && failed > 0 ? `, ${failed} failed` : ""}`;
              } else if (log.actionType === "EVENT_CLOSE") {
                summary = "Event closed";
              } else if (log.actionType === "EVENT_REOPEN") {
                summary = "Event reopened";
              }

              return (
                <div key={log.id} className="text-sm border-b border-gray-100 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">{log.actionType}</span>
                      {summary && <span className="text-gray-600 ml-2">— {summary}</span>}
                    </div>
                    <span className="text-gray-500 text-xs whitespace-nowrap ml-4">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
