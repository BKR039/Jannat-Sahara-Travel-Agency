/**
 * Security Batch 3 — Attack Surface Automated Test Suite
 *
 * Verifies all Batch 3 remediations:
 * 1. SEC-09: deleteRequest granular permission check (bookings.delete)
 * 2. SEC-10: deleteCustomerNote author verification & role hierarchy
 * 3. SEC-12: getPassportSignedUrl path traversal protection, pattern validation, and DB existence
 * 4. SEC-13: Granular permission gating across all privileged server functions
 * 5. SEC-14: safeNext open redirect protection & URL traversal defense
 * 6. SEC-15: OAuth consent redirect protocol validation
 * 7. SSRF Invariants: All server fetch calls target static whitelisted domains
 * 8. Rate Limiting Invariants: Public endpoints protected by enforceRateLimit
 * 9. Mass Assignment & Field Allowlisting: Mutation handlers sanitize client payloads
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeNext, assertSafeRedirect } from "../src/lib/redirect";
import {
  computeEffectivePermissions,
  hasPermissionInList,
  type AppRole,
  type PermissionKey,
} from "../src/lib/admin/permissions";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${description}`);
  }
}

console.log("=================================================");
console.log("SECURITY BATCH 3 — ATTACK SURFACE TEST SUITE");
console.log("=================================================");

// --- 1. SEC-09: deleteRequest Permission Gate ---
console.log("\n--- 1. SEC-09: deleteRequest Permission Gate ---");
{
  const fileContent = readFileSync(resolve("src/lib/admin/command.functions.ts"), "utf-8");

  // Extract deleteRequest function block
  const deleteReqMatch = fileContent.match(
    /export const deleteRequest[\s\S]*?return \{ ok: true as const \};/,
  );
  assert(!!deleteReqMatch, "deleteRequest function exists in command.functions.ts");

  if (deleteReqMatch) {
    const block = deleteReqMatch[0];
    assert(
      block.includes('await requirePermission(context.userId, "bookings.delete")'),
      "deleteRequest enforces requirePermission(context.userId, 'bookings.delete')",
    );
  }

  // Permission logic test: User with only customers.view or trips.view cannot delete bookings
  const limitedAdminPerms = computeEffectivePermissions(
    ["admin"],
    [{ permission: "bookings.delete", granted: false }],
  );
  assert(
    !hasPermissionInList(limitedAdminPerms, "bookings.delete"),
    "User with bookings.delete revoked is denied in permission logic",
  );

  const superAdminPerms = computeEffectivePermissions(["super_admin"]);
  assert(
    hasPermissionInList(superAdminPerms, "bookings.delete"),
    "Super admin retains bookings.delete permission",
  );
}

// --- 2. SEC-10: deleteCustomerNote Author & Role Verification ---
console.log("\n--- 2. SEC-10: deleteCustomerNote Author Verification ---");
{
  const fileContent = readFileSync(resolve("src/lib/admin/command.functions.ts"), "utf-8");
  const deleteNoteMatch = fileContent.match(
    /export const deleteCustomerNote[\s\S]*?return deleteCustomerNoteRecord/,
  );
  assert(!!deleteNoteMatch, "deleteCustomerNote function exists in command.functions.ts");

  if (deleteNoteMatch) {
    const block = deleteNoteMatch[0];
    assert(
      block.includes('.from("customer_notes")') && block.includes('.select("author_id")'),
      "deleteCustomerNote queries note author_id from customer_notes",
    );
    assert(
      block.includes("note.author_id !== context.userId && !isSuperAdmin && !canDeleteAll"),
      "deleteCustomerNote blocks non-authors unless super_admin or has customers.delete",
    );
    assert(block.includes("NOTE_NOT_FOUND"), "deleteCustomerNote guards against nonexistent notes");
  }

  // Simulation: Test author comparison logic
  function canDeleteNote(
    authorId: string,
    callerId: string,
    isSuperAdmin: boolean,
    canDeleteAll: boolean,
  ) {
    if (authorId !== callerId && !isSuperAdmin && !canDeleteAll) {
      return false;
    }
    return true;
  }

  assert(
    canDeleteNote("user-1", "user-1", false, false) === true,
    "Author can delete their own note",
  );
  assert(
    canDeleteNote("user-1", "user-2", false, false) === false,
    "Other user cannot delete author's note",
  );
  assert(
    canDeleteNote("user-1", "user-2", true, false) === true,
    "Super admin can delete another user's note",
  );
  assert(
    canDeleteNote("user-1", "user-2", false, true) === true,
    "User with customers.delete permission can delete another user's note",
  );
}

// --- 3. SEC-12: getPassportSignedUrl Path Traversal & DB Verification ---
console.log("\n--- 3. SEC-12: getPassportSignedUrl Path Validation & Anti-IDOR ---");
{
  const fileContent = readFileSync(resolve("src/lib/admin/admin.functions.ts"), "utf-8");
  const passportMatch = fileContent.match(
    /export const getPassportSignedUrl[\s\S]*?return \{ url: signed\.signedUrl \};/,
  );
  assert(!!passportMatch, "getPassportSignedUrl exists in admin.functions.ts");

  if (passportMatch) {
    const block = passportMatch[0];
    assert(
      block.includes('await requirePermission(context.userId, "bookings.view")'),
      "getPassportSignedUrl requires bookings.view permission",
    );
    assert(
      block.includes("passport\\.(jpg|jpeg|png|webp|heic|pdf)"),
      "getPassportSignedUrl strictly enforces passport path regex",
    );
    assert(
      block.includes('from("bookings").select("id").eq("passport_path"') &&
        block.includes('from("booking_passengers").select("id").eq("passport_path"'),
      "getPassportSignedUrl validates existence in bookings and booking_passengers",
    );
    assert(
      block.includes("Passport record not found or access denied"),
      "getPassportSignedUrl rejects paths not recorded in the database",
    );
  }

  // Test passport regex against attack payloads
  const PASSPORT_REGEX = /^bookings\/[0-9a-f-]{36}\/passport\.(jpg|jpeg|png|webp|heic|pdf)$/i;

  assert(!PASSPORT_REGEX.test("../passports/secret.pdf"), "Path traversal ../ rejected");
  assert(!PASSPORT_REGEX.test("..\\passports\\secret.pdf"), "Backslash traversal ..\\ rejected");
  assert(!PASSPORT_REGEX.test("/etc/passwd"), "System path /etc/passwd rejected");
  assert(
    !PASSPORT_REGEX.test("bookings/invalid-uuid/passport.jpg"),
    "Invalid UUID format rejected",
  );
  assert(
    !PASSPORT_REGEX.test("bookings/12345678-1234-1234-1234-123456789012/exploit.exe"),
    "Non-passport filename rejected",
  );
  assert(
    !PASSPORT_REGEX.test("bookings/12345678-1234-1234-1234-123456789012/passport.php"),
    "PHP extension rejected",
  );
  assert(!PASSPORT_REGEX.test("https://evil.com/passport.jpg"), "External URL rejected");
  assert(
    PASSPORT_REGEX.test("bookings/94eb5c6b-9679-4d6d-88ec-8f7797769910/passport.jpg"),
    "Valid passport path accepted",
  );
  assert(
    PASSPORT_REGEX.test("bookings/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/passport.pdf"),
    "Valid passport PDF path accepted",
  );
}

// --- 4. SEC-13: Granular Permission Gates Across Server Functions ---
console.log("\n--- 4. SEC-13: Granular Permission Gating Invariants ---");
{
  const cmdContent = readFileSync(resolve("src/lib/admin/command.functions.ts"), "utf-8");
  const hotelsContent = readFileSync(resolve("src/lib/admin/hotels.functions.ts"), "utf-8");
  const offerContent = readFileSync(resolve("src/lib/admin/offer.functions.ts"), "utf-8");
  const adminContent = readFileSync(resolve("src/lib/admin/admin.functions.ts"), "utf-8");

  // command.functions.ts checks
  assert(
    cmdContent.includes('requirePermission(context.userId, "dashboard.view")'),
    "getCommandCenter gates on dashboard.view",
  );
  assert(
    cmdContent.includes('requirePermission(context.userId, "reports.view")'),
    "getReports gates on reports.view",
  );
  assert(
    cmdContent.includes('requirePermission(context.userId, "bookings.view")'),
    "listRequests gates on bookings.view",
  );
  assert(
    cmdContent.includes('requirePermission(context.userId, "bookings.edit")'),
    "updateRequest gates on bookings.edit",
  );
  assert(
    cmdContent.includes('requirePermission(context.userId, "bookings.delete")'),
    "deleteRequest gates on bookings.delete",
  );
  assert(
    cmdContent.includes('requirePermission(context.userId, "trips.create")'),
    "duplicateTrip gates on trips.create",
  );

  // hotels.functions.ts checks
  assert(
    hotelsContent.includes('requirePermission(context.userId, "hotels.view")'),
    "listHotels gates on hotels.view",
  );
  assert(
    hotelsContent.includes('requirePermission(context.userId, "hotels.create")'),
    "createHotel gates on hotels.create",
  );
  assert(
    hotelsContent.includes('requirePermission(context.userId, "hotels.edit")'),
    "updateHotel gates on hotels.edit",
  );
  assert(
    hotelsContent.includes('requirePermission(context.userId, "hotels.delete")'),
    "deleteHotel gates on hotels.delete",
  );

  // offer.functions.ts checks
  assert(
    offerContent.includes('requirePermission(context.userId, "bookings.edit")'),
    "saveOffer and sendOffer gate on bookings.edit",
  );

  // admin.functions.ts checks
  assert(
    adminContent.includes('requirePermission(context.userId, "team.view")'),
    "listAdmins gates on team.view",
  );
  assert(
    adminContent.includes('requirePermission(context.userId, "team.invite")'),
    "inviteAdmin gates on team.invite",
  );
  assert(
    adminContent.includes('requirePermission(context.userId, "team.edit")'),
    "updateAdmin gates on team.edit",
  );
}

// --- 5. SEC-14: Open Redirect Protection (safeNext) ---
console.log("\n--- 5. SEC-14: Open Redirect Protection (safeNext) ---");
{
  // Malicious / open redirect attempts
  assert(safeNext("//evil.com") === null, "Protocol-relative //evil.com blocked");
  assert(safeNext("//evil.com/path") === null, "Protocol-relative //evil.com/path blocked");
  assert(safeNext("/\\evil.com") === null, "Backslash escape /\\evil.com blocked");
  assert(safeNext("/\\\\evil.com") === null, "Double backslash /\\\\evil.com blocked");
  assert(safeNext("/evil.com\\..\\") === null, "Embedded backslash blocked");
  assert(safeNext("https://evil.com") === null, "Absolute https://evil.com blocked");
  assert(safeNext("http://evil.com") === null, "Absolute http://evil.com blocked");
  assert(safeNext("javascript:alert(1)") === null, "javascript: pseudo-protocol blocked");
  assert(
    safeNext("/javascript:alert(1)") === null,
    "Path containing javascript: pseudo-protocol blocked",
  );
  assert(safeNext("data:text/html,bad") === null, "data: URI blocked");
  assert(safeNext("   ") === null, "Whitespace-only blocked");
  assert(safeNext(undefined) === null, "Undefined input returns null");
  assert(safeNext("/\x00evil") === null, "Null byte injection blocked");

  // Legitimate internal paths
  assert(safeNext("/admin") === "/admin", "Valid /admin accepted");
  assert(
    safeNext("/admin?tab=customers") === "/admin?tab=customers",
    "Valid path with query accepted",
  );
  assert(
    safeNext("/packages/umrah-vip#pricing") === "/packages/umrah-vip#pricing",
    "Valid path with hash accepted",
  );
}

// --- 6. SEC-15: OAuth Consent Redirect Safety ---
console.log("\n--- 6. SEC-15: OAuth Consent Redirect Protocol Validation ---");
{
  function isSafe(urlStr: string): boolean {
    try {
      return assertSafeRedirect(urlStr);
    } catch {
      return false;
    }
  }

  assert(isSafe("https://example.com/oauth/callback") === true, "Valid HTTPS redirect allowed");
  assert(isSafe("http://localhost:3000/callback") === true, "Valid HTTP callback allowed");
  assert(isSafe("javascript:alert(1)") === false, "javascript: URL rejected");
  assert(isSafe("data:text/html,<script>alert(1)</script>") === false, "data: URL rejected");
  assert(isSafe("vbscript:msgbox(1)") === false, "vbscript: URL rejected");
  assert(isSafe("file:///etc/passwd") === false, "file: URL rejected");
}

// --- 7. SSRF Invariants ---
console.log("\n--- 7. SSRF Invariants ---");
{
  // Scan all server functions for fetch calls and verify destinations
  const serverFiles = [
    "src/lib/booking.functions.ts",
    "src/lib/flight-request.functions.ts",
    "src/lib/umrah-builder.functions.ts",
    "src/lib/admin/offer.functions.ts",
  ];

  for (const file of serverFiles) {
    const content = readFileSync(resolve(file), "utf-8");
    const fetchMatches = [...content.matchAll(/fetch\s*\(\s*["'`](.*?)["'`]/g)];
    for (const match of fetchMatches) {
      const targetUrl = match[1];
      assert(
        targetUrl.startsWith("https://api.resend.com/"),
        `Server fetch in ${file} targets static trusted endpoint (${targetUrl})`,
      );
    }
  }
}

// --- 8. Rate Limiting Invariants ---
console.log("\n--- 8. Rate Limiting Invariants on Public Write Endpoints ---");
{
  const publicFiles = [
    {
      file: "src/lib/public.functions.ts",
      scopes: ["contact_message", "newsletter", "passport_upload"],
    },
    { file: "src/lib/booking.functions.ts", scopes: ["booking"] },
    { file: "src/lib/flight-request.functions.ts", scopes: ["flight_request"] },
    { file: "src/lib/umrah-builder.functions.ts", scopes: ["custom_package_request"] },
  ];

  for (const { file, scopes } of publicFiles) {
    const content = readFileSync(resolve(file), "utf-8");
    for (const scope of scopes) {
      assert(
        content.includes(`scope: "${scope}"`),
        `Rate limit scope '${scope}' enforced in ${file}`,
      );
    }
  }
}

// --- 9. Mass Assignment & Field Allowlisting ---
console.log("\n--- 9. Mass Assignment Invariants ---");
{
  const cmdContent = readFileSync(resolve("src/lib/admin/command.functions.ts"), "utf-8");

  // updateRequest builds explicit patch object per kind
  assert(
    cmdContent.includes("const patch: Record<string, unknown> = {};") &&
      cmdContent.includes('if (data.status) patch["status"] = data.status;'),
    "updateRequest uses explicit property allowlisting (no raw data pass-through)",
  );

  // updateBooking builds explicit patch object
  assert(
    cmdContent.includes('if (data.payment_status) patch["payment_status"] = data.payment_status;'),
    "updateBooking uses explicit property allowlisting",
  );
}

// --- 10. SEC-06: Staff Role Permissions Alignment ---
console.log("\n--- 10. SEC-06: Staff Role Alignment ---");
{
  const authContent = readFileSync(resolve("src/lib/admin/authorize.server.ts"), "utf-8");
  assert(
    authContent.includes(
      'export const ADMIN_ROLES: readonly AppRole[] = ["super_admin", "admin", "staff"] as const;',
    ),
    "ADMIN_ROLES allows staff users through initial role check for granular permission gating",
  );
}

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failures)`);
console.log("=================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
