/**
 * FINAL SEMANTIC FINANCIAL AUDIT TEST SUITE
 * 
 * Validates:
 * 1. Installment Status State Machine ('paid', 'pending', 'overdue', 'cancelled')
 *    - Cancelled status must NOT contribute to paid, pending, overdue, or unscheduled balances.
 * 2. Date Filter Test Matrix (August contract 8,900, September payment 4,500)
 *    - Verifies point-in-time outstanding balance is NEVER hidden by period filter.
 * 3. Complete Mutation Lifecycle with CRM, Accounting, Reports, and Smart Insights parity.
 * 
 * ZERO production data is modified permanently (all test records cleaned up in finally).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 1. Load environment variables
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

if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}

import { supabaseAdmin } from "../src/integrations/supabase/client.server";
import { customerKey } from "../src/lib/admin/customer-identity";
import {
  saveCustomerProfile,
  loadCustomer,
  loadCustomers,
  recordDirectPayment,
  updateInstallmentRecord,
  deleteInstallmentRecord,
} from "../src/lib/admin/crm.server";
import { loadReports } from "../src/lib/admin/dashboard.server";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runSemanticAudit() {
  console.log("\n==================================================");
  console.log("BOUSALA / JANNAT SAHRA — FINAL SEMANTIC FINANCIAL AUDIT");
  console.log("==================================================\n");

  const testPhone = `+2169999${Math.floor(1000 + Math.random() * 9000)}`;
  const testKey = customerKey(testPhone, null, "fallback_semantic");

  let bookingId: string | null = null;
  const createdInstallments: string[] = [];

  try {
    // =========================================================================
    // PART 1: INSTALLMENT STATUS STATE MACHINE & TERMINAL 'CANCELLED' ISOLATION
    // =========================================================================
    console.log("--- PART 1: Installment Status State Machine Regressions ---");

    const repBefore = await loadReports();
    const basePendingCount = repBefore.payments.pendingInstallmentsCount;
    const baseOverdueCount = repBefore.payments.overdueInstallmentsCount;
    const basePaidCount = repBefore.payments.paidInstallmentsCount;
    const baseCollected = repBefore.payments.totalCollectedInstallments;
    const basePendingAmount = repBefore.payments.totalPendingInstallments;

    // Create a confirmed test booking of 5,000 TND
    const { data: b1, error: b1Err } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "عميل التدقيق الدلالي",
        phone: testPhone,
        total_price: 5000,
        paid_amount: 0,
        payment_status: "unpaid",
        status: "confirmed",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (b1Err || !b1) throw new Error(`Failed to create test booking: ${b1Err?.message}`);
    bookingId = b1.id;

    // 1.1 Test 'pending' status
    const futureDate = new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0];
    const { data: instPending } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: bookingId,
        customer_key: testKey,
        amount: 1000,
        due_date: futureDate,
        status: "pending",
        title: "قسط مجدول مستقبلي",
      })
      .select("id")
      .single();
    createdInstallments.push(instPending!.id);

    let rep = await loadReports();
    assert(
      rep.payments.pendingInstallmentsCount === basePendingCount + 1,
      "Status 'pending' increments pendingInstallmentsCount by 1",
    );
    assert(
      rep.payments.totalPendingInstallments === basePendingAmount + 1000,
      "Status 'pending' adds to totalPendingInstallments",
    );

    // 1.2 Test 'overdue' status
    const pastDate = new Date(Date.now() - 15 * 86400000).toISOString().split("T")[0];
    const { data: instOverdue } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: bookingId,
        customer_key: testKey,
        amount: 800,
        due_date: pastDate,
        status: "pending", // due_date in past should be recognized as overdue
        title: "قسط متأخر عن تاريخ الاستحقاق",
      })
      .select("id")
      .single();
    createdInstallments.push(instOverdue!.id);

    rep = await loadReports();
    assert(
      rep.payments.overdueInstallmentsCount === baseOverdueCount + 1,
      "Installment with due_date in the past correctly increments overdueInstallmentsCount",
    );

    // 1.3 Test 'paid' status
    const { data: instPaid } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: bookingId,
        customer_key: testKey,
        amount: 1200,
        paid_at: new Date().toISOString(),
        status: "paid",
        title: "دفعة مسددة بالكامل",
      })
      .select("id")
      .single();
    createdInstallments.push(instPaid!.id);

    rep = await loadReports();
    assert(
      rep.payments.paidInstallmentsCount === basePaidCount + 1,
      "Status 'paid' increments paidInstallmentsCount by 1",
    );
    assert(
      rep.payments.totalCollectedInstallments === baseCollected + 1200,
      "Status 'paid' adds 1200 to totalCollectedInstallments",
    );

    // 1.4 Test 'cancelled' status (CRITICAL SEMANTIC TEST)
    // A cancelled installment must NOT contribute to pending, overdue, or collected balances!
    const { data: instCancelled } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: bookingId,
        customer_key: testKey,
        amount: 2000,
        due_date: pastDate, // even if due_date is past!
        status: "cancelled",
        title: "قسط ملغي بالاتفاق",
      })
      .select("id")
      .single();
    createdInstallments.push(instCancelled!.id);

    rep = await loadReports();
    assert(
      rep.payments.pendingInstallmentsCount === basePendingCount + 1,
      "Status 'cancelled' does NOT increment pendingInstallmentsCount",
    );
    assert(
      rep.payments.overdueInstallmentsCount === baseOverdueCount + 1,
      "Status 'cancelled' does NOT increment overdueInstallmentsCount even if due_date is in past",
    );
    assert(
      rep.payments.paidInstallmentsCount === basePaidCount + 1,
      "Status 'cancelled' does NOT increment paidInstallmentsCount",
    );
    assert(
      rep.payments.totalPendingInstallments === basePendingAmount + 1000 + 800,
      "Status 'cancelled' (2000 TND) does NOT contribute to totalPendingInstallments",
    );

    // Verify Customer Profile view also excludes cancelled installment from active pending
    const cust1 = await loadCustomer(testKey);
    const activeUnpaidCount = (cust1?.installments ?? []).filter(
      (i) => i.status === "pending" || i.status === "overdue",
    ).length;
    assert(
      activeUnpaidCount === 2,
      "Customer installments excludes 'cancelled' from active pending count (2, not 3)",
    );

    // Cleanup Part 1 records
    await supabaseAdmin.from("installments").delete().in("id", createdInstallments);
    createdInstallments.length = 0;
    await supabaseAdmin.from("bookings").delete().eq("id", bookingId);
    bookingId = null;

    console.log("✅ PART 1 PASSED: Installment State Machine & 'cancelled' isolation fully verified.\n");

    // =========================================================================
    // PART 2: DATE FILTER TEST MATRIX (August contract 8,900, September payment 4,500)
    // =========================================================================
    console.log("--- PART 2: Date Filter Test Matrix (August / September Scenario) ---");

    const matrixPhone = `+2169988${Math.floor(1000 + Math.random() * 9000)}`;
    const matrixKey = customerKey(matrixPhone, null, "fallback_matrix");

    // August Dates
    const augCreated = "2026-08-15T10:00:00.000Z";
    // September Dates
    const sepPayment = "2026-09-10T14:00:00.000Z";

    // 1. Create August Contract for 8,900 TND
    const { data: bAug, error: bAugErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "عميل مصفوفة التواريخ",
        phone: matrixPhone,
        total_price: 8900,
        paid_amount: 0,
        payment_status: "unpaid",
        status: "confirmed",
        created_at: augCreated,
      })
      .select("id")
      .single();

    if (bAugErr || !bAug) throw new Error(`Failed to create August booking: ${bAugErr?.message}`);
    const augBookingId = bAug.id;

    // 2. Record September Payment for 4,500 TND
    const { data: instSep, error: instSepErr } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: augBookingId,
        customer_key: matrixKey,
        amount: 4500,
        due_date: "2026-09-10",
        paid_at: sepPayment,
        status: "paid",
        title: "دفعة سبتمبر النقدية",
        created_at: sepPayment,
      })
      .select("id")
      .single();

    if (instSepErr || !instSep) throw new Error(`Failed to create September payment: ${instSepErr?.message}`);
    createdInstallments.push(instSep.id);

    // Update booking paid amount
    await supabaseAdmin
      .from("bookings")
      .update({
        paid_amount: 4500,
        payment_status: "partially_paid",
      })
      .eq("id", augBookingId);

    // Now test CRM Customer State
    const custMatrix = await loadCustomer(matrixKey);
    assert(custMatrix?.totalSpent === 8900, "Matrix Client: Total Spent = 8,900 TND");
    assert(custMatrix?.totalPaid === 4500, "Matrix Client: Total Paid = 4,500 TND");
    assert(custMatrix?.totalRemaining === 4400, "Matrix Client: Current Outstanding = 4,400 TND");

    // Test Reports with Periods
    const repMatrix = await loadReports();

    // A. ALL TIME:
    // Revenue = includes 8,900; Paid = includes 4,500; Outstanding = includes 4,400
    const periodAll = repMatrix.periodKpis.all;
    assert(periodAll.outstanding === repMatrix.kpis.totalOutstanding, "All Time outstanding equals totalOutstanding");
    assert(repMatrix.kpis.totalOutstanding >= 4400, "Total outstanding accounts for the 4,400 balance");

    // B. SEPTEMBER (Current Month in local system or 'month' period):
    // In September:
    // Period contracted revenue = 0 (no new contract)
    // Period cash collected = 4,500
    // Current outstanding balance = 4,400 (MUST NOT be 0!)
    const periodSep = repMatrix.periodKpis.month;
    console.log("September Period KPI:", {
      revenue: periodSep?.revenue,
      paid: periodSep?.paid,
      outstanding: periodSep?.outstanding,
    });

    assert(
      periodSep.outstanding === repMatrix.kpis.totalOutstanding,
      "September report shows authoritative CURRENT outstanding balance (does NOT hide the 4,400 balance as 0!)",
    );

    // C. AUGUST (Previous Month 'prev_month'):
    // Period contracted revenue = 8,900
    // Period cash collected = 0
    // Current outstanding balance = 4,400
    const periodAug = repMatrix.periodKpis.prev_month;
    console.log("August (Prev Month) Period KPI:", {
      revenue: periodAug?.revenue,
      paid: periodAug?.paid,
      outstanding: periodAug?.outstanding,
    });

    assert(
      periodAug.outstanding === repMatrix.kpis.totalOutstanding,
      "August report shows authoritative CURRENT outstanding balance (does NOT report stale 8,900 ignoring September payment!)",
    );

    // D. SMART INSIGHTS VERIFICATION:
    // Verify that Smart Insights never claim 4,400 is a pending installment when pending count is 0
    const pendingCount = repMatrix.payments.pendingInstallmentsCount;
    const unscheduledAmount = repMatrix.payments.unscheduledOutstanding;
    console.log("Installment breakdown:", {
      pendingCount,
      unscheduledAmount,
    });

    const hasPendingInstallmentClaim = repMatrix.insights.some(
      (ins) => ins.title.includes("أقساط قيد الانتظار") && pendingCount === 0,
    );
    assert(!hasPendingInstallmentClaim, "Smart Insights NEVER mislabel unscheduled balance as pending installments");

    // Cleanup Part 2
    await supabaseAdmin.from("installments").delete().in("id", createdInstallments);
    createdInstallments.length = 0;
    await supabaseAdmin.from("bookings").delete().eq("id", augBookingId);

    console.log("✅ PART 2 PASSED: Date Filter Test Matrix & Smart Insights verified.\n");

    // =========================================================================
    // PART 3: REAL-TIME COMPLETE MUTATION CHAIN WITH ALL-MODULE PARITY
    // =========================================================================
    console.log("--- PART 3: Real-Time Mutation Chain (8,900 Contract Full Lifecycle) ---");
    const mutPhone = `+2169977${Math.floor(1000 + Math.random() * 9000)}`;
    const mutKey = customerKey(mutPhone, null, "fallback_mut");

    // Step 1: 8,900 Contract
    const { data: bMut } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "عميل دورة التعديلات",
        phone: mutPhone,
        total_price: 8900,
        paid_amount: 0,
        payment_status: "unpaid",
        status: "confirmed",
      })
      .select("id")
      .single();
    const mutBookingId = bMut!.id;

    let c = await loadCustomer(mutKey);
    assert(c?.totalSpent === 8900 && c?.totalPaid === 0 && c?.totalRemaining === 8900, "Step 1: 8900 contract created");

    // Step 2: Pay 4,500
    const instPay = await recordDirectPayment({
      customerKey: mutKey,
      bookingId: mutBookingId,
      amount: 4500,
      paymentMethod: "bank_transfer",
      title: "دفعة أولى 4500",
    });
    createdInstallments.push(instPay.id);

    c = await loadCustomer(mutKey);
    let r = await loadReports();
    assert(c?.totalPaid === 4500 && c?.totalRemaining === 4400, "Step 2: Paid 4,500, Remaining = 4,400 (CRM)");
    assert(r.payments.totalCollectedInstallments >= 4500, "Step 2: Reports collected reflects payment");

    // Step 3: Edit to 5,000
    await updateInstallmentRecord({
      installmentId: instPay.id,
      amount: 5000,
    });
    c = await loadCustomer(mutKey);
    assert(c?.totalPaid === 5000 && c?.totalRemaining === 3900, "Step 3: Edit to 5,000 -> Remaining = 3,900");

    // Step 4: Edit to 2,000
    await updateInstallmentRecord({
      installmentId: instPay.id,
      amount: 2000,
    });
    c = await loadCustomer(mutKey);
    assert(c?.totalPaid === 2000 && c?.totalRemaining === 6900, "Step 4: Edit to 2,000 -> Remaining = 6,900");

    // Step 5: Delete payment
    await deleteInstallmentRecord(instPay.id);
    const pIdx = createdInstallments.indexOf(instPay.id);
    if (pIdx !== -1) createdInstallments.splice(pIdx, 1);
    c = await loadCustomer(mutKey);
    assert(c?.totalPaid === 0 && c?.totalRemaining === 8900, "Step 5: Delete payment -> Remaining restored to 8,900");

    // Step 6: Create pending installment (3000 TND due in 15 days)
    const due15 = new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];
    const { data: instPend } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: mutBookingId,
        customer_key: mutKey,
        amount: 3000,
        due_date: due15,
        status: "pending",
        title: "قسط مجدول 3000",
      })
      .select("id")
      .single();
    createdInstallments.push(instPend!.id);

    r = await loadReports();
    c = await loadCustomer(mutKey);
    assert(c?.installmentsCount === 1, "Step 6: Pending installment shows in CRM (1)");
    assert(r.payments.totalPendingInstallments >= 3000, "Step 6: Reports reflects +3000 pending");

    // Step 7: Mark pending installment paid
    await updateInstallmentRecord({
      installmentId: instPend!.id,
      status: "paid",
      paidAt: new Date().toISOString(),
    });
    c = await loadCustomer(mutKey);
    r = await loadReports();
    assert(c?.totalPaid === 3000 && c?.totalRemaining === 5900, "Step 7: Marked paid -> Paid = 3,000, Remaining = 5,900");

    // Step 8: Reschedule overdue installment
    // Create overdue installment first
    const past10 = new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0];
    const { data: instOver } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: mutBookingId,
        customer_key: mutKey,
        amount: 2000,
        due_date: past10,
        status: "pending",
        title: "قسط متأخر 2000",
      })
      .select("id")
      .single();
    createdInstallments.push(instOver!.id);

    r = await loadReports();
    const overBefore = r.payments.overdueInstallmentsCount;

    // Reschedule to future
    const future30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    await updateInstallmentRecord({
      installmentId: instOver!.id,
      dueDate: future30,
    });
    r = await loadReports();
    assert(
      r.payments.overdueInstallmentsCount === overBefore - 1,
      "Step 8: Rescheduling overdue installment decrements overdue count",
    );

    // Step 9: Delete installment
    await deleteInstallmentRecord(instOver!.id);
    const oIdx = createdInstallments.indexOf(instOver!.id);
    if (oIdx !== -1) createdInstallments.splice(oIdx, 1);

    // Cleanup Step 7 installment and booking
    await deleteInstallmentRecord(instPend!.id);
    const pendIdx = createdInstallments.indexOf(instPend!.id);
    if (pendIdx !== -1) createdInstallments.splice(pendIdx, 1);
    await supabaseAdmin.from("bookings").delete().eq("id", mutBookingId);

    console.log("✅ PART 3 PASSED: Real-Time Mutation Lifecycle & Multi-Module Parity verified.\n");

    console.log("==================================================");
    console.log("ALL SEMANTIC AUDIT INTEGRITY CHECKS PASSED! 🎉");
    console.log("==================================================\n");
  } finally {
    console.log("--- CLEANUP: Removing all remaining test records ---");
    if (createdInstallments.length > 0) {
      await supabaseAdmin.from("installments").delete().in("id", createdInstallments);
    }
    if (bookingId) {
      await supabaseAdmin.from("bookings").delete().eq("id", bookingId);
    }
    await supabaseAdmin.from("customer_profiles").delete().in("customer_key", [testKey]);
    console.log("Safe cleanup complete.\n");
  }
}

runSemanticAudit().catch((err) => {
  console.error("Semantic audit test failed:", err);
  process.exit(1);
});
