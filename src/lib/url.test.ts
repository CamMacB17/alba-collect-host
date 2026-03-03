/**
 * Unit tests for URL joining helper
 * Run with: npx tsx src/lib/url.test.ts
 */

import { joinUrl, assertNoDoubleSlashes } from "./url";

// Test cases
const testCases = [
  {
    name: "base with trailing slash, path with leading slash",
    base: "https://x.up.railway.app/",
    paths: ["/api/stripe/webhook"],
    expected: "https://x.up.railway.app/api/stripe/webhook",
  },
  {
    name: "base without trailing slash, path with leading slash",
    base: "https://x.up.railway.app",
    paths: ["/api/stripe/webhook"],
    expected: "https://x.up.railway.app/api/stripe/webhook",
  },
  {
    name: "base with trailing slash, path without leading slash",
    base: "https://x.up.railway.app/",
    paths: ["api/stripe/webhook"],
    expected: "https://x.up.railway.app/api/stripe/webhook",
  },
  {
    name: "base without trailing slash, path without leading slash",
    base: "https://x.up.railway.app",
    paths: ["api/stripe/webhook"],
    expected: "https://x.up.railway.app/api/stripe/webhook",
  },
  {
    name: "multiple path segments",
    base: "https://x.up.railway.app",
    paths: ["e", "my-event-slug"],
    expected: "https://x.up.railway.app/e/my-event-slug",
  },
  {
    name: "base with multiple trailing slashes",
    base: "https://x.up.railway.app///",
    paths: ["/api/stripe/webhook"],
    expected: "https://x.up.railway.app/api/stripe/webhook",
  },
  {
    name: "path with multiple leading slashes",
    base: "https://x.up.railway.app",
    paths: ["///api/stripe/webhook"],
    expected: "https://x.up.railway.app/api/stripe/webhook",
  },
];

function runTests() {
  console.log("Running URL join tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    try {
      const result = joinUrl(test.base, ...test.paths);
      if (result === test.expected) {
        console.log(`✓ ${test.name}`);
        passed++;
      } else {
        console.error(`✗ ${test.name}`);
        console.error(`  Expected: ${test.expected}`);
        console.error(`  Got:      ${result}`);
        failed++;
      }
      
      // Assert no double slashes (except after protocol)
      try {
        assertNoDoubleSlashes(result, test.name);
      } catch (err) {
        console.error(`✗ ${test.name} - Double slash assertion failed`);
        console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ ${test.name} - Exception thrown`);
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }
  
  // Test double slash detection
  console.log("\nTesting double slash detection...\n");
  const doubleSlashCases = [
    { url: "https://x.up.railway.app//api/stripe/webhook", shouldFail: true },
    { url: "https://x.up.railway.app/api//stripe/webhook", shouldFail: true },
    { url: "https://x.up.railway.app/api/stripe/webhook", shouldFail: false },
    { url: "https://x.up.railway.app/e/my-slug", shouldFail: false },
  ];
  
  for (const test of doubleSlashCases) {
    try {
      assertNoDoubleSlashes(test.url, "test");
      if (test.shouldFail) {
        console.error(`✗ Double slash not detected: ${test.url}`);
        failed++;
      } else {
        console.log(`✓ No double slash: ${test.url}`);
        passed++;
      }
    } catch (err) {
      if (test.shouldFail) {
        console.log(`✓ Double slash detected: ${test.url}`);
        passed++;
      } else {
        console.error(`✗ False positive: ${test.url}`);
        console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }
  }
  
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
