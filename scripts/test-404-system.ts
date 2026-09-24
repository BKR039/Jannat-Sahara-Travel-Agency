/**
 * JANNAT SAHRA — 404 / NOT FOUND SYSTEM TEST SUITE
 *
 * Verifies:
 * 1. 404 Test Matrix (unknown public routes, dynamic missing entities, unknown admin routes).
 * 2. Proper HTTP 404 response status code on SSR.
 * 3. Canonical 404 UI elements present (Arabic headings, compass icon, primary & secondary CTAs).
 * 4. Zero sensitive data disclosure (no stack traces, no internal database errors, no leaked secrets).
 * 5. Existing routes regression (homepage, packages, umrah, trips, hotels, contact, admin routes, archive).
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASSED: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${msg}`);
    failed++;
  }
}

const BASE_URL = process.env.TEST_URL || "http://localhost:8085";

const NOT_FOUND_MATRIX = [
  { path: "/does-not-exist", label: "Unknown public route (/does-not-exist)" },
  { path: "/random-page", label: "Unknown public route (/random-page)" },
  { path: "/foo/bar/baz", label: "Deep unknown public route (/foo/bar/baz)" },
  { path: "/admin/does-not-exist", label: "Unknown admin route (/admin/does-not-exist)" },
  { path: "/packages/does-not-exist", label: "Missing dynamic package (/packages/does-not-exist)" },
  { path: "/blog/does-not-exist", label: "Missing dynamic blog (/blog/does-not-exist)" },
  { path: "/trips/does-not-exist", label: "Unknown trip child route (/trips/does-not-exist)" },
  { path: "/hotels/does-not-exist", label: "Unknown hotel child route (/hotels/does-not-exist)" },
];

const VALID_ROUTES_REGRESSION = [
  { path: "/", label: "Homepage (/)" },
  { path: "/about", label: "About page (/about)" },
  { path: "/umrah", label: "Umrah programmes (/umrah)" },
  { path: "/umrah/builder", label: "Umrah custom builder (/umrah/builder)" },
  { path: "/trips", label: "Trips listing (/trips)" },
  { path: "/flights", label: "Flights page (/flights)" },
  { path: "/contact", label: "Contact & branches (/contact)" },
  { path: "/gallery", label: "Gallery (/gallery)" },
  { path: "/blog", label: "Blog listing (/blog)" },
  { path: "/admin", label: "Admin console (/admin)" },
  { path: "/admin/hotels", label: "Admin hotels management (/admin/hotels)" },
  { path: "/admin/archive", label: "Admin archive dashboard (/admin/archive)" },
];

const FORBIDDEN_LEAK_PATTERNS = [
  "PostgresError",
  "PGRST",
  "supabaseKey",
  "service_role",
  "process.env",
  "stack trace",
  "SyntaxError",
  "at Object.<anonymous>",
  "node_modules",
  "VITE_SUPABASE_SERVICE_ROLE",
];

async function run() {
  console.log("==================================================");
  console.log("JANNAT SAHRA — 404 / NOT FOUND SYSTEM TESTS");
  console.log(`Targeting: ${BASE_URL}`);
  console.log("==================================================\n");

  // --- PART 1: 404 Matrix Verification ---
  console.log("--- PART 1: 404 Not Found Matrix & HTTP Status ---");
  for (const item of NOT_FOUND_MATRIX) {
    try {
      const res = await fetch(`${BASE_URL}${item.path}`, {
        headers: { Accept: "text/html" },
      });
      const body = await res.text();

      // Check HTTP 404
      assert(res.status === 404, `${item.label} returns HTTP status 404 (actual: ${res.status})`);

      // Check Canonical 404 UI Presence
      // Note: Admin routes use ssr: false (SPA mode) for auth protection, so UI renders on client hydration.
      const isSsrAdmin = item.path.startsWith("/admin");
      if (!isSsrAdmin) {
        const has404Number = body.includes("404");
        const hasArabicTitle = body.includes("الصفحة غير موجودة");
        const hasHomeCta = body.includes("العودة إلى الرئيسية");

        assert(
          has404Number && hasArabicTitle && hasHomeCta,
          `${item.label} renders canonical Jannat Sahara Not Found UI on SSR`,
        );
      } else {
        assert(
          res.status === 404 && body.includes("__root__"),
          `${item.label} returns secure HTTP 404 status without leaking private admin state`,
        );
      }

      // Check security: zero sensitive data leaks
      let hasLeak = false;
      for (const pattern of FORBIDDEN_LEAK_PATTERNS) {
        if (body.includes(pattern)) {
          console.error(`Leak detected in ${item.path}: found ${pattern}`);
          hasLeak = true;
        }
      }
      assert(!hasLeak, `${item.label} contains zero sensitive stack traces or database error leaks`);
    } catch (err: any) {
      assert(false, `${item.label} fetch threw error: ${err.message}`);
    }
  }

  // --- PART 2: Valid Routes Regression ---
  console.log("\n--- PART 2: Valid Routes Regression Suite ---");
  for (const item of VALID_ROUTES_REGRESSION) {
    try {
      const res = await fetch(`${BASE_URL}${item.path}`, {
        headers: { Accept: "text/html" },
      });
      const body = await res.text();

      // Should return HTTP 200 (or redirect for unauthenticated admin subpages)
      assert(
        res.status === 200 || (res.status >= 300 && res.status < 400),
        `${item.label} returns valid HTTP status ${res.status}`,
      );

      // Should not render the 404 page for valid paths
      const rendersNotFound =
        body.includes("404") &&
        body.includes("الصفحة غير موجودة") &&
        body.includes("العودة إلى الرئيسية");

      assert(!rendersNotFound, `${item.label} DOES NOT trigger false-positive 404`);
    } catch (err: any) {
      assert(false, `${item.label} regression fetch failed: ${err.message}`);
    }
  }

  // --- PART 3: Security & Information Concealment ---
  console.log("\n--- PART 3: Security & Header Validation ---");
  const sampleRes = await fetch(`${BASE_URL}/does-not-exist`);
  assert(
    sampleRes.headers.get("x-content-type-options") === "nosniff",
    "Security header X-Content-Type-Options: nosniff present on 404",
  );
  assert(
    sampleRes.headers.get("x-frame-options") === "SAMEORIGIN",
    "Security header X-Frame-Options: SAMEORIGIN present on 404",
  );
  assert(
    !!sampleRes.headers.get("content-security-policy"),
    "Content-Security-Policy header present on 404 response",
  );

  console.log("\n==================================================");
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} 404 & REGRESSION TESTS PASSED!`);
  } else {
    console.error(`❌ ${failed} TESTS FAILED (${passed} passed)`);
    process.exit(1);
  }
  console.log("==================================================");
}

run().catch((err) => {
  console.error("FATAL 404 TEST ERROR:", err);
  process.exit(1);
});
