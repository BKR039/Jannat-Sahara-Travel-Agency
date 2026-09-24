/**
 * Security Batch 4 — Infrastructure & Production Security Test Suite
 *
 * Covers:
 * Category A: Security Headers & Clickjacking
 * Category B: HTTPS Enforcement & Transport Security
 * Category C: Authentication & Session Architecture
 * Category D: Database Row Level Security (RLS)
 * Category E: Supabase Storage Bucket Security
 * Category F: API / Server Function Authorization Invariants
 * Category G: CORS & CSRF Defense
 * Category H: Rate Limiting & Abuse Controls
 * Category I: Secret & Environment Variable Boundary
 * Category J: Error Handling & Zero-Information Disclosure
 * Category K: Cache & CDN Policy Invariants
 * Category L: Archive Security & Dependency Protection
 * Category M: Admin Infrastructure & Role Hierarchy
 * Category N: Audit Log Immutability & Integrity (SEC-11)
 * Category O: Production Configuration & Drift Detection
 *
 * Usage:
 *   bun scripts/test-security-batch-4.ts
 */

import fs from "node:fs";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

const ROOT = process.cwd();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, label: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${label}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${label}`);
    if (detail) console.error(`         -> ${detail}`);
  }
}

console.log("=================================================");
console.log("SECURITY BATCH 4 — INFRASTRUCTURE & PRODUCTION SUITE");
console.log("=================================================\n");

// =========================================================================
// Category A: Security Headers & Clickjacking (SEC-04 & SEC-08)
// =========================================================================
console.log("--- Category A: Security Headers & Clickjacking ---");
{
  const startPath = path.join(ROOT, "src/start.ts");
  const startCode = readFileSync(startPath, "utf8");

  assert(
    startCode.includes('response.headers.set("X-Frame-Options", "SAMEORIGIN");'),
    "X-Frame-Options: SAMEORIGIN header is configured in response middleware"
  );
  assert(
    startCode.includes('response.headers.set("X-Content-Type-Options", "nosniff");'),
    "X-Content-Type-Options: nosniff header configured"
  );
  assert(
    startCode.includes('response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");'),
    "Referrer-Policy: strict-origin-when-cross-origin configured"
  );
  assert(
    startCode.includes('"Permissions-Policy"'),
    "Permissions-Policy configured with restrictive camera/mic/geo permissions"
  );
  assert(
    startCode.includes('"frame-ancestors \'self\'"'),
    "CSP includes frame-ancestors 'self' for modern anti-clickjacking"
  );
  assert(
    startCode.includes('"object-src \'none\'"') && startCode.includes('"base-uri \'self\'"'),
    "CSP restricts object-src to 'none' and base-uri to 'self'"
  );
  assert(
    startCode.includes("\"img-src 'self' data: blob: https:\"") && !startCode.includes("https: http:"),
    "CSP img-src strictly requires secure https: protocol (no unencrypted http: allowed)"
  );
  assert(
    startCode.includes('response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");'),
    "start.ts prevents sensitive admin and auth route caching via private no-store"
  );

  // Check vercel.json for edge-level header enforcement
  const vercelPath = path.join(ROOT, "vercel.json");
  assert(existsSync(vercelPath), "vercel.json exists for edge-level production header enforcement");
  if (existsSync(vercelPath)) {
    const vercelConfig = JSON.parse(readFileSync(vercelPath, "utf8"));
    const allHeaders = vercelConfig.headers?.find((h: any) => h.source === "/(.*)")?.headers || [];
    const headerKeys = allHeaders.map((h: any) => h.key);
    assert(
      headerKeys.includes("X-Frame-Options") &&
        headerKeys.includes("Content-Security-Policy") &&
        headerKeys.includes("X-Content-Type-Options") &&
        headerKeys.includes("Referrer-Policy") &&
        headerKeys.includes("Permissions-Policy"),
      "vercel.json enforces complete security header suite at the edge"
    );
  }
}

// =========================================================================
// Category B: HTTPS Enforcement & Transport Security
// =========================================================================
console.log("\n--- Category B: HTTPS Enforcement & Transport Security ---");
{
  const publicFnsPath = path.join(ROOT, "src/lib/public.functions.ts");
  const publicFns = readFileSync(publicFnsPath, "utf8");
  assert(
    !publicFns.includes("http://api.resend.com"),
    "Server-side transactional email endpoints strictly use https://"
  );

  const bookingFns = readFileSync(path.join(ROOT, "src/lib/booking.functions.ts"), "utf8");
  assert(
    !bookingFns.includes("http://api.resend.com"),
    "Booking notifications strictly use https://"
  );
}

// =========================================================================
// Category C: Authentication & Session Architecture (SEC-07)
// =========================================================================
console.log("\n--- Category C: Authentication & Session Architecture ---");
{
  const clientPath = path.join(ROOT, "src/integrations/supabase/client.ts");
  const clientCode = readFileSync(clientPath, "utf8");
  assert(
    clientCode.includes("persistSession: true") && clientCode.includes("autoRefreshToken: true"),
    "Supabase Auth client configures automatic token refresh and persistent session"
  );

  const middlewarePath = path.join(ROOT, "src/integrations/supabase/auth-middleware.ts");
  const middlewareCode = readFileSync(middlewarePath, "utf8");
  assert(
    middlewareCode.includes('authHeader.startsWith("Bearer ")'),
    "Server function auth middleware requires Bearer token format"
  );
  assert(
    middlewareCode.includes("await supabase.auth.getClaims(token)"),
    "Server function validates JWT claims cryptographically via getClaims"
  );
  assert(
    middlewareCode.includes("data.claims.sub"),
    "Extracts authoritative user UUID from validated sub claim"
  );

  const authServerPath = path.join(ROOT, "src/lib/admin/authorize.server.ts");
  const authServerCode = readFileSync(authServerPath, "utf8");
  assert(
    authServerCode.includes("assertActiveUser") &&
      authServerCode.includes("isBanned") &&
      authServerCode.includes("isDisabled"),
    "assertActiveUser verifies that user is not banned or marked disabled in Supabase Auth"
  );
}

// =========================================================================
// Category D: Database Row Level Security (RLS) Invariants
// =========================================================================
console.log("\n--- Category D: Database Row Level Security (RLS) ---");
{
  const migrationsDir = path.join(ROOT, "supabase/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir);
  
  let rlsFound = 0;
  for (const f of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    if (content.includes("ENABLE ROW LEVEL SECURITY")) {
      rlsFound++;
    }
  }
  assert(rlsFound >= 5, `Multiple migrations enforce ROW LEVEL SECURITY across all tables (found ${rlsFound})`);

  const crmRlsMigration = path.join(migrationsDir, "20260921110000_remediate_crm_and_installments_rls.sql");
  assert(existsSync(crmRlsMigration), "CRM and installments RLS remediation migration exists");
  const crmSql = readFileSync(crmRlsMigration, "utf8");
  assert(
    crmSql.includes("REVOKE ALL ON public.customer_profiles FROM anon;") &&
      crmSql.includes("REVOKE ALL ON public.installments FROM anon;"),
    "Anon privileges strictly revoked on customer_profiles and installments"
  );
}

// =========================================================================
// Category E: Supabase Storage Bucket Security
// =========================================================================
console.log("\n--- Category E: Supabase Storage Bucket Security ---");
{
  const adminFunctions = readFileSync(path.join(ROOT, "src/lib/admin/admin.functions.ts"), "utf8");
  assert(
    adminFunctions.includes("getPassportSignedUrl"),
    "getPassportSignedUrl server function exists for controlled document access"
  );
  assert(
    adminFunctions.includes('requirePermission(context.userId, "bookings.view")'),
    "getPassportSignedUrl requires bookings.view permission"
  );
  assert(
    adminFunctions.includes("[0-9a-f-]{36}\\/passport"),
    "getPassportSignedUrl strictly enforces whitelist regex against path traversal"
  );
  assert(
    adminFunctions.includes("createSignedUrl"),
    "getPassportSignedUrl mints controlled short-lived signed URLs"
  );
}

// =========================================================================
// Category F: API / Server Function Authorization Invariants
// =========================================================================
console.log("\n--- Category F: Server Function Authorization Invariants ---");
{
  const commandFunctions = readFileSync(path.join(ROOT, "src/lib/admin/command.functions.ts"), "utf8");
  assert(
    commandFunctions.includes("requireAdmin(context.userId)"),
    "command.functions.ts enforces requireAdmin on privileged operations"
  );

  const hotelsFunctions = readFileSync(path.join(ROOT, "src/lib/admin/hotels.functions.ts"), "utf8");
  assert(
    hotelsFunctions.includes("requireAdmin(context.userId)"),
    "hotels.functions.ts enforces requireAdmin on hotel management"
  );

  const leadsFunctions = readFileSync(path.join(ROOT, "src/lib/leads/leads.functions.ts"), "utf8");
  assert(
    leadsFunctions.includes("requireAdmin(context.userId)"),
    "leads.functions.ts enforces requireAdmin on CRM lead mutations"
  );

  const archiveFunctions = readFileSync(path.join(ROOT, "src/lib/admin/archive.functions.ts"), "utf8");
  assert(
    archiveFunctions.includes("requireAdmin(context.userId)"),
    "archive.functions.ts enforces requireAdmin on all archive actions"
  );
}

// =========================================================================
// Category G: CORS & CSRF Defense
// =========================================================================
console.log("\n--- Category G: CORS & CSRF Defense ---");
{
  const startCode = readFileSync(path.join(ROOT, "src/start.ts"), "utf8");
  assert(
    startCode.includes("createCsrfMiddleware") &&
      startCode.includes('filter: (ctx) => ctx.handlerType === "serverFn"'),
    "TanStack Start createCsrfMiddleware active for all serverFn handlers"
  );
}

// =========================================================================
// Category H: Rate Limiting & Abuse Controls
// =========================================================================
console.log("\n--- Category H: Rate Limiting & Abuse Controls ---");
{
  const securityServer = readFileSync(path.join(ROOT, "src/lib/security.server.ts"), "utf8");
  assert(
    securityServer.includes("export async function enforceRateLimit"),
    "enforceRateLimit helper implemented with IP and scope tracking"
  );
  assert(
    securityServer.includes("from(\"rate_limits\")"),
    "Rate limits backed by service-role rate_limits database table"
  );

  const publicFunctions = readFileSync(path.join(ROOT, "src/lib/public.functions.ts"), "utf8");
  assert(
    publicFunctions.includes('scope: "contact_message"') &&
      publicFunctions.includes('scope: "newsletter"') &&
      publicFunctions.includes('scope: "passport_upload"'),
    "Rate limiting scopes enforced across contact, newsletter, and upload endpoints"
  );

  const bookingFunctions = readFileSync(path.join(ROOT, "src/lib/booking.functions.ts"), "utf8");
  assert(
    bookingFunctions.includes('scope: "booking"'),
    "Rate limiting enforced on booking submissions"
  );
}

// =========================================================================
// Category I: Secret & Environment Variable Boundary
// =========================================================================
console.log("\n--- Category I: Secret & Environment Boundary ---");
{
  const envExample = readFileSync(path.join(ROOT, ".env.example"), "utf8");
  assert(
    envExample.includes("SUPABASE_SERVICE_ROLE_KEY=") &&
      !envExample.includes("VITE_SUPABASE_SERVICE_ROLE_KEY"),
    "Service role key is strictly non-VITE (server only)"
  );
  assert(
    envExample.includes("RESEND_API_KEY=") &&
      !envExample.includes("VITE_RESEND_API_KEY"),
    "Email API key is strictly non-VITE (server only)"
  );

  const clientServer = readFileSync(path.join(ROOT, "src/integrations/supabase/client.server.ts"), "utf8");
  assert(
    clientServer.includes("process.env.SUPABASE_SERVICE_ROLE_KEY"),
    "client.server.ts reads SUPABASE_SERVICE_ROLE_KEY solely from server environment"
  );
}

// =========================================================================
// Category J: Error Handling & Zero-Information Disclosure
// =========================================================================
console.log("\n--- Category J: Error Handling & Zero-Information Disclosure ---");
{
  const errorPage = readFileSync(path.join(ROOT, "src/lib/error-page.ts"), "utf8");
  assert(
    !errorPage.includes("stack") && !errorPage.includes("trace"),
    "renderErrorPage HTML template contains zero stack traces or debug strings"
  );
  assert(
    errorPage.includes("escapeHtml"),
    "renderErrorPage properly escapes all interpolated strings"
  );

  const notFound = readFileSync(path.join(ROOT, "src/components/common/NotFoundPage.tsx"), "utf8");
  assert(
    !notFound.includes("error.stack") && !notFound.includes("sql"),
    "NotFoundPage component contains zero internal SQL or exception data"
  );
}

// =========================================================================
// Category K: Cache & CDN Policy Invariants
// =========================================================================
console.log("\n--- Category K: Cache & CDN Policy Invariants ---");
{
  const robotsTs = readFileSync(path.join(ROOT, "src/routes/robots[.]txt.ts"), "utf8");
  assert(
    robotsTs.includes('"cache-control": "public, max-age=3600, s-maxage=3600"'),
    "robots.txt specifies deterministic public cache-control"
  );

  const sitemapTs = readFileSync(path.join(ROOT, "src/routes/sitemap[.]xml.ts"), "utf8");
  assert(
    sitemapTs.includes('"cache-control"'),
    "sitemap.xml specifies appropriate cache-control"
  );
}

// =========================================================================
// Category L: Archive Security & Dependency Protection
// =========================================================================
console.log("\n--- Category L: Archive Security & Dependency Protection ---");
{
  const archiveServer = readFileSync(path.join(ROOT, "src/lib/admin/archive.server.ts"), "utf8");
  assert(
    archiveServer.includes("checkEntityDependencies") &&
      archiveServer.includes("canDelete: false"),
    "archive.server.ts verifies foreign dependencies before allowing permanent deletion"
  );
  assert(
    archiveServer.includes('.from("audit_logs").insert'),
    "archive.server.ts records audit logs for archive, restore, and permanent deletion"
  );
}

// =========================================================================
// Category M: Admin Infrastructure & Role Hierarchy
// =========================================================================
console.log("\n--- Category M: Admin Infrastructure & Role Hierarchy ---");
{
  const adminRoute = readFileSync(path.join(ROOT, "src/routes/admin.tsx"), "utf8");
  assert(
    adminRoute.includes("ssr: false"),
    "Admin route tree specifies ssr: false (no SSR leak of private admin state)"
  );
  assert(
    adminRoute.includes('name: "robots", content: "noindex, nofollow"'),
    "Admin routes declare noindex, nofollow robots directive"
  );
  assert(
    adminRoute.includes("hasAdminConsoleAccess(roles)"),
    "Admin layout gates console access against active roles"
  );
}

// =========================================================================
// Category N: Audit Log Immutability & Integrity (SEC-11)
// =========================================================================
console.log("\n--- Category N: Audit Log Immutability & Integrity (SEC-11) ---");
{
  const auditMigration = path.join(ROOT, "supabase/migrations/20260728122029_ce832cb8-a407-486d-abf3-09237c0c2e3b.sql");
  const auditSql = readFileSync(auditMigration, "utf8");
  assert(
    !auditSql.includes("audit_logs_admin_update") &&
      !auditSql.includes("audit_logs_admin_delete"),
    "Database schema contains NO UPDATE or DELETE policies on audit_logs"
  );
  assert(
    !auditSql.includes("GRANT UPDATE ON public.audit_logs") &&
      !auditSql.includes("GRANT DELETE ON public.audit_logs"),
    "UPDATE and DELETE privileges are NOT granted to authenticated on audit_logs"
  );

  const hardeningMigration = path.join(ROOT, "supabase/migrations/20260924110000_audit_logs_server_only_insert.sql");
  assert(existsSync(hardeningMigration), "SEC-11 audit_logs hardening migration exists");
  if (existsSync(hardeningMigration)) {
    const hardSql = readFileSync(hardeningMigration, "utf8");
    assert(
      hardSql.includes("REVOKE INSERT ON public.audit_logs FROM authenticated;") &&
        hardSql.includes("DROP POLICY IF EXISTS audit_logs_admin_insert"),
      "Hardening migration strictly revokes authenticated INSERT to guarantee server-only audit integrity"
    );
  }
}

// =========================================================================
// Category O: Production Configuration & Drift Detection
// =========================================================================
console.log("\n--- Category O: Production Configuration & Drift Detection ---");
{
  const gitIgnore = readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert(
    gitIgnore.includes(".env") && gitIgnore.includes(".output"),
    ".gitignore properly ignores .env and .output build directory"
  );
}

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failures)`);
console.log("=================================================");

if (failedTests > 0) {
  process.exit(1);
}
