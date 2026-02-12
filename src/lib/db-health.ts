import { prisma } from "@/lib/prisma";

/**
 * Check database connectivity with timeout
 * Returns simple { ok, message } format
 */
export async function checkDbHealth(): Promise<{ ok: boolean; message?: string }> {
  try {
    // Create a promise that rejects after 2.5 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Database connection timeout")), 2500);
    });

    // Race the query against the timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise,
    ]);

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isUnreachable = 
      errorMessage.includes("Can't reach database server") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("P1001") ||
      errorMessage.includes("connection timeout");

    if (isUnreachable) {
      return { ok: false, message: "Database unreachable" };
    }
    return { ok: false, message: `Database error: ${errorMessage}` };
  }
}
