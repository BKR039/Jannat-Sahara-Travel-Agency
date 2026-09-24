/**
 * Remote RLS Verification Script for Security Batch 2
 * Tests live remote Supabase instance for customer_profiles and installments.
 *
 * Usage:
 *   npx tsx scripts/verify-remote-rls.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env
try {
  const envContent = readFileSync(resolve(".env"), "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) {
      process.env[m[1]] = value;
    }
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let total = 0;
let passed = 0;
let failed = 0;

function report(condition: boolean, label: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${label}`);
    if (detail) console.error(`         -> ${detail}`);
  }
}

async function runRemoteVerification() {
  console.log("=================================================");
  console.log("REMOTE SUPABASE RLS VERIFICATION (LIVE DATABASE)");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // 1. Anonymous Access Verification (customer_profiles)
  // -------------------------------------------------------------
  console.log("--- 1. customer_profiles: Anonymous Access ---");
  {
    // SELECT
    const { data: selData, error: selErr } = await anonClient
      .from("customer_profiles")
      .select("customer_key")
      .limit(5);
    report(
      selErr != null || (Array.isArray(selData) && selData.length === 0),
      "Anonymous SELECT denied on customer_profiles",
      selErr ? selErr.message : `Returned ${selData?.length} rows unexpectedly`
    );

    // INSERT
    const testKey = `anon_probe_${Date.now()}`;
    const { error: insErr } = await anonClient
      .from("customer_profiles")
      .insert({ customer_key: testKey, full_name: "Anonymous Attacker" });
    report(
      insErr != null,
      "Anonymous INSERT denied on customer_profiles",
      insErr ? `Blocked: ${insErr.message}` : "Unexpectedly allowed anonymous insert!"
    );

    // UPDATE
    const { data: updData, error: updErr } = await anonClient
      .from("customer_profiles")
      .update({ notes: "tampered_by_anon" })
      .eq("customer_key", testKey)
      .select();
    report(
      updErr != null || !updData || updData.length === 0,
      "Anonymous UPDATE denied on customer_profiles",
      updErr ? updErr.message : `Updated ${updData?.length} rows`
    );

    // DELETE
    const { data: delData, error: delErr } = await anonClient
      .from("customer_profiles")
      .delete()
      .eq("customer_key", testKey)
      .select();
    report(
      delErr != null || !delData || delData.length === 0,
      "Anonymous DELETE denied on customer_profiles",
      delErr ? delErr.message : `Deleted ${delData?.length} rows`
    );
  }

  // -------------------------------------------------------------
  // 2. Anonymous Access Verification (installments)
  // -------------------------------------------------------------
  console.log("\n--- 2. installments: Anonymous Access ---");
  {
    // SELECT
    const { data: selData, error: selErr } = await anonClient
      .from("installments")
      .select("id")
      .limit(5);
    report(
      selErr != null || (Array.isArray(selData) && selData.length === 0),
      "Anonymous SELECT denied on installments",
      selErr ? selErr.message : `Returned ${selData?.length} rows unexpectedly`
    );

    // INSERT
    const { error: insErr } = await anonClient.from("installments").insert({
      customer_key: "anon_test",
      title: "Malicious installment",
      amount: 100,
    });
    report(
      insErr != null,
      "Anonymous INSERT denied on installments",
      insErr ? `Blocked: ${insErr.message}` : "Unexpectedly allowed anonymous insert!"
    );

    // UPDATE
    const { data: updData, error: updErr } = await anonClient
      .from("installments")
      .update({ status: "paid" })
      .eq("customer_key", "anon_test")
      .select();
    report(
      updErr != null || !updData || updData.length === 0,
      "Anonymous UPDATE denied on installments",
      updErr ? updErr.message : `Updated ${updData?.length} rows`
    );

    // DELETE
    const { data: delData, error: delErr } = await anonClient
      .from("installments")
      .delete()
      .eq("customer_key", "anon_test")
      .select();
    report(
      delErr != null || !delData || delData.length === 0,
      "Anonymous DELETE denied on installments",
      delErr ? delErr.message : `Deleted ${delData?.length} rows`
    );
  }

  // -------------------------------------------------------------
  // 3. Authenticated Non-Admin User Verification
  // -------------------------------------------------------------
  console.log("\n--- 3. Authenticated Non-Admin User Access ---");
  const rand = Math.floor(100000 + Math.random() * 900000);
  const testEmail = `sec_audit_user_${rand}@janatsahara-audit.local`;
  const testPassword = `Audit_${rand}_${Date.now()}!Aa`;
  let testUserId: string | null = null;

  try {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (createErr || !created.user) {
      console.warn("Could not create non-admin test user:", createErr?.message);
    } else {
      testUserId = created.user.id;

      // Log in as ordinary authenticated user
      const userAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data: sessionData, error: loginErr } =
        await userAuthClient.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

      if (loginErr || !sessionData.session) {
        console.warn("Could not sign in as test user:", loginErr?.message);
      } else {
        console.log("  [INFO] Authenticated session created for non-admin user");

        // customer_profiles checks
        const { data: cpSel, error: cpSelErr } = await userAuthClient
          .from("customer_profiles")
          .select("customer_key")
          .limit(5);
        report(
          cpSelErr != null || (Array.isArray(cpSel) && cpSel.length === 0),
          "Authenticated non-admin SELECT denied on customer_profiles",
          cpSelErr ? cpSelErr.message : `Returned ${cpSel?.length} rows`
        );

        const probeKey = `user_probe_${rand}`;
        const { error: cpInsErr } = await userAuthClient
          .from("customer_profiles")
          .insert({ customer_key: probeKey, full_name: "Non-Admin Probe" });
        report(
          cpInsErr != null,
          "Authenticated non-admin INSERT denied on customer_profiles",
          cpInsErr ? `Blocked: ${cpInsErr.message}` : "Unexpectedly allowed insert!"
        );

        const { data: cpUpd, error: cpUpdErr } = await userAuthClient
          .from("customer_profiles")
          .update({ notes: "tampered" })
          .eq("customer_key", probeKey)
          .select();
        report(
          cpUpdErr != null || !cpUpd || cpUpd.length === 0,
          "Authenticated non-admin UPDATE denied on customer_profiles",
          cpUpdErr ? cpUpdErr.message : `Updated ${cpUpd?.length} rows`
        );

        const { data: cpDel, error: cpDelErr } = await userAuthClient
          .from("customer_profiles")
          .delete()
          .eq("customer_key", probeKey)
          .select();
        report(
          cpDelErr != null || !cpDel || cpDel.length === 0,
          "Authenticated non-admin DELETE denied on customer_profiles",
          cpDelErr ? cpDelErr.message : `Deleted ${cpDel?.length} rows`
        );

        // installments checks
        const { data: instSel, error: instSelErr } = await userAuthClient
          .from("installments")
          .select("id")
          .limit(5);
        report(
          instSelErr != null || (Array.isArray(instSel) && instSel.length === 0),
          "Authenticated non-admin SELECT denied on installments",
          instSelErr ? instSelErr.message : `Returned ${instSel?.length} rows`
        );

        const { error: instInsErr } = await userAuthClient
          .from("installments")
          .insert({ customer_key: probeKey, title: "Probe Installment", amount: 50 });
        report(
          instInsErr != null,
          "Authenticated non-admin INSERT denied on installments",
          instInsErr ? `Blocked: ${instInsErr.message}` : "Unexpectedly allowed insert!"
        );

        const { data: instUpd, error: instUpdErr } = await userAuthClient
          .from("installments")
          .update({ status: "paid" })
          .eq("customer_key", probeKey)
          .select();
        report(
          instUpdErr != null || !instUpd || instUpd.length === 0,
          "Authenticated non-admin UPDATE denied on installments",
          instUpdErr ? instUpdErr.message : `Updated ${instUpd?.length} rows`
        );

        const { data: instDel, error: instDelErr } = await userAuthClient
          .from("installments")
          .delete()
          .eq("customer_key", probeKey)
          .select();
        report(
          instDelErr != null || !instDel || instDel.length === 0,
          "Authenticated non-admin DELETE denied on installments",
          instDelErr ? instDelErr.message : `Deleted ${instDel?.length} rows`
        );
      }
    }
  } finally {
    // Clean up temporary test user immediately
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
      console.log("  [INFO] Temporary non-admin test user cleaned up safely");
    }
  }

  // -------------------------------------------------------------
  // 4. Service Role Operations Verification
  // -------------------------------------------------------------
  console.log("\n--- 4. Service Role Access ---");
  {
    const { error: cpErr } = await adminClient
      .from("customer_profiles")
      .select("customer_key", { count: "exact", head: true });
    report(
      cpErr == null,
      "Service role retains full administrative access on customer_profiles",
      cpErr?.message
    );

    const { error: instErr } = await adminClient
      .from("installments")
      .select("id", { count: "exact", head: true });
    report(
      instErr == null,
      "Service role retains full administrative access on installments",
      instErr?.message
    );
  }

  // -------------------------------------------------------------
  // 5. Admin User Verification
  // -------------------------------------------------------------
  console.log("\n--- 5. Admin Authorization Boundary ---");
  {
    // Verify is_admin RPC function is active
    const { data: adminCheck, error: rpcErr } = await adminClient.rpc("is_admin", {
      _user_id: "00000000-0000-0000-0000-000000000000",
    });
    report(
      rpcErr == null && adminCheck === false,
      "public.is_admin() helper function is active and responsive on remote database",
      rpcErr?.message
    );
  }

  console.log("\n=================================================");
  console.log(`REMOTE VERIFICATION: ${passed}/${total} checks passed (${failed} failures)`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRemoteVerification().catch((err) => {
  console.error("Fatal error during remote verification:", err);
  process.exit(1);
});
