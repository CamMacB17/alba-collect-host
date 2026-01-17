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
import RegenerateAdminLinkButton from "./RegenerateAdminLinkButton";

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

  // Check if token exists and is not expired
  const now = new Date();
  const isExpired = adminToken?.expiresAt !== null && adminToken?.expiresAt !== undefined && adminToken.expiresAt < now;

  if (!adminToken || isExpired) {
    // Do not reveal whether token is invalid or expired (no information leakage)
    return (
      <main className="min-h-screen p-4 sm:p-6" style={{ background: "#2C2C2F" }}>
        <div className="max-w-6xl mx-auto">
          <div className="card">
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#E23642" }}>Admin link not found</h1>
            <p style={{ color: "#FFFFE0", opacity: 0.8 }}>The admin token you're using is invalid or has expired.</p>
          </div>
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
      <main className="min-h-screen p-4 sm:p-6" style={{ background: "#2C2C2F" }}>
        <div className="max-w-6xl mx-auto">
          <div className="card">
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#E23642" }}>Event not found</h1>
            <p style={{ color: "#FFFFE0", opacity: 0.8 }}>The event associated with this admin link could not be found.</p>
          </div>
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
    <main className="min-h-screen p-3 sm:p-4 overflow-x-hidden" style={{ background: "#2C2C2F" }}>
      <div className="w-full max-w-6xl mx-auto space-y-3">
        {/* Header Section - Mobile: title full width, stats underneath */}
        <div className="card">
          <div className="mb-3">
            <h1 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: "#FFFFE0" }}>{event.title}</h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: isClosed ? "rgba(226, 54, 66, 0.15)" : "rgba(251, 185, 36, 0.15)",
                color: isClosed ? "#E23642" : "#FBB924",
                border: `1px solid ${isClosed ? "#E23642" : "#FBB924"}`,
              }}
            >
              {isClosed ? "Closed" : "Open"}
            </span>
          </div>
          {/* Key Stats Grid - Mobile: 2x2, Desktop: 4 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.5 }}>Price</div>
              <div className="text-sm sm:text-base font-semibold tabular-nums" style={{ color: "#FBB924" }}>{priceDisplay}</div>
            </div>
            <div className="text-center">
              <div className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.5 }}>Spots</div>
              <div className="text-sm sm:text-base font-semibold" style={{ color: "#FFFFE0" }}>
                {spotsTaken}
                {event.maxSpots !== null ? `/${event.maxSpots}` : "∞"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.5 }}>Revenue</div>
              <div className="text-sm sm:text-base font-semibold tabular-nums" style={{ color: "#FBB924" }}>
                £{(totalPaidRevenue / 100).toFixed(0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.5 }}>Count</div>
              <div className="text-sm sm:text-base font-semibold" style={{ color: "#FFFFE0" }}>{totalPayments}</div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Event Settings */}
            <div className="card">
              <h2 className="text-sm font-semibold mb-3" style={{ color: "#FFFFE0" }}>Event Settings</h2>
              
              <div className="space-y-3">
                {/* Title with inline Save */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Event Title</label>
                  <EditTitleForm eventId={event.id} currentTitle={event.title} token={token} />
                </div>

                {/* Price and Max Spots - Side by side on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price with inline Save */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Price per person (£)</label>
                    <EditPriceForm eventId={event.id} currentPricePence={event.pricePence} token={token} isPriceLocked={paidCount > 0} />
                  </div>
                  
                  {/* Max Spots with inline Save */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>Max spots</label>
                    <EditMaxSpotsForm eventId={event.id} currentMaxSpots={event.maxSpots} token={token} />
                  </div>
                </div>
              </div>
            </div>

            {/* Event Links */}
            <div className="card">
              <h2 className="text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Event Links</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium w-16 flex-shrink-0" style={{ color: "#FFFFE0", opacity: 0.6 }}>Public</span>
                  <code className="flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-mono truncate" style={{
                    background: "#2C2C2F",
                    border: "1px solid #404043",
                    color: "#F78222"
                  }}>
                    {publicUrl}
                  </code>
                  <CopyButton text={publicUrl} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium w-16 flex-shrink-0" style={{ color: "#FFFFE0", opacity: 0.6 }}>Admin</span>
                  <code className="flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-mono truncate" style={{
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

            {/* Cleanup */}
            <div>
              <CleanupButton token={token} />
            </div>

            {/* Recent Actions */}
            <div className="card">
              <h2 className="text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Recent Actions</h2>
              {actionLogs.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "#FFFFE0", opacity: 0.6 }}>No actions logged yet</p>
              ) : (
                <div className="space-y-1">
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
                      <div key={log.id} className="flex items-start justify-between py-1" style={{ borderBottom: "1px solid #404043" }}>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium" style={{ color: "#FFFFE0" }}>{log.actionType.replace(/_/g, " ")}</span>
                          {summary && (
                            <span className="text-xs ml-1.5" style={{ color: "#FFFFE0", opacity: 0.6 }}>— {summary}</span>
                          )}
                        </div>
                        <span className="text-xs whitespace-nowrap ml-2 flex-shrink-0" style={{ color: "#FFFFE0", opacity: 0.5 }}>
                          {log.createdAt ? formatDate(log.createdAt) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Actions Card */}
            <div className="card">
              <h2 className="text-sm font-semibold mb-3" style={{ color: "#FFFFE0" }}>Actions</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium mb-0.5" style={{ color: "#FFFFE0", opacity: 0.9 }}>Event Status</div>
                    <div className="text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>
                      {isClosed ? "Closed" : "Open"}
                    </div>
                  </div>
                  <CloseReopenButton eventId={event.id} token={token} isClosed={isClosed} />
                </div>
                <div className="pt-2" style={{ borderTop: "1px solid #404043" }}>
                  <a
                    href={`/admin/${token}/export`}
                    className="block w-full px-3 py-2 rounded text-sm font-medium text-center transition-colors"
                    style={{
                      background: "#F78222",
                      color: "white"
                    }}
                  >
                    Download CSV
                  </a>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ 
              background: "rgba(226, 54, 66, 0.08)", 
              border: "1px solid rgba(226, 54, 66, 0.3)" 
            }}>
              <h2 className="text-sm font-semibold mb-1.5" style={{ color: "#E23642" }}>Danger Zone</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-2" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                    Regenerate admin link. Current link will stop working immediately.
                  </p>
                  <RegenerateAdminLinkButton token={token} />
                </div>
                {paidCount > 0 && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                      Refund all paid payments. Cannot be undone.
                    </p>
                    <RefundAllButton token={token} />
                  </div>
                )}
              </div>
            </div>

            {/* Attendees Table - Moved to Right Column */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: "#FFFFE0" }}>Attendees</h2>
                {sortedPayments.length > 0 && (
                  <span className="text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>
                    {sortedPayments.length} {sortedPayments.length === 1 ? "person" : "people"}
                  </span>
                )}
              </div>
              {sortedPayments.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>No one has joined yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 px-3">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #404043" }}>
                        <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.6 }}>Name</th>
                        <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.6 }}>Email</th>
                        <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.6 }}>Status</th>
                        <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.6 }}>Date</th>
                        <th className="text-right py-2 px-2 text-xs font-medium uppercase tracking-wide" style={{ color: "#FFFFE0", opacity: 0.6 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPayments.map((payment) => (
                        <tr 
                          key={payment.id} 
                          style={{ borderBottom: "1px solid #404043" }}
                          className="hover:opacity-90 transition-opacity"
                        >
                          <td className="py-2 px-2">
                            <div className="text-xs font-medium truncate" style={{ color: "#FFFFE0" }}>{payment.name || "—"}</div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="text-xs truncate" style={{ color: "#FFFFE0", opacity: 0.8 }}>{payment.email || "—"}</div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
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
                                  opacity: payment.status === "CANCELLED" ? 0.7 : 1
                                }}
                              >
                                {payment.status}
                              </span>
                              {payment.status === "CANCELLED" && (payment.refundedAt !== null || payment.stripeRefundId !== null) && (
                                <span className="text-xs" style={{ color: "#FFFFE0", opacity: 0.5 }}>Refunded</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>
                              {payment.paidAt ? formatDate(payment.paidAt) : payment.refundedAt ? formatDate(payment.refundedAt) : payment.createdAt ? formatDate(payment.createdAt) : "—"}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-end gap-1">
                              {payment.status === "PLEDGED" && (
                                <>
                                  <MarkPaidButton paymentId={payment.id} token={token} />
                                  <RemoveButton paymentId={payment.id} token={token} />
                                </>
                              )}
                              {payment.status === "PAID" && (
                                <RefundButton 
                                  paymentId={payment.id} 
                                  token={token} 
                                  isAlreadyRefunded={payment.refundedAt !== null || payment.stripeRefundId !== null}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Version footer */}
      <div className="mt-8 pt-4 text-center">
        <p className="text-xs" style={{ color: "#FFFFE0", opacity: 0.5 }}>
          Version: {process.env.NEXT_PUBLIC_BUILD_ID || "unknown"}
        </p>
      </div>
    </main>
  );
}
