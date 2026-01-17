import { createHash } from "crypto";

/**
 * In-memory rate limiter
 * Key format: `${ip}:${tokenHash}`
 * Limit: 10 actions per 60 seconds
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Hash an admin token using SHA-256
 */
function hashAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Get IP address from headers
 */
function getIpFromHeaders(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP if multiple
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Assert rate limit or throw error
 * @throws Error if rate limit exceeded
 */
export async function assertRateLimitOrThrow(args: { adminToken: string; headers: Headers }): Promise<void> {
  const { adminToken, headers } = args;

  const ip = getIpFromHeaders(headers);
  const tokenHash = hashAdminToken(adminToken);
  const key = `${ip}:${tokenHash}`;

  const now = Date.now();
  const windowMs = 60 * 1000; // 60 seconds
  const maxActions = 10;

  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    // New window or expired entry
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (entry.count >= maxActions) {
    throw new Error("Too many requests. Please wait a moment.");
  }

  // Increment count
  entry.count++;
  rateLimitMap.set(key, entry);
}
