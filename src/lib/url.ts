/**
 * Safe URL joining helper that prevents double slashes
 * 
 * Examples:
 * - joinUrl("https://x.up.railway.app/", "/api/stripe/webhook") => "https://x.up.railway.app/api/stripe/webhook"
 * - joinUrl("https://x.up.railway.app", "api/stripe/webhook") => "https://x.up.railway.app/api/stripe/webhook"
 * - joinUrl("https://x.up.railway.app/", "api/stripe/webhook") => "https://x.up.railway.app/api/stripe/webhook"
 */
export function joinUrl(base: string, ...paths: string[]): string {
  // Remove trailing slashes from base (except after protocol)
  let normalized = base.replace(/\/+$/, "");
  
  // Join all paths, removing leading/trailing slashes and normalizing
  const normalizedPaths = paths
    .filter(Boolean) // Remove empty strings
    .map(path => path.replace(/^\/+|\/+$/g, "")) // Remove leading/trailing slashes
    .filter(Boolean); // Remove any empty strings after normalization
  
  if (normalizedPaths.length === 0) {
    return normalized;
  }
  
  // Join with single slash
  const pathString = normalizedPaths.join("/");
  return `${normalized}/${pathString}`;
}

/**
 * Assert that a URL does not contain double slashes (except after protocol)
 * Useful for runtime validation
 */
export function assertNoDoubleSlashes(url: string, context?: string): void {
  // Allow double slashes only after protocol (https://, http://)
  const hasDoubleSlash = /[^:]\/\//.test(url);
  if (hasDoubleSlash) {
    const message = `URL contains double slashes: ${url}${context ? ` (${context})` : ""}`;
    console.error(`[url] ${message}`);
    throw new Error(message);
  }
}
