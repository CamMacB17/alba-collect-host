import { createHash } from "crypto";

/**
 * Rate limiter using Upstash if available, otherwise in-memory Map
 * Key format: `${ip}:${tokenHash}`
 * Limit: 10 actions per 60 seconds (10/min)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback
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
 * Check rate limit using Upstash Redis if available
 * Returns null if Upstash is not available (should use in-memory fallback)
 */
async function checkUpstashRateLimit(key: string, windowMs: number, maxActions: number): Promise<{ allowed: boolean } | null> {
  try {
    // Check if Upstash environment variables are present
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      return null; // Fall back to in-memory
    }

    // Use Upstash REST API for rate limiting with sliding window
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Pipeline: remove old entries, add current, count, set expiry
    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, "0", windowStart.toString()],
        ["ZADD", key, now.toString(), `${now}-${Math.random()}`],
        ["ZCOUNT", key, windowStart.toString(), now.toString()],
        ["EXPIRE", key, Math.ceil(windowMs / 1000).toString()],
      ]),
    });

    if (!response.ok) {
      return null; // Fall back to in-memory
    }

    const results = await response.json();
    const count = results[2]?.result || 0;

    if (count > maxActions) {
      return { allowed: false };
    }

    return { allowed: true };
  } catch (err) {
    // Fall back to in-memory on any error
    return null;
  }
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

  const windowMs = 60 * 1000; // 60 seconds (1 minute)
  const maxActions = 10;

  // Try Upstash first if available
  const upstashResult = await checkUpstashRateLimit(key, windowMs, maxActions);
  
  if (upstashResult === null) {
    // Upstash not available or failed, use in-memory fallback
    const now = Date.now();
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
  } else if (!upstashResult.allowed) {
    // Upstash rate limit exceeded
    throw new Error("Too many requests. Please wait a moment.");
  }
  // If upstashResult.allowed === true, we're good to go
}
