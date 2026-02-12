import { prisma } from "@/lib/prisma";
import { getOptionalEnv } from "@/lib/env";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import RefundButton from "./RefundButton";
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

function formatCurrency(pence: number | null): string {
  if (pence === null) return "-";
  return `£${(pence / 100).toFixed(2)}`;
}

function truncateSessionId(sessionId: string | null): string {
  if (!sessionId) return "-";
  if (sessionId.length <= 20) return sessionId;
  return `${sessionId.substring(0, 10)}...${sessionId.substring(sessionId.length - 10)}`;
}

function isStuckPayment(payment: {
  status: string;
  createdAt: Date;
  stripeCheckoutSessionId: string | null;
}): boolean {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return (
    payment.status === "PLEDGED" &&
    payment.createdAt < fifteenMinutesAgo &&
    payment.stripeCheckoutSessionId !== null
  );
}

export default async function OpsEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  unstable_noStore();

  const { eventId } = await params;
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
    console.log("[Ops Event Page] Database hostname:", dbHostname);
    console.log("[Ops Event Page] Deployment platform:", platform);
    console.log("[Ops Event Page] Is Railway internal:", isRailwayInternalHost(dbHostname));

    // Fetch event with payments
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        organiserName: true,
        organiserEmail: true,
        pricePence: true,
        maxSpots: true,
        closedAt: true,
        startsAt: true,
        createdAt: true,
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            amountPenceCaptured: true,
            createdAt: true,
            stripeCheckoutSessionId: true,
          },
        },
      },
    });

    if (!event) {
      notFound();
    }

    // Calculate stats
    const paidCount = event.payments.filter((p) => p.status === "PAID").length;
    const totalCollected = event.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + (p.amountPenceCaptured || 0), 0);

    // Detect stuck payments
    const stuckPayments = event.payments.filter(isStuckPayment);
    const stuckCount = stuckPayments.length;

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

        {stuckCount > 0 && (
          <div className="mb-4 p-3 border border-current/30 rounded" style={{ background: "rgba(251, 185, 36, 0.1)" }}>
            <p className="text-xs">
              ⚠️ {stuckCount} stuck payment{stuckCount !== 1 ? "s" : ""} (PLEDGED &gt; 15m). Check Stripe sessions and user support.
            </p>
          </div>
        )}
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">{event.title}</h1>
          <p className="text-xs opacity-60 mb-2">Internal operations view. Do not share this link.</p>
          <div className="text-xs opacity-70 space-y-1">
            <p>Organiser: {event.organiserName}</p>
            {event.organiserEmail && <p>Email: {event.organiserEmail}</p>}
            <p>Price: {formatCurrency(event.pricePence)}</p>
            <p>Spots: {paidCount} of {event.maxSpots}</p>
            <p>Total collected: {formatCurrency(totalCollected)}</p>
            <p>Status: {event.closedAt ? "Closed" : "Open"}</p>
            {event.startsAt && <p>Starts: {formatDate(event.startsAt)}</p>}
            <p>Created: {formatDate(event.createdAt)}</p>
          </div>
        </div>

        <h2 className="text-lg font-medium mb-4">Payments</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-current/20">
                <th className="text-left p-2 text-xs font-medium opacity-80">Name</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">Email</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">Status</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">Amount</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">CreatedAt</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">Session ID</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">Stuck</th>
                <th className="text-left p-2 text-xs font-medium opacity-80">Action</th>
              </tr>
            </thead>
            <tbody>
              {event.payments.map((payment) => {
                const stuck = isStuckPayment(payment);
                return (
                  <tr key={payment.id} className="border-b border-current/10">
                    <td className="p-2 text-xs">{payment.name}</td>
                    <td className="p-2 text-xs">{payment.email}</td>
                    <td className="p-2 text-xs">{payment.status}</td>
                    <td className="p-2 text-xs">{formatCurrency(payment.amountPenceCaptured)}</td>
                    <td className="p-2 text-xs">{formatDate(payment.createdAt)}</td>
                    <td className="p-2 text-xs font-mono">{truncateSessionId(payment.stripeCheckoutSessionId)}</td>
                    <td className="p-2 text-xs">
                      {stuck ? (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(251, 185, 36, 0.2)", color: "var(--alba-yellow)" }}>
                          Stuck
                        </span>
                      ) : (
                        <span className="text-xs opacity-50">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {payment.status === "PAID" ? (
                        <RefundButton paymentId={payment.id} key={key!} />
                      ) : (
                        <span className="text-xs opacity-50">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
    );
  } catch (error) {
    console.error("Ops event page error:", error);
    
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
      : "An error occurred while loading the event details.";
    
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold mb-4" style={{ color: "var(--alba-red)" }}>Error loading event</h1>
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
