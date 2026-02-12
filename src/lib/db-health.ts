import { prisma } from "@/lib/prisma";
import { getDbHostname, getDeploymentPlatform, isRailwayInternalHost } from "@/lib/db-info";

/**
 * Check database health (server-side)
 * Returns health status without needing HTTP request
 */
export async function checkDbHealth(): Promise<{
  status: "ok" | "error";
  message: string;
  hostname: string | null;
  platform: string;
  isRailwayInternal: boolean;
  error?: string;
}> {
  const dbHostname = getDbHostname();
  const platform = getDeploymentPlatform();
  const isRailwayInternal = isRailwayInternalHost(dbHostname);

  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: "ok",
      message: "Database connection successful",
      hostname: dbHostname,
      platform,
      isRailwayInternal,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError = errorMessage.includes("Can't reach database server") || 
                              errorMessage.includes("database server") ||
                              errorMessage.includes("P1001");

    let friendlyMessage = "Database connection failed";
    if (isConnectionError) {
      if (isRailwayInternal && platform !== "railway") {
        friendlyMessage = `Database unreachable: DATABASE_URL points to Railway's internal hostname (${dbHostname}), which is only accessible from within Railway's network. This deployment (${platform}) cannot access Railway internal hostnames. Please deploy on Railway or use Railway's public database URL.`;
      } else {
        friendlyMessage = `Database unreachable: Cannot connect to database at ${dbHostname || "unknown hostname"}. Please ensure the database server is running and accessible.`;
      }
    }

    return {
      status: "error",
      message: friendlyMessage,
      hostname: dbHostname,
      platform,
      isRailwayInternal,
      error: errorMessage,
    };
  }
}
