import { prisma } from "@/lib/prisma";
import { getOptionalEnv } from "@/lib/env";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDbHostname, getDeploymentPlatform, isRailwayInternalHost, logDbHost } from "@/lib/db-info";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  unstable_noStore();

  const { key } = await searchParams;
  const opsPassword = getOptionalEnv("OPS_PASSWORD", "");

  // If OPS_PASSWORD not configured, show error page
  if (!opsPassword || opsPassword.trim().length === 0) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold mb-4">Ops not configured</h1>
          <p>OPS_PASSWORD environment variable is not set.</p>
        </div>
      </main>
    );
  }

  // If key doesn't match, return 404
  if (!key || key !== opsPassword) {
    notFound();
  }

  // Log database hostname (host only, no creds)
  logDbHost();

  const dbHostname = getDbHostname();
  const platform = getDeploymentPlatform();
  const runtime = process.env.VERCEL ? "Vercel" : process.env.RAILWAY_ENVIRONMENT ? "Railway" : "Unknown";

  // Helper to render database unreachable error page
  const renderDbError = () => (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold mb-4" style={{ color: "var(--alba-red)" }}>Database unreachable</h1>
        <p className="mb-2">Current runtime: <code className="bg-black/20 px-1 rounded">{runtime}</code></p>
        {platform === "vercel" && isRailwayInternalHost(dbHostname) ? (
          <p className="mb-4">If you're on Vercel, you cannot use postgres.railway.internal. Deploy this service on Railway or use a public DB URL.</p>
        ) : (
          <p className="mb-4">Please ensure the database server is running and accessible.</p>
        )}
        {dbHostname && (
          <div className="mb-4 p-3 border border-current/30 rounded bg-black/10">
            <p className="text-xs mb-1">Database hostname: <code className="bg-black/20 px-1 rounded">{dbHostname}</code></p>
          </div>
        )}
      </div>
    </main>
  );

  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch summary stats with individual error handling
    let eventsLast7Days: number;
    let paymentsLast7Days: Array<{ amountPenceCaptured: number | null }>;
    let refundsLast7Days: number;

    try {
      eventsLast7Days = await prisma.event.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch events count:", error);
      return renderDbError();
    }

    try {
      paymentsLast7Days = await prisma.payment.findMany({
        where: {
          status: "PAID",
          paidAt: {
            gte: sevenDaysAgo,
            not: null,
          },
        },
        select: {
          amountPenceCaptured: true,
        },
      });
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      return renderDbError();
    }

    try {
      refundsLast7Days = await prisma.payment.count({
        where: {
          refundedAt: {
            gte: sevenDaysAgo,
            not: null,
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch refunds count:", error);
      return renderDbError();
    }

    // Calculate total collected last 7 days
    const totalCollectedLast7Days = paymentsLast7Days.reduce(
      (sum, p) => sum + (p.amountPenceCaptured || 0),
      0
    );

    // Fetch last 50 events ordered by createdAt desc
    let events;
    try {
      events = await prisma.event.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          closedAt: true,
          startsAt: true,
          maxSpots: true,
          payments: {
            select: {
              status: true,
              amountPenceCaptured: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch events:", error);
      return renderDbError();
    }

    // Calculate stats for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        // Count PAID payments only
        const paidCount = event.payments.filter((p) => p.status === "PAID").length;

        // Sum amountPenceCaptured for PAID payments only
        const totalCollected = event.payments
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + (p.amountPenceCaptured || 0), 0);

        return {
          id: event.id,
          title: event.title,
          status: event.closedAt ? "Closed" : "Open",
          startsAt: event.startsAt,
          spots: `${paidCount} of ${event.maxSpots}`,
          totalCollected,
        };
      })
    );

    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto border border-amber-500/30 rounded-lg p-6">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider px-2 py-1 rounded" style={{ background: "rgba(251, 185, 36, 0.2)", color: "var(--alba-yellow)" }}>
              OPS
            </span>
            <span className="text-xs opacity-60">Internal</span>
          </div>

          <h1 className="text-xl font-semibold mb-1">Ops</h1>
          <p className="text-xs opacity-60 mb-6">Internal operations view. Do not share this link.</p>

          {/* Summary stats */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border border-current/20 rounded">
              <p className="text-xs opacity-70 mb-1">Events last 7 days</p>
              <p className="text-lg font-semibold">{eventsLast7Days}</p>
            </div>
            <div className="p-3 border border-current/20 rounded">
              <p className="text-xs opacity-70 mb-1">Total collected last 7 days</p>
              <p className="text-lg font-semibold">{formatCurrency(totalCollectedLast7Days)}</p>
            </div>
            <div className="p-3 border border-current/20 rounded">
              <p className="text-xs opacity-70 mb-1">Refunds last 7 days</p>
              <p className="text-lg font-semibold">{refundsLast7Days}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-current/20">
                  <th className="text-left p-2 text-xs font-medium opacity-80">Title</th>
                  <th className="text-left p-2 text-xs font-medium opacity-80">Status</th>
                  <th className="text-left p-2 text-xs font-medium opacity-80">StartsAt</th>
                  <th className="text-left p-2 text-xs font-medium opacity-80">Spots</th>
                  <th className="text-left p-2 text-xs font-medium opacity-80">Total collected</th>
                  <th className="text-left p-2 text-xs font-medium opacity-80">Action</th>
                </tr>
              </thead>
              <tbody>
                {eventsWithStats.map((event) => (
                  <tr key={event.id} className="border-b border-current/10">
                    <td className="p-2 text-xs">{event.title}</td>
                    <td className="p-2 text-xs">{event.status}</td>
                    <td className="p-2 text-xs">{formatDate(event.startsAt)}</td>
                    <td className="p-2 text-xs">{event.spots}</td>
                    <td className="p-2 text-xs">{formatCurrency(event.totalCollected)}</td>
                    <td className="p-2">
                      <Link
                        href={`/ops/${event.id}?key=${encodeURIComponent(key!)}`}
                        className="text-xs underline opacity-80 hover:opacity-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Ops page error:", error);
    return renderDbError();
  }
}
