import { prisma } from "@/lib/prisma";
import { getOptionalEnv } from "@/lib/env";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDbHostname, getDeploymentPlatform, isRailwayInternalHost } from "@/lib/db-info";
import { checkDbHealth } from "@/lib/db-health";

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

  try {
    // Check database health first
    const dbHealthCheck = await checkDbHealth();
    
    if (dbHealthCheck.status !== 'ok') {
      // Database health check failed - show actionable error
      return (
        <main className="min-h-screen p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold mb-4" style={{ color: "var(--alba-red)" }}>Database Connection Error</h1>
            <p className="mb-4">{dbHealthCheck.message}</p>
            {dbHealthCheck.hostname && (
              <div className="mb-4 p-3 border border-current/30 rounded bg-black/10">
                <p className="text-xs mb-1">Database hostname: <code className="bg-black/20 px-1 rounded">{dbHealthCheck.hostname}</code></p>
                <p className="text-xs mb-1">Deployment platform: <code className="bg-black/20 px-1 rounded">{dbHealthCheck.platform}</code></p>
                {dbHealthCheck.isRailwayInternal && dbHealthCheck.platform !== "railway" && (
                  <div className="mt-3 p-2 border border-yellow-500/50 rounded bg-yellow-500/10">
                    <p className="text-xs text-yellow-400 font-semibold mb-1">⚠️ Action Required:</p>
                    <p className="text-xs text-yellow-400">
                      Railway internal hostnames are only accessible from Railway deployments. 
                      {dbHealthCheck.platform === "vercel" && " Use Railway's public database URL in Vercel environment variables, or deploy this app on Railway."}
                      {dbHealthCheck.platform !== "vercel" && dbHealthCheck.platform !== "railway" && ` Deploy this app on Railway or use Railway's public database URL.`}
                    </p>
                  </div>
                )}
                {dbHealthCheck.platform === "railway" && dbHealthCheck.isRailwayInternal && (
                  <div className="mt-3 p-2 border border-blue-500/50 rounded bg-blue-500/10">
                    <p className="text-xs text-blue-400 font-semibold mb-1">ℹ️ Railway Deployment Detected:</p>
                    <p className="text-xs text-blue-400">
                      Ensure the PostgreSQL service is running and attached to this Railway service in the same project.
                      Check Railway dashboard → Services → verify PostgreSQL is running and connected.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      );
    }

    // Log database connection info for debugging
    const dbHostname = getDbHostname();
    const platform = getDeploymentPlatform();
    console.log("[Ops Dashboard] Database hostname:", dbHostname);
    console.log("[Ops Dashboard] Deployment platform:", platform);
    console.log("[Ops Dashboard] Is Railway internal:", isRailwayInternalHost(dbHostname));

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch summary stats
    const [eventsLast7Days, paymentsLast7Days, refundsLast7Days] = await Promise.all([
      // Events last 7 days (count)
      prisma.event.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      // Payments last 7 days (PAID only, for total collected)
      prisma.payment.findMany({
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
      }),
      // Refunds last 7 days (count where refundedAt not null)
      prisma.payment.count({
        where: {
          refundedAt: {
            gte: sevenDaysAgo,
            not: null,
          },
        },
      }),
    ]);

    // Calculate total collected last 7 days
    const totalCollectedLast7Days = paymentsLast7Days.reduce(
      (sum, p) => sum + (p.amountPenceCaptured || 0),
      0
    );

    // Fetch last 50 events ordered by createdAt desc
    const events = await prisma.event.findMany({
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
    
    // Get database connection info for better error message
    const dbHostname = getDbHostname();
    const platform = getDeploymentPlatform();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDbConnectionError = errorMessage.includes("Can't reach database server") || 
                                 errorMessage.includes("database server") ||
                                 errorMessage.includes("P1001");
    
    // Generate user-friendly error message if it's a database connection issue
    const userMessage = isDbConnectionError 
      ? getDbConnectionErrorMessage(dbHostname, platform)
      : "An error occurred while loading the ops dashboard.";
    
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold mb-4" style={{ color: "var(--alba-red)" }}>Error loading ops dashboard</h1>
          <p className="mb-4">{userMessage}</p>
          {isDbConnectionError && dbHostname && (
            <div className="mb-4 p-3 border border-current/30 rounded bg-black/10">
              <p className="text-xs mb-1">Database hostname: <code className="bg-black/20 px-1 rounded">{dbHostname}</code></p>
              <p className="text-xs mb-1">Deployment platform: <code className="bg-black/20 px-1 rounded">{platform}</code></p>
              {isRailwayInternalHost(dbHostname) && platform !== "railway" && (
                <p className="text-xs mt-2 text-yellow-400">
                  ⚠️ Railway internal hostnames are only accessible from Railway deployments. 
                  {platform === "vercel" && " Use Railway's public database URL in Vercel environment variables."}
                </p>
              )}
            </div>
          )}
          <details className="text-xs opacity-70">
            <summary className="cursor-pointer mb-2">Technical error details</summary>
            <pre className="bg-black/10 p-2 rounded overflow-auto">
              {errorMessage}
            </pre>
          </details>
        </div>
      </main>
    );
  }
}
