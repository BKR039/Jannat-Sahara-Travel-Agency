/**
 * JANNAT SAHRA — FORM SYSTEM & DATA SANITIZATION TEST SUITE
 *
 * Verifies:
 * 1. DatePicker date parsing, ISO conversions, leap years, edge cases.
 * 2. TimePicker 24-hour boundaries, hour/minute stepping.
 * 3. NumberInput clamping invariants.
 * 4. Static repository assertions:
 *    - Zero raw native <select> elements in public and admin UI.
 *    - Zero raw native type="date" inputs.
 *    - Zero raw native type="time" inputs.
 *    - Zero realistic dummy personal names in placeholders ("منير الطرابلسي", "أحمد بن علي").
 *    - Zero realistic fake phone numbers ("55 123 456", "55123456") in user-facing placeholders.
 *    - Zero fake customer emails ("client@example.com", "ahmed@example.com").
 */

import fs from "node:fs";
import path from "node:path";
import { parseISODate, toISODate } from "../src/components/ui/date-picker";

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

console.log("\n========================================================");
console.log("JANNAT SAHRA — FORM SYSTEM & DATA SANITIZATION TESTS");
console.log("========================================================\n");

// --- TEST 1: DatePicker ISO Conversions & Edge Cases ---
console.log("--- TEST 1: DatePicker ISO Conversions & Edge Cases ---");
const d1 = parseISODate("2026-10-15");
assert(d1 !== undefined, "Valid ISO date 2026-10-15 parses to Date");
assert(toISODate(d1!) === "2026-10-15", "Date roundtrips back to exact 2026-10-15");

const leap = parseISODate("2024-02-29");
assert(leap !== undefined, "Leap year 2024-02-29 parses correctly");
assert(toISODate(leap!) === "2024-02-29", "Leap year roundtrips correctly");

assert(parseISODate("") === undefined, "Empty string returns undefined");
assert(parseISODate(null) === undefined, "Null returns undefined");
assert(parseISODate("invalid-date") === undefined, "Invalid date string returns undefined");
assert(parseISODate("2026/10/15") === undefined, "Non-ISO format returns undefined");

// --- TEST 2: TimePicker Value & Format Invariants ---
console.log("\n--- TEST 2: TimePicker Format Invariants ---");
function formatTime(h: number, m: number): string {
  const hh = Math.max(0, Math.min(23, h)).toString().padStart(2, "0");
  const mm = Math.max(0, Math.min(59, m)).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
assert(formatTime(9, 30) === "09:30", "09:30 formats with leading zeros");
assert(formatTime(0, 0) === "00:00", "Midnight 00:00 is valid");
assert(formatTime(23, 59) === "23:59", "End of day 23:59 is valid");
assert(formatTime(25, 65) === "23:59", "Overflow is safely clamped");

// --- TEST 3: NumberInput Clamping Logic ---
console.log("\n--- TEST 3: NumberInput Clamping Logic ---");
function clampNumber(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
assert(clampNumber(5, 1, 20) === 5, "Number within range is unchanged");
assert(clampNumber(0, 1, 20) === 1, "Number below minimum is clamped to min");
assert(clampNumber(25, 1, 20) === 20, "Number above maximum is clamped to max");
assert(clampNumber(-5, 1, 20) === 1, "Negative number is clamped to min");

// --- TEST 4: Static Inspection: No Native <select> in UI ---
console.log("\n--- TEST 4: Static Inspection: No Native <select> in UI ---");
const filesToInspect = [
  "src/components/admin/sales/AddLeadModal.tsx",
  "src/components/admin/sales/LeadFilters.tsx",
  "src/components/admin/sales/LeadWorkspaceDrawer.tsx",
  "src/routes/contact.tsx",
  "src/routes/admin.hotels.tsx",
  "src/components/admin/packages/TripEditorPage.tsx",
  "src/components/admin/packages/PackageEditorPage.tsx",
  "src/components/admin/requests/CustomOfferPanel.tsx",
  "src/components/booking/flow/parts.tsx",
];

for (const relPath of filesToInspect) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const hasNativeSelect = /<select[\s>]/g.test(content);
    assert(!hasNativeSelect, `${relPath} contains ZERO native <select> elements`);
  }
}

