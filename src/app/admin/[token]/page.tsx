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
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="card">
          <h1 className="text-xl font-semibold mb-2" style={{ color: "#E23642" }}>Admin link not found</h1>
          <p style={{ color: "#FFFFE0", opacity: 0.8 }}>The admin token you're using is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  // Get the Event from AdminToken
  const event = await prisma.event.findUnique({
    where: { id: adminToken.eventId },
  });

  if (!event) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="card">
          <h1 className="text-xl font-semibold mb-2" style={{ color: "#E23642" }}>Event not found</h1>
          <p style={{ color: "#FFFFE0", opacity: 0.8 }}>The event associated with this admin link could not be found.</p>
        </div>
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
      <div className="card mb-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: "#FFFFE0" }}>{event.title}</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Status</div>
            <div className="text-lg font-semibold">
              <span style={{ color: isClosed ? "#E23642" : "#FBB924" }}>
                {isClosed ? "Closed" : "Open"}
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Price per person</div>
            <div className="text-lg font-semibold" style={{ color: "#FBB924" }}>{priceDisplay}</div>
          </div>
          
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Spots</div>
            <div className="text-lg font-semibold" style={{ color: "#FFFFE0" }}>
              {spotsTaken}
              {event.maxSpots !== null ? ` / ${event.maxSpots}` : " (unlimited)"}
            </div>
          </div>
          
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Revenue</div>
            <div className="text-lg font-semibold" style={{ color: "#FBB924" }}>
              £{(totalPaidRevenue / 100).toFixed(2)}
            </div>
            {totalRefundedRevenue > 0 && (
              <div className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>
                Refunded: £{(totalRefundedRevenue / 100).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: "1px solid #404043" }}>
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Paid</div>
            <div className="text-lg font-semibold" style={{ color: "#FBB924" }}>{paidCount}</div>
          </div>
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Pledged</div>
            <div className="text-lg font-semibold" style={{ color: "#FBB924" }}>{pledgedCount}</div>
          </div>
          <div>
            <div className="text-sm mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Cancelled</div>
            <div className="text-lg font-semibold" style={{ color: "#FFFFE0", opacity: 0.7 }}>{cancelledCount}</div>
          </div>
        </div>
      </div>

      {/* Primary Actions Section */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#FFFFE0" }}>Event Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Event Title</label>
            <EditTitleForm eventId={event.id} currentTitle={event.title} token={token} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Price per person</label>
              <EditPriceForm eventId={event.id} currentPricePence={event.pricePence} token={token} isPriceLocked={paidCount > 0} />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Max spots</label>
              <EditMaxSpotsForm eventId={event.id} currentMaxSpots={event.maxSpots} token={token} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2" style={{ borderTop: "1px solid #404043" }}>
            <div>
              <span className="text-sm font-medium" style={{ color: "#FFFFE0", opacity: 0.8 }}>Event status: </span>
              <span className="font-semibold" style={{ color: isClosed ? "#E23642" : "#FBB924" }}>
                {isClosed ? "Closed" : "Open"}
              </span>
            </div>
            <CloseReopenButton eventId={event.id} token={token} isClosed={isClosed} />
          </div>

          <div className="pt-2" style={{ borderTop: "1px solid #404043" }}>
            <a
              href={`/admin/${token}/export`}
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{
                background: "#F78222",
                color: "white"
              }}
            >
              Download attendees CSV
            </a>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#FFFFE0" }}>Event Links</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-24" style={{ color: "#FFFFE0", opacity: 0.8 }}>Public link:</span>
            <code className="flex-1 px-3 py-2 rounded text-sm font-mono break-all" style={{
              background: "#2C2C2F",
              border: "1px solid #404043",
              color: "#F78222"
            }}>
              {publicUrl}
            </code>
            <CopyButton text={publicUrl} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-24" style={{ color: "#FFFFE0", opacity: 0.8 }}>Admin link:</span>
            <code className="flex-1 px-3 py-2 rounded text-sm font-mono break-all" style={{
              background: "#2C2C2F",
              border: "1px solid #404043",
              color: "#F78222"
            }}>
              {adminUrl}
            </code>
            <CopyButton text={adminUrl} />
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#FFFFE0" }}>Attendees</h2>
        {sortedPayments.length === 0 ? (
          <p style={{ color: "#FFFFE0", opacity: 0.7 }}>No one has joined yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #404043" }}>
                  <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: "#FFFFE0", opacity: 0.8 }}>Name</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: "#FFFFE0", opacity: 0.8 }}>Email</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: "#FFFFE0", opacity: 0.8 }}>Status</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold" style={{ color: "#FFFFE0", opacity: 0.8 }}>Date</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold" style={{ color: "#FFFFE0", opacity: 0.8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    style={{ borderBottom: "1px solid #404043" }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td className="py-3 px-3 text-sm font-medium" style={{ color: "#FFFFE0" }}>{payment.name || "—"}</td>
                    <td className="py-3 px-3 text-sm" style={{ color: "#FFFFE0", opacity: 0.8 }}>{payment.email || "—"}</td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: payment.status === "PAID" 
                            ? "rgba(251, 185, 36, 0.2)" 
                            : payment.status === "PLEDGED"
                            ? "rgba(251, 185, 36, 0.15)"
                            : "rgba(255, 255, 224, 0.1)",
                          color: payment.status === "PAID"
                            ? "#FBB924"
                            : payment.status === "PLEDGED"
                            ? "#FBB924"
                            : "#FFFFE0",
                          opacity: payment.status === "CANCELLED" ? 0.6 : 1
                        }}
                      >
                        {payment.status}
                      </span>
                      {payment.status === "CANCELLED" && (payment.refundedAt !== null || payment.stripeRefundId !== null) && (
                        <span className="ml-2 text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>Refunded</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                      {payment.paidAt ? formatDate(payment.paidAt) : payment.refundedAt ? formatDate(payment.refundedAt) : payment.createdAt ? formatDate(payment.createdAt) : "—"}
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
        <div className="mb-8 p-6 rounded-lg" style={{ 
          background: "rgba(226, 54, 66, 0.15)", 
          border: "2px solid #E23642" 
        }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "#E23642" }}>Danger Zone</h2>
          <p className="text-sm mb-4" style={{ color: "#E23642", opacity: 0.9 }}>
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
      <div className="card">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#FFFFE0" }}>Recent Actions</h2>
        {actionLogs.length === 0 ? (
          <p className="text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>No actions logged yet</p>
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
                <div key={log.id} className="text-sm pb-2" style={{ borderBottom: "1px solid #404043" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium" style={{ color: "#FFFFE0" }}>{log.actionType}</span>
                      {summary && <span className="ml-2" style={{ color: "#FFFFE0", opacity: 0.7 }}>— {summary}</span>}
                    </div>
                    <span className="text-xs whitespace-nowrap ml-4" style={{ color: "#FFFFE0", opacity: 0.6 }}>{log.createdAt ? formatDate(log.createdAt) : "—"}</span>
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
