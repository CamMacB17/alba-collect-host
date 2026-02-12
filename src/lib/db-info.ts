/**
 * Database connection info utilities
 * Safely extracts and masks database connection details
 */

/**
 * Safely extract hostname from DATABASE_URL, masking credentials
 * Example: postgresql://user:pass@postgres.railway.internal:5432/db
 * Returns: postgres.railway.internal:5432
 */
export function getDbHostname(): string | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  try {
    const url = new URL(dbUrl);
    const hostname = url.hostname;
    const port = url.port || (url.protocol === "postgresql:" || url.protocol === "postgres:") ? "5432" : "";
    return port ? `${hostname}:${port}` : hostname;
  } catch {
    // If URL parsing fails, try to extract hostname manually
    const match = dbUrl.match(/@([^:]+):?(\d+)?/);
    if (match) {
      return match[2] ? `${match[1]}:${match[2]}` : match[1];
    }
    return "unknown";
  }
}

/**
 * Detect deployment platform
 */
export function getDeploymentPlatform(): "vercel" | "railway" | "local" | "unknown" {
  if (process.env.VERCEL) return "vercel";
  if (process.env.RAILWAY_ENVIRONMENT) return "railway";
  if (process.env.NODE_ENV === "development") return "local";
  return "unknown";
}

/**
 * Check if database hostname is Railway internal (only accessible from Railway network)
 */
export function isRailwayInternalHost(hostname: string | null): boolean {
  if (!hostname) return false;
  return hostname.includes("railway.internal") || hostname.includes("postgres.railway.internal");
}

/**
 * Get user-friendly error message for database connection issues
 */
export function getDbConnectionErrorMessage(hostname: string | null, platform: string): string {
  if (isRailwayInternalHost(hostname)) {
    if (platform === "vercel") {
      return "Database unreachable: DATABASE_URL points to Railway's internal hostname (postgres.railway.internal), which is only accessible from within Railway's network. Vercel deployments cannot access Railway internal hostnames. Please use Railway's public database URL or deploy on Railway.";
    } else if (platform !== "railway") {
      return `Database unreachable: DATABASE_URL points to Railway's internal hostname (${hostname}), which is only accessible from within Railway's network. This deployment (${platform}) cannot access Railway internal hostnames. Please use Railway's public database URL or deploy on Railway.`;
    }
  }
  return `Database unreachable: Cannot connect to database at ${hostname || "unknown hostname"}. Please ensure the database server is running and accessible.`;
}
