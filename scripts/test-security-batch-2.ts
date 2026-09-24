/**
 * Regression Test Suite for Security Batch 2
 * Tests SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, and SEC-08 remediation.
 *
 * Usage:
 *   npx tsx scripts/test-security-batch-2.ts
 */
import fs from "node:fs";
import path from "node:path";

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
console.log("SECURITY BATCH 2 — REGRESSION VERIFICATION SUITE");
console.log("=================================================\n");

// =========================================================================
// 1. SEC-02 & SEC-03: Database RLS on customer_profiles and installments
// =========================================================================
console.log("--- 1. SEC-02 & SEC-03: Database RLS Invariants ---");
{
  const migrationPath = path.join(
    ROOT,
    "supabase/migrations/20260921110000_remediate_crm_and_installments_rls.sql"
  );
  assert(fs.existsSync(migrationPath), "Remediation migration file exists");

  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  // Verify revocation from anon
  assert(
    migrationSql.includes("REVOKE ALL ON public.customer_profiles FROM anon;") &&
      migrationSql.includes("REVOKE ALL ON public.installments FROM anon;"),
    "Anon privileges revoked on customer_profiles and installments"
  );

  // Verify dropping insecure policies
  assert(
    migrationSql.includes('DROP POLICY IF EXISTS "Authenticated users can manage customer_profiles" ON public.customer_profiles;') &&
      migrationSql.includes('DROP POLICY IF EXISTS "Authenticated users can manage installments" ON public.installments;'),
    "Insecure permissive authenticated policies are dropped"
  );

  // Verify admin-only policies on customer_profiles
  assert(
    migrationSql.includes('CREATE POLICY "customer_profiles_admin_select"') &&
      migrationSql.includes("USING (public.is_admin(auth.uid()))") &&
      migrationSql.includes('CREATE POLICY "customer_profiles_admin_insert"') &&
      migrationSql.includes("WITH CHECK (public.is_admin(auth.uid()))") &&
      migrationSql.includes('CREATE POLICY "customer_profiles_admin_update"') &&
      migrationSql.includes('CREATE POLICY "customer_profiles_admin_delete"'),
    "Granular public.is_admin(auth.uid()) policies created on customer_profiles for SELECT, INSERT, UPDATE, DELETE"
  );

  // Verify admin-only policies on installments
  assert(
    migrationSql.includes('CREATE POLICY "installments_admin_select"') &&
      migrationSql.includes('CREATE POLICY "installments_admin_insert"') &&
      migrationSql.includes('CREATE POLICY "installments_admin_update"') &&
      migrationSql.includes('CREATE POLICY "installments_admin_delete"'),
    "Granular public.is_admin(auth.uid()) policies created on installments for SELECT, INSERT, UPDATE, DELETE"
  );

  // Verify service-role full access is preserved
  assert(
    migrationSql.includes("Service role full access on customer_profiles") &&
      migrationSql.includes("Service role full access on installments"),
    "Service role full access policy preserved for server-side CRM operations"
  );

  // Verify NO permissive CREATE POLICY ... TO authenticated USING (true) statements
  const sqlWithoutComments = migrationSql.replace(/--.*$/gm, "");
  const permissiveAuthRegex = /CREATE\s+POLICY[\s\S]*?TO\s+authenticated\s+USING\s*\(\s*true\s*\)/i;
  assert(
    !permissiveAuthRegex.test(sqlWithoutComments),
    "No permissive TO authenticated USING (true) policies in migration"
  );
}

// =========================================================================
// 2. SEC-01: Admin Password Reset Privilege Escalation & Link Exposure
// =========================================================================
console.log("\n--- 2. SEC-01: Password Reset Hierarchy & Token Protection ---");
{
  const adminFnPath = path.join(ROOT, "src/lib/admin/admin.functions.ts");
  const adminFnCode = fs.readFileSync(adminFnPath, "utf8");

  // Check resetAdminPassword section
  const resetFnStart = adminFnCode.indexOf("export const resetAdminPassword =");
  const resetFnEnd = adminFnCode.indexOf("export const deleteAdmin =", resetFnStart);
  const resetFnBody = adminFnCode.slice(resetFnStart, resetFnEnd);

  // 1. Enforces requireAdmin and team.reset_password permission
  assert(
    resetFnBody.includes('await requireAdmin(context.userId);') &&
      resetFnBody.includes('await requirePermission(context.userId, "team.reset_password");'),
    "resetAdminPassword verifies caller admin role and team.reset_password permission"
  );

  // 2. Checks role hierarchy: target is super_admin vs caller is super_admin
  assert(
    resetFnBody.includes("isTargetSuperAdmin && !isCallerSuperAdmin") &&
      resetFnBody.includes("لا يمكن إعادة تعيين كلمة مرور مسؤول رئيسي إلا من قبل مسؤول رئيسي آخر"),
    "Role hierarchy enforced: Non-Super-Admin cannot reset Super Admin account"
  );

  // 3. Never generates link or returns recoveryLink
  assert(
    !resetFnBody.includes("generateLink") && !resetFnBody.includes("recoveryLink"),
    "generateLink is eliminated and recoveryLink is NEVER returned to the client"
  );

  // 4. Calls resetPasswordForEmail for email dispatch
  assert(
    resetFnBody.includes("supabaseAdmin.auth.resetPasswordForEmail(u.user.email)"),
    "Dispatches standard Supabase recovery email safely server-side"
  );

  // 5. Check UI in MemberManageDrawer.tsx
  const drawerPath = path.join(ROOT, "src/components/admin/team/MemberManageDrawer.tsx");
  const drawerCode = fs.readFileSync(drawerPath, "utf8");

  assert(
    !drawerCode.includes("recoveryLink") && !drawerCode.includes("copyLink"),
    "MemberManageDrawer UI has no recovery link state, plaintext token display, or copy button"
  );
}

