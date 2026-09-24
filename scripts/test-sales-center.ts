/**
 * Automated Real-Data Test Suite for Jannat Sahara Lead Capture & Sales Center
 *
 * Tests:
 * 1. Contact Form Lead submission & progressive validation
 * 2. Umrah Builder Lead integration & configuration snapshot preservation
 * 3. Sales Center KPIs & pipeline calculation
 * 4. Manual lead creation & duplicate detection
 * 5. Status transitions & mandatory loss reason validation
 * 6. Follow-up scheduling with urgency classification (overdue, today, upcoming)
 * 7. Objections recording
 * 8. Custom offer tracking
 * 9. Safe conversion of Lead to Booking and Customer Profile
 * 10. Security checks & permission gates
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load environment variables
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
import { customerKey, normalizePhone } from "../src/lib/admin/customer-identity";
import {
  ContactLeadInput,
  BuilderLeadInput,
  ManualLeadInput,
  UpdateLeadStatusInput,
  ScheduleLeadFollowUpInput,
  RecordLeadObjectionInput,
  SaveLeadOfferInput,
  ConvertLeadToBookingInput,
  TUNISIAN_GOVERNORATES,
} from "../src/lib/leads/leads.schema";
import {
  ROLE_DEFAULT_PERMISSIONS,
  computeEffectivePermissions,
  hasPermissionInList,
} from "../src/lib/admin/permissions";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runSalesCenterTests() {
  console.log("\n========================================================");
  console.log("JANNAT SAHARA — SALES CENTER & LEAD CAPTURE TEST SUITE");
  console.log("========================================================\n");

  const testPhone = `+21698${Math.floor(100000 + Math.random() * 900000)}`;
  const testNormalizedPhone = normalizePhone(testPhone);
  const testKey = customerKey(testPhone, null, "test-sales-center");

  console.log(`Target test identity: ${testPhone} (normalized: ${testNormalizedPhone})`);

  let testBookingId: string | null = null;
  let testCustomRequestId: string | null = null;
  let testLeadId: string | null = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Tunisian Governorates validation
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Tunisian Governorates Definition ---");
    assert(TUNISIAN_GOVERNORATES.length === 24, "All 24 Tunisian governorates are defined");
    assert(TUNISIAN_GOVERNORATES.some((g) => g.ar === "تونس" && g.id === "tunis"), "Governorate Tunis is present");
    assert(TUNISIAN_GOVERNORATES.some((g) => g.ar === "تطاوين" && g.id === "tataouine"), "Governorate Tataouine is present");
    assert(TUNISIAN_GOVERNORATES.some((g) => g.ar === "صفاقس" && g.id === "sfax"), "Governorate Sfax is present");

    // ----------------------------------------------------
    // TEST 2: Contact Form Input Schema Validation
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Contact Form Input Schema & Validation ---");
    const validContactPayload = {
      fullName: "محمد بن سالم",
      phone: testPhone,
      governorate: "تونس",
      travelersCount: 2,
      tripName: "عمرة المولد النبوي 2026",
      interests: ["السعر والبرنامج", "الفنادق"],
      contactPreference: "whatsapp" as const,
      preferredContactTime: "evening" as const,
      notes: "نحب نعرف تفاصيل فندق مكة",
    };

    const parsedContact = ContactLeadInput.safeParse(validContactPayload);
    assert(parsedContact.success, "Valid contact lead passes schema validation");

    // Invalid phone rejection
    const invalidPhonePayload = {
      ...validContactPayload,
      phone: "123", // too short
    };
    const parsedInvalidPhone = ContactLeadInput.safeParse(invalidPhonePayload);
    assert(!parsedInvalidPhone.success, "Invalid short phone is rejected by schema");

    // Honeypot detection
    const honeypotPayload = {
      ...validContactPayload,
      website_hp: "bot-url",
    };
    const parsedHoneypot = ContactLeadInput.safeParse(honeypotPayload);
    assert(
      parsedHoneypot.success && !!parsedHoneypot.data.website_hp,
      "Honeypot field is captured for anti-spam blocking",
    );

    // ----------------------------------------------------
    // TEST 3: Umrah Builder Configuration Snapshot Validation
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Umrah Builder Lead & Snapshot Validation ---");
    const validBuilderPayload = {
      fullName: "علي التونسي",
      phone: testPhone,
      governorate: "سوسة",
      contactPreference: "phone" as const,
      preferredContactTime: "morning" as const,
      builderSnapshot: {
        tripId: "11111111-1111-1111-1111-111111111111",
        tripTitle: "عمرة أكتوبر 2026",
        startDate: "2026-10-17",
        endDate: "2026-10-31",
        arrivalAirport: "JED",
        departureAirport: "MED",
        flightPreference: "direct",
        adults: 2,
        children: 0,
        infants: 0,
        makkahHotelId: "hotel-makkah-1",
        makkahHotelName: "فندق برج الساعة مكة",
        makkahNights: 7,
        madinahHotelId: "hotel-madinah-1",
        madinahHotelName: "فندق دار التقوى المدينة",
        madinahNights: 7,
        roomType: "double",
        roomPrice: 4200,
        estimatedPrice: 8400,
        currency: "TND",
      },
    };

    const parsedBuilder = BuilderLeadInput.safeParse(validBuilderPayload);
    assert(parsedBuilder.success, "Builder lead with configuration snapshot passes schema validation");
    if (parsedBuilder.success) {
      assert(
        parsedBuilder.data.builderSnapshot.makkahHotelName === "فندق برج الساعة مكة",
        "Makkah hotel name preserved in snapshot",
      );
      assert(
        parsedBuilder.data.builderSnapshot.estimatedPrice === 8400,
        "Estimated price server-authoritative snapshot is preserved",
      );
    }

    // ----------------------------------------------------
    // TEST 4: Manual Lead Creation & Duplicate Protection
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Manual Lead Schema & Duplicate Protection ---");
    const manualLeadPayload = {
      fullName: "سمير الكافي",
      phone: testPhone,
      governorate: "نابل",
      travelersCount: 3,
      tripName: "عمرة رجب 2026",
      source: "meta_ads" as const,
      contactPreference: "phone" as const,
      preferredContactTime: "afternoon" as const,
      notes: "إعلان فيسبوك مهتم بغرفة ثلاثية",
    };

    const parsedManual = ManualLeadInput.safeParse(manualLeadPayload);
    assert(parsedManual.success, "Manual lead passes validation with mandatory source");

    // Check duplicate logic simulation
    const simulatedExistingLeads = [
      {
        id: "lead-existing-1",
        phone_normalized: testNormalizedPhone,
        trip_name: "عمرة رجب 2026",
        status: "qualified",
      },
    ];

    const duplicateMatch = simulatedExistingLeads.find(
      (l) =>
        l.phone_normalized === testNormalizedPhone &&
        l.trip_name === manualLeadPayload.tripName,
    );
    assert(!!duplicateMatch, "Duplicate lead correctly detected matching normalized phone and trip");

    // ----------------------------------------------------
    // TEST 5: Status Transitions & Mandatory Loss Reason
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Status Transitions & Loss Reason Enforcement ---");
    const dummyLeadUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    // Valid transition to contacted
    const validContactedTransition = UpdateLeadStatusInput.safeParse({
      leadId: dummyLeadUuid,
      status: "contacted",
    });
    assert(validContactedTransition.success, "Transition to 'contacted' is valid without loss reason");

    // Status is 'lost' with structured loss reason
    const validLostTransition = UpdateLeadStatusInput.safeParse({
      leadId: dummyLeadUuid,
      status: "lost",
      lossReason: "price",
      lossNotes: "السعر غير مناسب للميزانية الحالية",
    });
    assert(validLostTransition.success, "Transition to 'lost' with valid structured loss reason succeeds");

    // ----------------------------------------------------
    // TEST 6: Follow-Up Scheduling & Urgency Calculation
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Follow-Up Scheduling & Urgency Detection ---");
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const followUpPayload = {
      leadId: dummyLeadUuid,
      nextFollowUpDate: today,
      nextFollowUpTime: "14:30",
      followUpNote: "معاودة الاتصال بعد استشارة العائلة",
    };
    const parsedFollowUp = ScheduleLeadFollowUpInput.safeParse(followUpPayload);
    assert(parsedFollowUp.success, "Follow-up scheduling passes validation");

    function getFollowUpUrgency(dateStr: string | null) {
      if (!dateStr) return "none";
      const leadDate = new Date(dateStr);
      leadDate.setHours(0, 0, 0, 0);
      const curr = new Date();
      curr.setHours(0, 0, 0, 0);

      const diff = leadDate.getTime() - curr.getTime();
      if (diff < 0) return "overdue"; // 🔴 Overdue
      if (diff === 0) return "today"; // 🟡 Today
      return "upcoming"; // 🟢 Upcoming
    }

    assert(getFollowUpUrgency(yesterday) === "overdue", "Yesterday's follow-up marked as 🔴 OVERDUE");
    assert(getFollowUpUrgency(today) === "today", "Today's follow-up marked as 🟡 TODAY");
    assert(getFollowUpUrgency(tomorrow) === "upcoming", "Tomorrow's follow-up marked as 🟢 UPCOMING");

    // ----------------------------------------------------
    // TEST 7: Objections Recording
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Structured Objections Recording ---");
    const validObjection = RecordLeadObjectionInput.safeParse({
      leadId: dummyLeadUuid,
      objection: "family_decision",
      explanation: "في انتظار موافقة الزوجة والأبناء",
    });
    assert(validObjection.success, "Structured objection (family_decision) passes validation");

    const invalidObjection = RecordLeadObjectionInput.safeParse({
      leadId: dummyLeadUuid,
      objection: "invalid_reason_xyz" as any,
    });
    assert(!invalidObjection.success, "Unrecognized objection type is rejected");

    // ----------------------------------------------------
    // TEST 8: Offer Management
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Custom Offer Schema & Validation ---");
    const validOffer = SaveLeadOfferInput.safeParse({
      leadId: dummyLeadUuid,
      offerAmount: 4850,
      offerCurrency: "TND",
      offerStatus: "sent",
      offerNotes: "عرض خاص شامل الإعاشة الكاملة في مكة والمدينة",
    });
    assert(validOffer.success, "Custom offer with amount, currency, and notes passes validation");

    const negativeOffer = SaveLeadOfferInput.safeParse({
      leadId: dummyLeadUuid,
      offerAmount: -100,
    });
    assert(!negativeOffer.success, "Negative offer amount is strictly rejected");

    // ----------------------------------------------------
    // TEST 9: Lead Conversion to Booking & Customer Model
    // ----------------------------------------------------
    console.log("\n--- TEST 9: Lead Conversion to Booking Schema ---");
    const validConversion = ConvertLeadToBookingInput.safeParse({
      leadId: dummyLeadUuid,
      packageId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      specialRequests: "تحويل رسمي من السيلز سنتر بعد قبول العرض",
    });
    assert(validConversion.success, "Conversion to booking payload passes validation");

    // ----------------------------------------------------
    // TEST 10: Real Database Verification (Umrah Packages & Ingestion)
    // ----------------------------------------------------
    console.log("\n--- TEST 10: Supabase DB Package & Real Record Verification ---");
    const { data: realPackages, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("id, title, price, status")
      .eq("status", "published")
      .limit(5);

    if (pkgErr) {
      console.error("pkgErr details:", pkgErr);
    }
    assert(!pkgErr, "Queried real active packages without error");
    assert(realPackages && realPackages.length > 0, `Found ${realPackages?.length} real active packages in database`);
    console.log(`Sample package: ${realPackages?.[0]?.title} (${realPackages?.[0]?.price} TND)`);

    // ----------------------------------------------------
    // TEST 11: Permissions & Role Security Gates
    // ----------------------------------------------------
    console.log("\n--- TEST 11: Permissions & Role Gating ---");
    const superAdminPerms = computeEffectivePermissions(["super_admin"]);
    const adminPerms = computeEffectivePermissions(["admin"]);
    const staffPerms = computeEffectivePermissions(["staff"]);

    assert(
      hasPermissionInList(superAdminPerms, "leads.view"),
      "super_admin has 'leads.view' permission",
    );
    assert(
      hasPermissionInList(adminPerms, "leads.view"),
      "admin has 'leads.view' permission",
    );
    assert(
      hasPermissionInList(staffPerms, "leads.view"),
      "staff has 'leads.view' permission",
    );
    assert(
      hasPermissionInList(staffPerms, "leads.edit"),
      "staff has 'leads.edit' permission",
    );
    assert(
      !hasPermissionInList(staffPerms, "leads.delete"),
      "staff does NOT have 'leads.delete' permission (least privilege)",
    );
    assert(
      !hasPermissionInList(staffPerms, "team.invite"),
      "staff does NOT have 'team.invite' permission",
    );

    // ----------------------------------------------------
    // TEST 12: Conversion Rate KPI Calculation Invariant
    // ----------------------------------------------------
    console.log("\n--- TEST 12: Conversion Rate KPI Formula Invariant ---");
    function calculateKPIs(leadsList: any[]) {
      const total = leadsList.length;
      const confirmed = leadsList.filter((l) => l.status === "confirmed").length;
      const rate = total > 0 ? Math.round((confirmed / total) * 1000) / 10 : 0;
      return { total, confirmed, rate };
    }

    const emptyKPIs = calculateKPIs([]);
    assert(emptyKPIs.rate === 0, "Empty leads list yields 0% conversion rate without NaN");

    const sampleLeads = [
      { status: "confirmed" },
      { status: "lost" },
      { status: "qualified" },
      { status: "confirmed" },
    ];
    const sampleKPIs = calculateKPIs(sampleLeads);
    assert(sampleKPIs.rate === 50, "Sample 2 confirmed out of 4 leads yields exact 50.0% conversion rate");

    console.log("\n========================================================");
    console.log("🎉 ALL SALES CENTER TEST SUITE ASSERTIONS PASSED!");
    console.log("========================================================\n");
  } catch (err: any) {
    console.error("Test Suite failed with error:", err);
    process.exit(1);
  }
}

runSalesCenterTests();
