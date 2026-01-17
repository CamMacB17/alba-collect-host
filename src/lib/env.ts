/**
 * Environment variable validation
 * Validates required env vars when accessed (lazy validation)
 */

const isProduction = process.env.NODE_ENV === "production";

interface RequiredEnvVars {
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  APP_URL: string;
  CRON_SECRET: string;
}

/**
 * Get validated environment variable (throws if missing in production)
 * Validates lazily when accessed, not at module load time
 */
export function getRequiredEnv(key: keyof RequiredEnvVars): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    const message = `Required environment variable ${key} is not set`;
    if (isProduction) {
      throw new Error(message);
    } else {
      console.warn(`[env] ${message}`);
      return "";
    }
  }
  return value.trim();
}

/**
 * Get optional environment variable
 */
export function getOptionalEnv(key: string, defaultValue: string = ""): string {
  return process.env[key]?.trim() || defaultValue;
}