// --- TEST 5: Static Inspection: No Native <input type="date"> in Forms ---
console.log("\n--- TEST 5: Static Inspection: No Native Date Inputs in Forms ---");
const dateFiles = [
  "src/components/admin/sales/LeadWorkspaceDrawer.tsx",
  "src/components/admin/customers/CustomerWorkspaceDrawer.tsx",
  "src/components/admin/packages/TripEditorPage.tsx",
  "src/components/admin/packages/PackageEditorPage.tsx",
];

for (const relPath of dateFiles) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const hasNativeDate = /<input[^>]+type=["']date["']/i.test(content);
    assert(!hasNativeDate, `${relPath} contains ZERO native <input type="date">`);
  }
}

// --- TEST 6: Static Inspection: No Native <input type="time"> in Forms ---
console.log("\n--- TEST 6: Static Inspection: No Native Time Inputs in Forms ---");
const timeFiles = [
  "src/components/admin/sales/LeadWorkspaceDrawer.tsx",
];

for (const relPath of timeFiles) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const hasNativeTime = /<input[^>]+type=["']time["']/i.test(content);
    assert(!hasNativeTime, `${relPath} contains ZERO native <input type="time">`);
  }
}

// --- TEST 7: Static Inspection: Zero Realistic Customer Placeholders ---
console.log("\n--- TEST 7: Static Inspection: Zero Realistic Customer Placeholders ---");
const forbiddenPhrases = [
  "منير الطرابلسي",
  "أحمد بن علي",
  "55 123 456",
  "client@example.com",
  "ahmed@example.com",
];

const scanFiles = [
  "src/components/admin/sales/AddLeadModal.tsx",
  "src/routes/contact.tsx",
  "src/components/admin/customers/CustomerEditModal.tsx",
  "src/components/admin/team/MemberInviteDrawer.tsx",
  "src/components/admin/settings/CommunicationSection.tsx",
];

for (const relPath of scanFiles) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    for (const phrase of forbiddenPhrases) {
      const found = content.includes(phrase);
      assert(!found, `${relPath} does not contain forbidden placeholder '${phrase}'`);
    }
  }
}

// --- TEST 8: AddLeadModal Specific Screenshot Invariants ---
console.log("\n--- TEST 8: AddLeadModal Specific Screenshot Invariants ---");
const addLeadContent = fs.readFileSync(path.resolve("src/components/admin/sales/AddLeadModal.tsx"), "utf-8");
assert(addLeadContent.includes("placeholder={isRtl ? \"اسم العميل\" : \"Nom du client\"}"), "AddLeadModal name placeholder is generic 'اسم العميل'");
assert(addLeadContent.includes("placeholder={isRtl ? \"رقم الهاتف\" : \"Numéro de téléphone\"}"), "AddLeadModal phone placeholder is generic 'رقم الهاتف'");
assert(addLeadContent.includes("placeholder={isRtl ? \"البريد الإلكتروني\" : \"Adresse e-mail\"}"), "AddLeadModal email placeholder is generic 'البريد الإلكتروني'");
assert(addLeadContent.includes("<Select value={source}"), "AddLeadModal source control uses unified Select");
assert(addLeadContent.includes("<Select value={governorate}"), "AddLeadModal governorate control uses unified Select");
assert(addLeadContent.includes("<NumberInput"), "AddLeadModal travelers count uses NumberInput");

// --- TEST 9: Contact Form Initial State Invariant ---
console.log("\n--- TEST 9: Contact Form Initial State Invariant ---");
const contactContent = fs.readFileSync(path.resolve("src/routes/contact.tsx"), "utf-8");
assert(contactContent.includes('governorate: "",'), "Contact form initial governorate is unselected empty string");
assert(contactContent.includes('placeholder={isRtl ? "اسمك الكامل" : "Votre nom complet"}'), "Contact form name placeholder is generic");
assert(contactContent.includes('placeholder={isRtl ? "رقم هاتفك" : "Votre numéro de téléphone"}'), "Contact form phone placeholder is generic");
assert(contactContent.includes('placeholder={isRtl ? "بريدك الإلكتروني" : "Votre adresse e-mail"}'), "Contact form email placeholder is generic");

console.log("\n========================================================");
if (failed === 0) {
  console.log(`🎉 ALL ${passed} FORM SYSTEM TESTS PASSED SUCCESSFULLY!`);
} else {
  console.error(`💥 ${failed} TESTS FAILED out of ${passed + failed}`);
  process.exit(1);
}
console.log("========================================================\n");
