/**
 * Automated Real-Data Integrity & Mutation Test Script
 * Jannat Sahara CRM + Payments + Accounting + Reports
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

async function runIntegrityTests() {
  console.log("\n==================================================");
  console.log("JANNAT SAHRA — FINANCIAL & CRM INTEGRITY TESTS");
  console.log("==================================================\n");

  const testPhoneA = `+21699000${Math.floor(1000 + Math.random() * 9000)}`;
  const testPhoneB = `+21699000${Math.floor(1000 + Math.random() * 9000)}`;
  const testKeyA = customerKey(testPhoneA, null, "fallback_a");
  const testKeyB = customerKey(testPhoneB, null, "fallback_b");

  let bookingAId: string | null = null;
  let bookingBId: string | null = null;
  const createdInstallmentIds: string[] = [];

  try {
    // ----------------------------------------------------
    // TEST 1: NOTES NORMALIZATION & BOUNDARY SAFETY
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Notes Normalization & Boundary Safety ---");

    // Case 1.1: Normal string notes
    await saveCustomerProfile({
      customerKey: testKeyA,
      fullName: "عميل تجريبي أ",
      phone: testPhoneA,
      city: "قبلي",
      status: "lead",
      notes: "يفضل مقاعد أمامية في الحافلة",
    });
    let custA = await loadCustomer(testKeyA);
    assert(
      custA?.profileNotes === "يفضل مقاعد أمامية في الحافلة",
      "Customer loaded with valid string notes",
    );

    // Case 1.2: Empty string notes -> normalizes to null
    await saveCustomerProfile({
      customerKey: testKeyA,
      notes: "",
    });
    custA = await loadCustomer(testKeyA);
    assert(custA?.profileNotes === null, "Empty string notes normalized to null");

    // Case 1.3: Null notes -> preserves null
    await saveCustomerProfile({
      customerKey: testKeyA,
      notes: null,
    });
    custA = await loadCustomer(testKeyA);
    assert(custA?.profileNotes === null, "Null notes preserved as null");

    // Case 1.4: Unexpected legacy array/object -> safely normalizes without crash
    await saveCustomerProfile({
      customerKey: testKeyA,
      notes: ["legacy_tag", "vip"] as unknown as string,
    });
    custA = await loadCustomer(testKeyA);
    assert(
      custA?.profileNotes === null,
      "Unexpected non-string notes normalized safely without crashing",
    );

    // ----------------------------------------------------
    // TEST 2: CLIENT STATUS PRECEDENCE & PERSISTENCE
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Client Status Precedence & Persistence ---");

    // Create a real active confirmed booking for Client A
    const { data: bA, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "عميل تجريبي أ",
        phone: testPhoneA,
        package_title: "برنامج عمرة رمضان المميزة",
        package_category: "umrah",
        status: "confirmed",
        payment_status: "unpaid",
        paid_amount: 0,
        total_price: 3000,
        currency: "TND",
        adults: 1,
        people: 1,
        created_at: new Date("2026-01-05T10:00:00Z").toISOString(),
      })
      .select()
      .single();

    if (bErr || !bA) throw new Error(`Failed to create test booking A: ${bErr?.message}`);
    bookingAId = bA.id;

    // Admin explicitly sets status to 'lead'
    await saveCustomerProfile({
      customerKey: testKeyA,
      status: "lead",
    });

    custA = await loadCustomer(testKeyA);
    assert(
      custA?.status === "lead",
      "Explicit status 'lead' persists even when client has a confirmed booking (NOT overwritten by automated heuristic)",
    );

    // Admin sets status to 'vip'
    await saveCustomerProfile({
      customerKey: testKeyA,
      status: "vip",
    });
    custA = await loadCustomer(testKeyA);
    assert(custA?.status === "vip", "Explicit status 'vip' persists");

    // Admin sets status to 'cancelled'
    await saveCustomerProfile({
      customerKey: testKeyA,
      status: "cancelled",
    });
    custA = await loadCustomer(testKeyA);
    assert(custA?.status === "cancelled", "Explicit status 'cancelled' persists");

    // Admin sets status to 'customer'
    await saveCustomerProfile({
      customerKey: testKeyA,
      status: "customer",
    });
    custA = await loadCustomer(testKeyA);
    assert(custA?.status === "customer", "Explicit status 'customer' persists");

    // ----------------------------------------------------
    // TEST 3: STRICT FINANCIAL VALIDATION
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Strict Financial Validation (Negative, Zero, Overpayment) ---");

    // Attempt negative payment
    let threwNegative = false;
    try {
      await recordDirectPayment({
        customerKey: testKeyA,
        bookingId: bookingAId,
        amount: -500,
      });
    } catch (e: unknown) {
      threwNegative = true;
      assert(
        (e as Error).message.includes("أكبر من صفر"),
        "Negative payment correctly rejected",
      );
    }
    assert(threwNegative, "Negative payment threw an error");

    // Attempt zero payment
    let threwZero = false;
    try {
      await recordDirectPayment({
        customerKey: testKeyA,
        bookingId: bookingAId,
        amount: 0,
      });
    } catch (e: unknown) {
      threwZero = true;
      assert(
        (e as Error).message.includes("أكبر من صفر"),
        "Zero payment correctly rejected",
      );
    }
    assert(threwZero, "Zero payment threw an error");

    // Attempt overpayment: booking is 3000, attempt 3500
    let threwOverpayment = false;
    try {
      await recordDirectPayment({
        customerKey: testKeyA,
        bookingId: bookingAId,
        amount: 3500,
      });
    } catch (e: unknown) {
      threwOverpayment = true;
      assert(
        (e as Error).message.includes("المبلغ يتجاوز المبلغ المتبقي"),
        "Overpayment correctly rejected with 'المبلغ يتجاوز المبلغ المتبقي.'",
      );
    }
    assert(threwOverpayment, "Overpayment payment threw an error");

    // ----------------------------------------------------
    // TEST 4: PARTIAL PAYMENT RECORDING & ACTUAL DATE
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Partial Payment Recording & Actual Date ---");

    const paymentDate1 = "2026-01-10T14:30:00.000Z";
    const inst1 = await recordDirectPayment({
      customerKey: testKeyA,
      bookingId: bookingAId,
      amount: 1000,
      paymentDate: paymentDate1,
      paymentMethod: "cash",
      title: "الدفعة الأولى نقداً",
      note: "وصل استلام رقم 101",
    });
    createdInstallmentIds.push(inst1.id);

    assert(Number(inst1.amount) === 1000, "Installment 1 recorded with amount = 1000");
    assert(inst1.status === "paid", "Installment 1 status is 'paid'");
    assert(
      new Date(inst1.paid_at!).toISOString() === paymentDate1,
      "Installment 1 paid_at preserves the exact transaction date (2026-01-10)",
    );

    // Verify booking recalculated
    const { data: bAfterPay1 } = await supabaseAdmin
      .from("bookings")
      .select("paid_amount, payment_status")
      .eq("id", bookingAId)
      .single();

    assert(Number(bAfterPay1?.paid_amount) === 1000, "Booking paid_amount is now 1000");
    assert(bAfterPay1?.payment_status === "partially_paid", "Booking payment_status is 'partially_paid'");

    // Verify customer financial summary
    custA = await loadCustomer(testKeyA);
    assert(custA?.totalSpent === 3000, "Customer totalSpent = 3000");
    assert(custA?.totalPaid === 1000, "Customer totalPaid = 1000");
    assert(custA?.totalRemaining === 2000, "Customer totalRemaining = 2000");

    // ----------------------------------------------------
    // TEST 5: OVERPAYMENT AFTER PARTIAL PAYMENT
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Overpayment on Remaining Balance ---");
    // Remaining is 2000, attempt 2500
    let threwOverRemaining = false;
    try {
      await recordDirectPayment({
        customerKey: testKeyA,
        bookingId: bookingAId,
        amount: 2500,
      });
    } catch (e: unknown) {
      threwOverRemaining = true;
      assert(
        (e as Error).message.includes("المبلغ يتجاوز المبلغ المتبقي"),
        "Payment exceeding remaining balance (2500 > 2000) rejected",
      );
    }
    assert(threwOverRemaining, "Payment exceeding remaining balance threw error");

    // ----------------------------------------------------
    // TEST 6: PAYMENT EDIT & RECALCULATION
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Payment Edit (1000 -> 1500 TND) ---");

    const updatedInst = await updateInstallmentRecord({
      installmentId: inst1.id,
      amount: 1500,
      paymentMethod: "bank_transfer",
      note: "تم تعديل الوصل إلى تحويل بنكي 1500",
    });

    assert(Number(updatedInst.amount) === 1500, "Installment 1 amount updated to 1500");
    assert(updatedInst.payment_method === "bank_transfer", "Installment 1 payment method updated");

    // Verify booking recalculated immediately
    const { data: bAfterEdit } = await supabaseAdmin
      .from("bookings")
      .select("paid_amount, payment_status")
      .eq("id", bookingAId)
      .single();

    assert(Number(bAfterEdit?.paid_amount) === 1500, "Booking paid_amount recalculated to 1500");
    assert(bAfterEdit?.payment_status === "partially_paid", "Booking payment_status is 'partially_paid'");

    custA = await loadCustomer(testKeyA);
    assert(custA?.totalPaid === 1500, "Customer totalPaid updated to 1500");
    assert(custA?.totalRemaining === 1500, "Customer totalRemaining updated to 1500");

    // ----------------------------------------------------
    // TEST 7: FULL PAYMENT SUPPORT
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Full Payment (Remaining 1500 TND) ---");

    const paymentDate2 = "2026-02-15T09:00:00.000Z";
    const inst2 = await recordDirectPayment({
      customerKey: testKeyA,
      bookingId: bookingAId,
      amount: 1500,
      paymentDate: paymentDate2,
      paymentMethod: "cheque",
      title: "سداد كامل للحجز",
      isFullPayment: true,
      note: "شيك رقم 998877",
    });
    createdInstallmentIds.push(inst2.id);

    // Verify booking status is now fully 'paid'
    const { data: bAfterFull } = await supabaseAdmin
      .from("bookings")
      .select("paid_amount, payment_status")
      .eq("id", bookingAId)
      .single();

    assert(Number(bAfterFull?.paid_amount) === 3000, "Booking paid_amount is 3000");
    assert(bAfterFull?.payment_status === "paid", "Booking payment_status is fully 'paid'");

    custA = await loadCustomer(testKeyA);
    assert(custA?.totalPaid === 3000, "Customer totalPaid is 3000");
    assert(custA?.totalRemaining === 0, "Customer totalRemaining is 0");
    assert(custA?.hasUnpaidBalance === false, "Customer hasUnpaidBalance is false");

    // ----------------------------------------------------
    // TEST 8: PAYMENT DELETE / BALANCE RESTORATION
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Payment Delete & Balance Restoration ---");

    await deleteInstallmentRecord(inst2.id);

    const { data: bAfterDelete } = await supabaseAdmin
      .from("bookings")
      .select("paid_amount, payment_status")
      .eq("id", bookingAId)
      .single();

    assert(Number(bAfterDelete?.paid_amount) === 1500, "Booking paid_amount dropped back to 1500");
    assert(
      bAfterDelete?.payment_status === "partially_paid",
      "Booking payment_status reverted to 'partially_paid'",
    );

    custA = await loadCustomer(testKeyA);
    assert(custA?.totalPaid === 1500, "Customer totalPaid reverted to 1500");
    assert(custA?.totalRemaining === 1500, "Customer totalRemaining restored to 1500");
    assert(custA?.hasUnpaidBalance === true, "Customer hasUnpaidBalance is true");

    // ----------------------------------------------------
    // TEST 9: CROSS-CLIENT ISOLATION
    // ----------------------------------------------------
    console.log("\n--- TEST 9: Cross-Client Account Isolation ---");

    // Create Client B profile and booking (2000 TND)
    await saveCustomerProfile({
      customerKey: testKeyB,
      fullName: "عميل تجريبي ب",
      phone: testPhoneB,
      city: "توزر",
      status: "customer",
    });

    const { data: bB, error: bBErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "عميل تجريبي ب",
        phone: testPhoneB,
        package_title: "رحلة تركيا إسطنبول وبورصة",
        package_category: "turkey",
        status: "confirmed",
        payment_status: "unpaid",
        paid_amount: 0,
        total_price: 2000,
        currency: "TND",
        adults: 1,
        people: 1,
        created_at: new Date("2026-02-01T10:00:00Z").toISOString(),
      })
      .select()
      .single();

    if (bBErr || !bB) throw new Error(`Failed to create test booking B: ${bBErr?.message}`);
    bookingBId = bB.id;

    // Record payment for Client B (500 TND)
    const instB = await recordDirectPayment({
      customerKey: testKeyB,
      bookingId: bookingBId,
      amount: 500,
      paymentDate: "2026-02-10T12:00:00.000Z",
      paymentMethod: "cash",
      title: "دفعة أولى عميل ب",
    });
    createdInstallmentIds.push(instB.id);

    const custA_isolated = await loadCustomer(testKeyA);
    const custB_isolated = await loadCustomer(testKeyB);

    assert(custA_isolated?.totalPaid === 1500, "Client A totalPaid is strictly 1500");
    assert(custB_isolated?.totalPaid === 500, "Client B totalPaid is strictly 500");

    // Check installment rows isolation
    assert(
      custA_isolated?.installments.every((i) => i.customer_key === testKeyA),
      "Client A installments contain ONLY Client A records",
    );
    assert(
      custB_isolated?.installments.every((i) => i.customer_key === testKeyB),
      "Client B installments contain ONLY Client B records",
    );

    // ----------------------------------------------------
    // TEST 10: DATE TESTING & ACCOUNTING REPORTS AGGREGATION
    // ----------------------------------------------------
    console.log("\n--- TEST 10: Date Testing & Accounting Reports Aggregation ---");

    const reports = await loadReports();

    // Check that period KPIs exist
    assert(!!reports.periodKpis, "Period KPIs exist in reports");
    assert(typeof reports.periodKpis.all?.revenue === "number", "All time revenue is a valid number");
    assert(typeof reports.periodKpis.month?.paid === "number", "Monthly paid is a valid number");

    // ----------------------------------------------------
    // TEST 11: CRITICAL REGRESSION TEST — EXACT 8,900 / 4,500 / 4,400 SCENARIO
    // ----------------------------------------------------
    console.log("\n--- TEST 11: Critical Regression Test (8,900 / 4,500 / 4,400 Scenario) ---");

    const testPhoneReg = `+21699000${Math.floor(1000 + Math.random() * 9000)}`;
    const testKeyReg = customerKey(testPhoneReg, null, "fallback_reg");

    // Baseline reports before regression test records
    const reportsBefore = await loadReports();
    const baseRevenue = reportsBefore.kpis.totalRevenue;
    const basePaid = reportsBefore.kpis.totalPaid;
    const baseOutstanding = reportsBefore.kpis.totalOutstanding;

    // 1. Create a confirmed custom request with offer_amount = 8900
    const { data: regReq, error: regErr } = await supabaseAdmin
      .from("custom_package_requests")
      .insert({
        reference: `JS-REG-${Date.now()}`,
        customer_name: "عميل سيناريو الانحدار",
        customer_key: testKeyReg,
        phone: testPhoneReg,
        status: "confirmed",
        offer_amount: 8900,
        departure_date: "2026-09-25",
        return_date: "2026-10-15",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (regErr || !regReq) throw new Error(`Failed to create regression request: ${regErr?.message}`);
    const regReqId = regReq.id;

    // Verify client shows 8900 contracted value before payment
    let regCust = await loadCustomer(testKeyReg);
    assert(regCust?.totalSpent === 8900, "Regression Client totalSpent = 8900");
    assert(regCust?.totalPaid === 0, "Regression Client totalPaid = 0");
    assert(regCust?.totalRemaining === 8900, "Regression Client totalRemaining = 8900");

    // 2. Record payment of 4500 TND
    const regInst = await recordDirectPayment({
      customerKey: testKeyReg,
      amount: 4500,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "bank_transfer",
      title: "دفعة مالية جزئية",
    });
    createdInstallmentIds.push(regInst.id);

    // 3. Verify Client calculation: Paid = 4500, Remaining = 4400
    regCust = await loadCustomer(testKeyReg);
    assert(regCust?.totalSpent === 8900, "Regression Client totalSpent = 8900");
    assert(regCust?.totalPaid === 4500, "Regression Client totalPaid = 4500");
    assert(regCust?.totalRemaining === 4400, "Regression Client totalRemaining = 4400");

    // 4. Verify Reports calculation: Total Revenue, Cash Collected, Outstanding
    const reportsAfterPay = await loadReports();
    assert(
      reportsAfterPay.kpis.totalRevenue === baseRevenue + 8900,
      `Reports totalRevenue increased by 8900 (${reportsAfterPay.kpis.totalRevenue})`,
    );
    assert(
      reportsAfterPay.kpis.totalPaid === basePaid + 4500,
      `Reports totalPaid increased by 4500 (${reportsAfterPay.kpis.totalPaid})`,
    );
    assert(
      reportsAfterPay.kpis.totalOutstanding === baseOutstanding + 4400,
      `Reports totalOutstanding increased by 4400 (${reportsAfterPay.kpis.totalOutstanding})`,
    );

    // Verify Period KPIs include the payment
    assert(
      reportsAfterPay.periodKpis.all.paid === reportsBefore.periodKpis.all.paid + 4500,
      "Reports periodKpis.all.paid contains the 4500 payment",
    );
    assert(
      reportsAfterPay.periodKpis.all.revenue === reportsBefore.periodKpis.all.revenue + 8900,
      "Reports periodKpis.all.revenue contains the 8900 contracted value",
    );

    // 5. Edit Payment: 4500 -> 5000 TND
    await updateInstallmentRecord({
      installmentId: regInst.id,
      amount: 5000,
    });

    regCust = await loadCustomer(testKeyReg);
    assert(regCust?.totalPaid === 5000, "Regression Client totalPaid updated to 5000");
    assert(regCust?.totalRemaining === 3900, "Regression Client totalRemaining updated to 3900");

    const reportsAfterEdit = await loadReports();
    assert(
      reportsAfterEdit.kpis.totalPaid === basePaid + 5000,
      `Reports totalPaid reflects updated 5000 (${reportsAfterEdit.kpis.totalPaid})`,
    );
    assert(
      reportsAfterEdit.kpis.totalOutstanding === baseOutstanding + 3900,
      `Reports totalOutstanding reflects updated 3900 (${reportsAfterEdit.kpis.totalOutstanding})`,
    );

    // 6. Delete Payment: revert to 0 paid, 8900 remaining
    await deleteInstallmentRecord(regInst.id);
    const instIdx = createdInstallmentIds.indexOf(regInst.id);
    if (instIdx !== -1) createdInstallmentIds.splice(instIdx, 1);

    regCust = await loadCustomer(testKeyReg);
    assert(regCust?.totalPaid === 0, "Regression Client totalPaid reverted to 0 after delete");
    assert(regCust?.totalRemaining === 8900, "Regression Client totalRemaining restored to 8900");

    const reportsAfterDel = await loadReports();
    assert(
      reportsAfterDel.kpis.totalPaid === basePaid,
      `Reports totalPaid restored to baseline (${reportsAfterDel.kpis.totalPaid})`,
    );

    // Cleanup regression custom request
    await supabaseAdmin.from("custom_package_requests").delete().eq("id", regReqId);

    // ----------------------------------------------------
    // TEST 12: Scheduled Installment Lifecycle, Overdue Detection & Unscheduled Balance
    // ----------------------------------------------------
    console.log("\n--- TEST 12: Installment Lifecycle, Overdue Detection & Unscheduled Balance ---");
    const testKey12 = `p:test_inst_12_${Date.now()}`;
    const { data: b12 } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "Test Installment Customer",
        phone: testKey12.replace("p:", ""),
        total_price: 6000,
        paid_amount: 0,
        payment_status: "unpaid",
        status: "confirmed",
      })
      .select("id")
      .single();

    const booking12Id = b12!.id;
    const repBase12 = await loadReports();
    const basePendingCount = repBase12.payments.pendingInstallmentsCount;
    const baseOverdueCount = repBase12.payments.overdueInstallmentsCount;
    const baseUnscheduled = repBase12.payments.unscheduledOutstanding;

    // 1. Create scheduled pending installment (2000 TND due in 30 days)
    const futureDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const { data: inst12A } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: booking12Id,
        customer_key: testKey12,
        amount: 2000,
        due_date: futureDueDate,
        status: "pending",
        title: "دفعة أولى مجدولة",
      })
      .select("id, amount, status, due_date")
      .single();
    createdInstallmentIds.push(inst12A!.id);

    const repAfterPending = await loadReports();
    assert(
      repAfterPending.payments.pendingInstallmentsCount === basePendingCount + 1,
      `Pending installments count increased by 1 (${repAfterPending.payments.pendingInstallmentsCount})`,
    );
    assert(
      repAfterPending.payments.totalPendingInstallments === repBase12.payments.totalPendingInstallments + 2000,
      "Pending installments total reflects +2000 TND",
    );

    // 2. Mark pending installment as paid
    await updateInstallmentRecord({
      installmentId: inst12A!.id,
      status: "paid",
      paidAt: new Date().toISOString(),
    });

    const repAfterPaid = await loadReports();
    assert(
      repAfterPaid.payments.pendingInstallmentsCount === basePendingCount,
      "Pending installments decreased by 1 after being paid",
    );
    assert(
      repAfterPaid.payments.paidInstallmentsCount === repBase12.payments.paidInstallmentsCount + 1,
      "Paid installments increased by 1",
    );

    // 3. Create overdue installment (1500 TND due 10 days ago)
    const pastDueDate = new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0];
    const { data: inst12Overdue } = await supabaseAdmin
      .from("installments")
      .insert({
        booking_id: booking12Id,
        customer_key: testKey12,
        amount: 1500,
        due_date: pastDueDate,
        status: "pending",
        title: "قسط متأخر",
      })
      .select("id, amount, status, due_date")
      .single();
    createdInstallmentIds.push(inst12Overdue!.id);

    const repAfterOverdue = await loadReports();
    assert(
      repAfterOverdue.payments.overdueInstallmentsCount === baseOverdueCount + 1,
      `Overdue installments count increased by 1 (${repAfterOverdue.payments.overdueInstallmentsCount})`,
    );
    assert(
      repAfterOverdue.insights.some((ins) => ins.id.includes("overdue")),
      "Smart Insights dynamically generated overdue alert",
    );

    // 4. Update overdue installment to future date -> overdue count drops back
    await updateInstallmentRecord({
      installmentId: inst12Overdue!.id,
      dueDate: futureDueDate,
    });

    const repAfterRescheduled = await loadReports();
    assert(
      repAfterRescheduled.payments.overdueInstallmentsCount === baseOverdueCount,
      "Overdue installments returned to baseline after rescheduling",
    );

    // Cleanup Test 12 booking
    await supabaseAdmin.from("bookings").delete().eq("id", booking12Id);

    // ----------------------------------------------------
    // TEST 13: Deduplication Between Bookings & Custom Package Requests
    // ----------------------------------------------------
    console.log("\n--- TEST 13: Deduplication Between Bookings & Custom Requests ---");
    const repBeforeDedup = await loadReports();
    const testDedupRef = `JS-TEST-DEDUP-${Date.now()}`;
    const testKey13 = `p:test_dedup_${Date.now()}`;

    // A. Create confirmed custom request (3500 TND)
    const { data: req13 } = await supabaseAdmin
      .from("custom_package_requests")
      .insert({
        customer_name: "Dedup Test Client",
        phone: testKey13.replace("p:", ""),
        customer_key: testKey13,
        reference: testDedupRef,
        status: "confirmed",
        offer_amount: 3500,
      })
      .select("id")
      .single();

    // B. Create a booking that references the custom request by reference in notes
    const { data: book13 } = await supabaseAdmin
      .from("bookings")
      .insert({
        name: "Dedup Test Client",
        phone: testKey13.replace("p:", ""),
        total_price: 3500,
        paid_amount: 0,
        payment_status: "unpaid",
        status: "confirmed",
        notes: `Converted from custom request: ${testDedupRef}`,
      })
      .select("id")
      .single();

    const repAfterDedup = await loadReports();
    const revenueDiff = repAfterDedup.kpis.totalRevenue - repBeforeDedup.kpis.totalRevenue;
    assert(
      revenueDiff === 3500,
      `Contract revenue increased by exactly 3500 (NOT double-counted to 7000): diff = ${revenueDiff}`,
    );

    // Cleanup Test 13 records
    if (req13) await supabaseAdmin.from("custom_package_requests").delete().eq("id", req13.id);
    if (book13) await supabaseAdmin.from("bookings").delete().eq("id", book13.id);

    console.log("\n==================================================");
    console.log("ALL 13 CRM & FINANCIAL INTEGRITY TESTS PASSED! 🎉");
    console.log("==================================================\n");
  } finally {
    // ----------------------------------------------------
    // CLEANUP: Cleanly delete all test records
    // ----------------------------------------------------
    console.log("--- CLEANUP: Removing all test records ---");
    if (createdInstallmentIds.length > 0) {
      await supabaseAdmin.from("installments").delete().in("id", createdInstallmentIds);
    }
    if (bookingAId) {
      await supabaseAdmin.from("bookings").delete().eq("id", bookingAId);
    }
    if (bookingBId) {
      await supabaseAdmin.from("bookings").delete().eq("id", bookingBId);
    }
    await supabaseAdmin
      .from("customer_profiles")
      .delete()
      .in("customer_key", [testKeyA, testKeyB]);
    console.log("Cleaned up test installments, bookings, and profiles safely.\n");
  }
}

runIntegrityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
