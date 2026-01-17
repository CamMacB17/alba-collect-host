/**
 * Minimal structured logger
 * In production: outputs JSON
 * In development: outputs formatted console messages
 */

const isProduction = process.env.NODE_ENV === "production";

function formatLog(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>): string {
  const logEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };

  if (isProduction) {
    return JSON.stringify(logEntry);
  } else {
    // Dev: formatted console output
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${logEntry.ts}] [${level.toUpperCase()}] ${msg}${metaStr}`;
  }
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>): void {
    const output = formatLog("info", msg, meta);
    console.log(output);
  },

  warn(msg: string, meta?: Record<string, unknown>): void {
    const output = formatLog("warn", msg, meta);
    console.warn(output);
  },

  error(msg: string, meta?: Record<string, unknown>): void {
    const output = formatLog("error", msg, meta);
    console.error(output);
  },
};

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