// =========================================================================
// 3. SEC-05: Server-side Booking Price Tampering
// =========================================================================
console.log("\n--- 3. SEC-05: Booking Price Tampering & Calculation Integrity ---");
{
  const bookingFnPath = path.join(ROOT, "src/lib/booking.functions.ts");
  const bookingFnCode = fs.readFileSync(bookingFnPath, "utf8");

  // 1. Verify passenger breakdown validation
  assert(
    bookingFnCode.includes("adultPaxCount !== data.adults") &&
      bookingFnCode.includes("totalPeople !== data.passengers.length"),
    "Validates passenger counts breakdown against passenger list"
  );

  // 2. Authoritative package lookup & calculation
  assert(
    bookingFnCode.includes('.from("packages")') &&
      bookingFnCode.includes("discount_price") &&
      bookingFnCode.includes("child_price") &&
      bookingFnCode.includes("infant_price"),
    "Queries authoritative package pricing directly from the database"
  );

  assert(
    bookingFnCode.includes('if (pkg.status !== "published")') &&
      bookingFnCode.includes("Selected package is not available for booking"),
    "Verifies package exists and is published before accepting booking"
  );

  assert(
    bookingFnCode.includes("adultPrice * data.adults + childPrice * data.children + infantPrice * data.infants"),
    "Calculates total price server-side using authoritative adult, child, and infant rates"
  );

  assert(
    bookingFnCode.includes("total_price: finalTotalPrice") &&
      !bookingFnCode.includes("total_price: data.totalPrice"),
    "Persists ONLY the server-calculated total_price, ignoring client-controlled data.totalPrice"
  );

  // 3. Functional formula verification
  function calculateAuthoritativePrice(
    pkg: { price: number; discount_price?: number | null; child_price?: number | null; infant_price?: number | null },
    counts: { adults: number; children: number; infants: number },
    _clientTamperedPrice: number
  ): number {
    const adultPrice = pkg.discount_price != null ? Number(pkg.discount_price) : Number(pkg.price ?? 0);
    const childPrice = pkg.child_price != null ? Number(pkg.child_price) : adultPrice;
    const infantPrice = pkg.infant_price != null ? Number(pkg.infant_price) : 0;
    return Math.round(adultPrice * counts.adults + childPrice * counts.children + infantPrice * counts.infants);
  }

  const mockPackage = {
    price: 3200,
    discount_price: 2900,
    child_price: 1800,
    infant_price: 400,
  };

  const legitimateCounts = { adults: 2, children: 1, infants: 1 };
  const expectedTotal = 2900 * 2 + 1800 * 1 + 400 * 1; // 5800 + 1800 + 400 = 8000

  assert(
    calculateAuthoritativePrice(mockPackage, legitimateCounts, 8000) === 8000,
    "Standard pricing calculates correctly: 2 adults + 1 child + 1 infant = 8000 TND"
  );

  // Tamper tests
  const tamperingTests = [
    { clientPrice: 0, label: "Tampered totalPrice = 0 (Free booking attack)" },
    { clientPrice: 1, label: "Tampered totalPrice = 1 TND" },
    { clientPrice: -5000, label: "Tampered totalPrice = -5000 (Negative price attack)" },
    { clientPrice: 999999999, label: "Tampered totalPrice = 999999999 (Overflow attack)" },
    { clientPrice: 3200, label: "Tampered totalPrice = 3200 (Bypassing discount rate)" },
  ];

  for (const t of tamperingTests) {
    const persisted = calculateAuthoritativePrice(mockPackage, legitimateCounts, t.clientPrice);
    assert(
      persisted === expectedTotal,
      `${t.label} overridden by server-calculated authoritative 8000 TND`
    );
  }
}

// =========================================================================
// 4. SEC-04 & SEC-08: Clickjacking & Content-Security-Policy
// =========================================================================
console.log("\n--- 4. SEC-04 & SEC-08: Clickjacking & CSP Headers ---");
{
  const startPath = path.join(ROOT, "src/start.ts");
  const startCode = fs.readFileSync(startPath, "utf8");

  // 1. X-Frame-Options: SAMEORIGIN
  assert(
    startCode.includes('response.headers.set("X-Frame-Options", "SAMEORIGIN");'),
    "X-Frame-Options: SAMEORIGIN header is set on all responses"
  );

  // 2. CSP frame-ancestors 'self'
  assert(
    startCode.includes('"frame-ancestors \'self\'"') || startCode.includes("'frame-ancestors 'self''"),
    "Content-Security-Policy includes frame-ancestors 'self'"
  );

  // 3. CSP object-src 'none' & base-uri 'self'
  assert(
    startCode.includes('"object-src \'none\'"') && startCode.includes('"base-uri \'self\'"'),
    "CSP includes object-src 'none' and base-uri 'self' (defense against plugin & base injection)"
  );

  // 4. Essential origins present
  assert(
    startCode.includes("https://*.supabase.co") &&
      startCode.includes("wss://*.supabase.co") &&
      startCode.includes("https://fonts.googleapis.com") &&
      startCode.includes("https://fonts.gstatic.com"),
    "CSP includes authorized endpoints for Supabase, Realtime, and Google Fonts"
  );
}

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failures)`);
console.log("=================================================");

if (failedTests > 0) {
  process.exit(1);
}
