/**
 * JANNAT SAHRA — UNIFIED ARCHIVE SYSTEM TEST SUITE
 *
 * Verifies:
 * 1. Active record exclusion from operational CRM queries.
 * 2. Inclusion of archived records in archive queries and summary counts.
 * 3. Complete lifecycle: ACTIVE -> ARCHIVED -> RESTORED -> ARCHIVED -> PERMANENTLY DELETED.
 * 4. Dependency protection: prevents permanent delete when bookings/installments/financial history exist.
 * 5. Permanent deletion when no dependencies exist.
 * 6. Audit logging in audit_logs for archive, restore, and permanent_delete.
 * 7. Permission model enforcement for archive operations.
 * 8. Automatic cleanup of all test records (leaving DB pristine).
 */

import { supabaseAdmin } from "../src/integrations/supabase/client.server";
import {
  getArchiveSummaryCounts,
  listArchivedRecords,
  checkEntityDependencies,
  archiveEntity,
  restoreEntity,
  permanentlyDeleteEntity,
} from "../src/lib/admin/archive.server";
import { loadCustomers, loadRequests } from "../src/lib/admin/crm.server";
import {
  computeEffectivePermissions,
  hasPermissionInList,
} from "../src/lib/admin/permissions";

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

async function run() {
  console.log("==================================================");
  console.log("JANNAT SAHRA — UNIFIED ARCHIVE SYSTEM TESTS");
  console.log("==================================================\n");

  const testKey = `test-arch-cust-${Date.now()}`;
  const testPhone = `+21699${Math.floor(100000 + Math.random() * 900000)}`;
  const testEmail = `test.arch.${Date.now()}@test-agency.tn`;
  let testPackageId: string | null = null;
  let testBookingId: string | null = null;

  try {
    // --- TEST 1: Permission Model Validation ---
    console.log("--- TEST 1: Archive Permission Model ---");
    const { data: authUserData } = await supabaseAdmin.auth.admin.listUsers();
    const testActorId = authUserData?.users?.[0]?.id ?? null;
    const testActorEmail = authUserData?.users?.[0]?.email ?? "admin@jannatsahara.tn";

    const superAdminPerms = computeEffectivePermissions(["super_admin"]);
    const adminPerms = computeEffectivePermissions(["admin"]);
    const staffPerms = computeEffectivePermissions(["staff"]);

    assert(hasPermissionInList(superAdminPerms, "archive.view"), "Super admin has archive.view");
    assert(hasPermissionInList(superAdminPerms, "archive.restore"), "Super admin has archive.restore");
    assert(hasPermissionInList(superAdminPerms, "archive.delete"), "Super admin has archive.delete");

    assert(hasPermissionInList(adminPerms, "archive.view"), "Admin role has archive.view");
    assert(hasPermissionInList(adminPerms, "archive.restore"), "Admin role has archive.restore");
    assert(hasPermissionInList(adminPerms, "archive.delete"), "Admin role has archive.delete");

    assert(!hasPermissionInList(staffPerms, "archive.delete"), "Staff role DOES NOT have archive.delete");

    // --- TEST 2: Create Active Records ---
    console.log("\n--- TEST 2: Create Active Operational Test Records ---");
    // 1. Create a customer profile
    const { error: profErr } = await supabaseAdmin.from("customer_profiles").insert({
      customer_key: testKey,
      full_name: "عميل تجريبي للاختبار",
      phone: testPhone,
      email: testEmail,
      city: "تونس العاصمة",
    });
    assert(!profErr, "Test customer profile created");

    // 2. Create a test package (trip)
    const { data: pkgData, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .insert({
        title: "رحلة تجريبية للأرشفة",
        slug: `test-trip-archive-${Date.now()}`,
        category: "trip",
        destination: "الجنوب التونسي",
        price: 450,
        status: "draft",
      })
      .select("id")
      .single();
    assert(!pkgErr && !!pkgData?.id, "Test trip package created");
    testPackageId = pkgData?.id ?? null;

    // Verify both appear in active listings
    const activeCustomersBefore = await loadCustomers();
    const foundActiveCust = activeCustomersBefore.some((c) => c.key === testKey);
    assert(foundActiveCust, "Active customer appears in active customer list");

    // --- TEST 3: Archive Operations ---
    console.log("\n--- TEST 3: Archiving Client & Trip ---");
    const baselineCounts = await getArchiveSummaryCounts();

    // Archive Customer
    const archCustRes = await archiveEntity({
      entityType: "client",
      subType: "customer_profile",
      id: testKey,
      reason: "اختبار نظام الأرشفة الآلي",
      actorId: testActorId,
      actorEmail: "admin@jannatsahara.tn",
      actorName: "مسؤول الاختبار",
    });
    assert(archCustRes.ok, "Customer archived successfully");

    // Archive Trip
    if (testPackageId) {
      const archTripRes = await archiveEntity({
        entityType: "trip",
        subType: "package",
        id: testPackageId,
        reason: "اختبار أرشفة رحلة",
        actorId: testActorId,
        actorEmail: "admin@jannatsahara.tn",
        actorName: "مسؤول الاختبار",
      });
      assert(archTripRes.ok, "Trip archived successfully");
    }

    // --- TEST 4: Exclusion from Active Lists ---
    console.log("\n--- TEST 4: Exclusion from Active Lists & Inclusion in Archive ---");
    const activeCustomersAfter = await loadCustomers();
    const custStillInActive = activeCustomersAfter.some((c) => c.key === testKey);
    assert(!custStillInActive, "Archived customer is strictly EXCLUDED from active operational list");

    const newCounts = await getArchiveSummaryCounts();
    assert(newCounts.clients === baselineCounts.clients + 1, "Archive clients count increased by exactly 1");
    if (testPackageId) {
      assert(newCounts.trips === baselineCounts.trips + 1, "Archive trips count increased by exactly 1");
    }

    const archiveList = await listArchivedRecords({ entityType: "all", search: testKey });
    assert(
      archiveList.records.some((r) => r.identifier === testKey),
      "Archived customer is INCLUDED in Archive search list",
    );

    // --- TEST 5: Restore Operation ---
    console.log("\n--- TEST 5: Restore Operation ---");
    const restoreCustRes = await restoreEntity({
      entityType: "client",
      subType: "customer_profile",
      id: testKey,
      actorId: testActorId,
      actorEmail: "admin@jannatsahara.tn",
    });
    assert(restoreCustRes.ok, "Customer restored successfully");

    const activeCustomersRestored = await loadCustomers();
    const custRestoredInActive = activeCustomersRestored.some((c) => c.key === testKey);
    assert(custRestoredInActive, "Restored customer is back in active operational list");

    // --- TEST 6: Dependency Protection on Permanent Delete ---
    console.log("\n--- TEST 6: Dependency Protection on Permanent Delete ---");
    // Re-archive the customer
    await archiveEntity({
      entityType: "client",
      subType: "customer_profile",
      id: testKey,
      reason: "إعادة الأرشفة لفحص الارتباطات",
      actorId: testActorId,
      actorEmail: "admin@jannatsahara.tn",
    });

    // Create a dependent booking and installment for this customer
    const { data: bData } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "عميل تجريبي للاختبار",
        phone: testPhone,
        email: testEmail,
        package_id: testPackageId,
        package_title: "رحلة تجريبية للأرشفة",
        total_price: 1200,
        paid_amount: 500,
        payment_status: "partially_paid",
        status: "confirmed",
      })
      .select("id")
      .single();
    testBookingId = bData?.id ?? null;

    const { error: instErr } = await supabaseAdmin.from("installments").insert({
      customer_key: testKey,
      booking_id: testBookingId,
      installment_number: 1,
      title: "دفعة أولى",
      amount: 500,
      currency: "TND",
      status: "paid",
    });
    assert(!instErr, "Dependent installment created for customer");

    // Now test dependency check on Client
    const clientVerdict = await checkEntityDependencies({
      entityType: "client",
      subType: "customer_profile",
      id: testKey,
    });
    assert(!clientVerdict.canDelete, "Dependency check SAFELY BLOCKS customer permanent deletion");
    assert(
      (clientVerdict.reason ?? "").includes("حجز") || (clientVerdict.reason ?? "").includes("قسط"),
      "Dependency verdict includes clear explanation of existing records",
    );

    // Verify calling permanentlyDeleteEntity throws error
    let threwOnClient = false;
    try {
      await permanentlyDeleteEntity({
        entityType: "client",
        subType: "customer_profile",
        id: testKey,
        actorId: testActorId,
        actorEmail: "admin@jannatsahara.tn",
      });
    } catch (e: any) {
      threwOnClient = true;
      assert(true, `permanentlyDeleteEntity threw expected error: ${e.message.slice(0, 60)}...`);
    }
    assert(threwOnClient, "Permanent delete with dependencies was blocked server-side");

    // Also test dependency check on Trip (package with active booking)
    if (testPackageId) {
      const tripVerdict = await checkEntityDependencies({
        entityType: "trip",
        subType: "package",
        id: testPackageId,
      });
      assert(!tripVerdict.canDelete, "Trip dependency check SAFELY BLOCKS trip deletion because booking exists");
    }

    // --- TEST 7: Permanent Deletion Without Dependencies ---
    console.log("\n--- TEST 7: Permanent Deletion Without Dependencies ---");
    // Clean up dependent booking and installment first
    if (testBookingId) {
      await supabaseAdmin.from("installments").delete().eq("booking_id", testBookingId);
      await supabaseAdmin.from("bookings").delete().eq("id", testBookingId);
    }

    // Now check client dependencies again
    const cleanClientVerdict = await checkEntityDependencies({
      entityType: "client",
      subType: "customer_profile",
      id: testKey,
    });
    assert(cleanClientVerdict.canDelete, "Client dependency check allows deletion once dependencies are resolved");

    const deleteClientRes = await permanentlyDeleteEntity({
      entityType: "client",
      subType: "customer_profile",
      id: testKey,
      actorId: testActorId,
      actorEmail: "admin@jannatsahara.tn",
    });
    assert(deleteClientRes.ok, "Client permanently deleted successfully");

    // Delete trip without dependencies
    if (testPackageId) {
      const deleteTripRes = await permanentlyDeleteEntity({
        entityType: "trip",
        subType: "package",
        id: testPackageId,
        actorId: testActorId,
        actorEmail: "admin@jannatsahara.tn",
      });
      assert(deleteTripRes.ok, "Trip permanently deleted successfully");
      testPackageId = null;
    }

    // --- TEST 8: Audit Logging Verification ---
    console.log("\n--- TEST 8: Audit Logs Verification ---");
    const { data: auditRows } = await supabaseAdmin
      .from("audit_logs")
      .select("action, entity, entity_id")
      .or(`entity_id.eq.${testKey}`)
      .order("created_at", { ascending: false });

    const loggedActions = (auditRows ?? []).map((a) => a.action);
    assert(loggedActions.includes("archive"), "Audit log recorded 'archive' event");
    assert(loggedActions.includes("restore"), "Audit log recorded 'restore' event");
    assert(loggedActions.includes("permanent_delete"), "Audit log recorded 'permanent_delete' event");
  } finally {
    // --- CLEANUP: Clean up all test artifacts ---
    console.log("\n--- CLEANUP: Ensuring database is pristine ---");
    if (testBookingId) {
      await supabaseAdmin.from("installments").delete().eq("booking_id", testBookingId);
      await supabaseAdmin.from("booking_passengers").delete().eq("booking_id", testBookingId);
      await supabaseAdmin.from("bookings").delete().eq("id", testBookingId);
    }
    await supabaseAdmin.from("customer_profiles").delete().eq("customer_key", testKey);
    if (testPackageId) {
      await supabaseAdmin.from("packages").delete().eq("id", testPackageId);
    }
    // Clean up audit logs created for testKey
    await supabaseAdmin.from("audit_logs").delete().eq("entity_id", testKey);
    console.log("Cleanup complete.\n");
  }

  console.log("==================================================");
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} ARCHIVE SYSTEM TESTS PASSED!`);
  } else {
    console.error(`❌ ${failed} TESTS FAILED (${passed} passed)`);
    process.exit(1);
  }
  console.log("==================================================");
}

run().catch((e) => {
  console.error("FATAL TEST ERROR:", e);
  process.exit(1);
});
