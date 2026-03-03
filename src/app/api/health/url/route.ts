import { NextResponse } from "next/server";
import { joinUrl, assertNoDoubleSlashes } from "@/lib/url";
import { getRequiredEnv } from "@/lib/env";

/**
 * GET /api/health/url
 * Validates that URL construction doesn't produce double slashes
 * Returns 200 if all checks pass, 500 if any fail
 */
export async function GET() {
  try {
    const appUrl = getRequiredEnv("APP_URL");
    
    // Test critical URL constructions
    const testUrls = [
      joinUrl(appUrl, "e", "test-slug"),
      joinUrl(appUrl, "api", "stripe", "webhook"),
      joinUrl(appUrl, "admin", "test-token"),
      joinUrl(appUrl, "/e", "test-slug"), // path with leading slash
      joinUrl(appUrl + "/", "e", "test-slug"), // base with trailing slash
    ];
    
    // Assert no double slashes
    for (const url of testUrls) {
      assertNoDoubleSlashes(url, "health check");
    }
    
    // Check for specific problematic patterns
    const hasRailwayDoubleSlash = testUrls.some(url => url.includes("railway.app//"));
    const hasApiDoubleSlash = testUrls.some(url => url.includes("//api/"));
    
    if (hasRailwayDoubleSlash || hasApiDoubleSlash) {
      return NextResponse.json(
        {
          ok: false,
          error: "Double slashes detected",
          hasRailwayDoubleSlash,
          hasApiDoubleSlash,
          testUrls,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      ok: true,
      message: "All URL constructions valid",
      testUrls,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
