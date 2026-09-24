/**
 * Pure TypeScript RFC-4180 compliant CSV Engine with Zero Dependencies.
 *
 * Supports:
 * - UTF-8 Byte Order Mark (BOM) handling for Arabic & French Excel compatibility.
 * - Delimiter sniffing (comma ',', semicolon ';', tab '\t').
 * - Quoted fields, escaped double quotes (""), and multiline content.
 * - Fuzzy multilingual column header matching (Arabic, French, English).
 * - Safe CSV export string generation with optional BOM.
 */

import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
  type ImportLeadRowInputType,
} from "./leads.schema";
import { normalizePhone } from "@/lib/admin/customer-identity";

export interface ParsedCsvTable {
  headers: string[];
  rows: string[][];
  delimiter: string;
  totalRows: number;
}

export type LeadFieldKey =
  | "fullName"
  | "phone"
  | "email"
  | "governorate"
  | "city"
  | "tripName"
  | "travelersCount"
  | "source"
  | "notes"
  | "status";

export const LEAD_FIELD_DEFINITIONS: Record<
  LeadFieldKey,
  { labelAr: string; labelFr: string; required: boolean }
> = {
  fullName: { labelAr: "الاسم واللقب", labelFr: "Nom et prénom", required: true },
  phone: { labelAr: "رقم الهاتف", labelFr: "Numéro de téléphone", required: true },
  email: { labelAr: "البريد الإلكتروني", labelFr: "E-mail", required: false },
  governorate: { labelAr: "الولاية", labelFr: "Gouvernorat", required: false },
  city: { labelAr: "المدينة / المعتمدية", labelFr: "Ville", required: false },
  tripName: { labelAr: "الرحلة المطلوبة", labelFr: "Voyage", required: false },
  travelersCount: { labelAr: "عدد المسافرين", labelFr: "Voyageurs", required: false },
  source: { labelAr: "المصدر", labelFr: "Source", required: false },
  notes: { labelAr: "ملاحظات", labelFr: "Remarques", required: false },
  status: { labelAr: "الحالة", labelFr: "Statut", required: false },
};

const HEADER_ALIASES: Record<LeadFieldKey, string[]> = {
  fullName: [
    "اسم",
    "الاسم",
    "الاسم واللقب",
    "اسم العميل",
    "اسم الحريف",
    "nom",
    "nom et prenom",
    "nom & prenom",
    "name",
    "full name",
    "fullname",
    "client",
    "contact",
  ],
  phone: [
    "هاتف",
    "الهاتف",
    "رقم الهاتف",
    "الجوال",
    "الموبايل",
    "tel",
    "telephone",
    "téléphone",
    "phone",
    "mobile",
    "gsm",
    "numero",
    "numéro",
  ],
  email: [
    "بريد",
    "البريد",
    "البريد الإلكتروني",
    "الايميل",
    "email",
    "e-mail",
    "mail",
    "courriel",
  ],
  governorate: [
    "ولاية",
    "الولاية",
    "gouvernorat",
    "governorate",
    "region",
    "région",
    "wilaya",
  ],
  city: ["مدينة", "المدينة", "المعتمدية", "ville", "city", "delegation"],
  tripName: [
    "رحلة",
    "الرحلة",
    "البرنامج",
    "نوع الرحلة",
    "عمرة",
    "voyage",
    "programme",
    "trip",
    "package",
    "destination",
    "offre",
  ],
  travelersCount: [
    "مسافرين",
    "عدد المسافرين",
    "المسافرين",
    "أشخاص",
    "voyageurs",
    "nombre de personnes",
    "pax",
    "travelers",
    "people",
    "places",
  ],
  source: [
    "مصدر",
    "المصدر",
    "قناة الوصول",
    "source",
    "canal",
    "origine",
    "origin",
    "provenance",
  ],
  notes: [
    "ملاحظات",
    "تفاصيل",
    "تعليق",
    "notes",
    "remarques",
    "commentaires",
    "details",
    "description",
  ],
  status: ["حالة", "الحالة", "وضع", "statut", "status", "stage", "etape"],
};

/**
 * Sniffs the primary delimiter by frequency in the first few non-empty lines.
 */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 4000).replace(/^\uFEFF/, "");
  const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return ",";

  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const line of lines) {
    for (const char of line) {
      if (char in counts) counts[char]++;
    }
  }

  if (counts[";"] > counts[","] && counts[";"] > counts["\t"]) return ";";
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  return ",";
}

/**
 * RFC-4180 compliant CSV parser that supports multiline values, escaped quotes,
 * and arbitrary delimiters.
 */
export function parseCsv(text: string, customDelimiter?: string): ParsedCsvTable {
  // Strip BOM if present
  const cleaned = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const delimiter = customDelimiter || detectDelimiter(cleaned);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++; // handle CRLF
        currentRow.push(currentCell.trim());
        currentCell = "";
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        currentCell = "";
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  // Push final cell/row if anything remains
  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], delimiter, totalRows: 0 };
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  return {
    headers: rawHeaders,
    rows: dataRows,
    delimiter,
    totalRows: dataRows.length,
  };
}

/**
 * Automatically maps incoming CSV headers to known Jannat Sahara lead fields.
 */
export function autoMapColumns(headers: string[]): Record<LeadFieldKey, number | null> {
  const mapping: Record<LeadFieldKey, number | null> = {
    fullName: null,
    phone: null,
    email: null,
    governorate: null,
    city: null,
    tripName: null,
    travelersCount: null,
    source: null,
    notes: null,
    status: null,
  };

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s_\-–—:؛]/g, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const normalizedHeaders = headers.map(clean);

  for (const [fieldKey, aliases] of Object.entries(HEADER_ALIASES) as [
    LeadFieldKey,
    string[],
  ][]) {
    for (let idx = 0; idx < normalizedHeaders.length; idx++) {
      const headerText = normalizedHeaders[idx];
      const match = aliases.some((alias) => {
        const cAlias = clean(alias);
        return headerText === cAlias || headerText.includes(cAlias) || cAlias.includes(headerText);
      });
      if (match) {
        mapping[fieldKey] = idx;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Normalizes free-form text input for lead source.
 */
export function normalizeSource(input?: string | null): LeadSource {
  if (!input) return "other";
  const s = input.trim().toLowerCase();

  if (s.includes("builder") || s.includes("مصمم")) return "umrah_builder";
  if (s.includes("meta") || s.includes("ad") || s.includes("إعلان") || s.includes("اعلان")) return "meta_ads";
  if (s.includes("insta") || s.includes("انستغرام")) return "instagram_organic";
  if (s.includes("face") || s.includes("فيسبوك") || s.includes("فايسبوك")) return "facebook";
  if (s.includes("what") || s.includes("واتس") || s.includes("وتساب")) return "whatsapp";
  if (s.includes("mess") || s.includes("ماسنجر")) return "messenger";
  if (s.includes("tel") || s.includes("phone") || s.includes("هاتف") || s.includes("مكالمة")) return "phone";
  if (s.includes("branch") || s.includes("agence") || s.includes("فرع") || s.includes("وكالة")) return "branch";
  if (s.includes("web") || s.includes("site") || s.includes("موقع")) return "website";

  return LEAD_SOURCES.includes(s as LeadSource) ? (s as LeadSource) : "other";
}

/**
 * Normalizes free-form status string into a typed LeadStatus.
 */
export function normalizeStatus(input?: string | null): LeadStatus {
  if (!input) return "new";
  const s = input.trim().toLowerCase();

  if (s.includes("جديد") || s.includes("new") || s.includes("nouveau")) return "new";
  if (s.includes("تواصل") || s.includes("contact") || s.includes("appeler")) return "contacted";
  if (s.includes("مؤهل") || s.includes("qualif")) return "qualified";
  if (s.includes("عرض") || s.includes("offer") || s.includes("devis")) return "offer_sent";
  if (s.includes("متابعة") || s.includes("relance") || s.includes("follow")) return "follow_up";
  if (s.includes("مؤكد") || s.includes("confirm") || s.includes("حجز")) return "confirmed";
  if (s.includes("ملغي") || s.includes("perdu") || s.includes("lost") || s.includes("annul")) return "lost";

  return LEAD_STATUSES.includes(s as LeadStatus) ? (s as LeadStatus) : "new";
}

export interface ValidatedImportRow {
  index: number;
  data: ImportLeadRowInputType;
  phoneNormalized: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates extracted rows using column mapping.
 */
export function validateImportRows(
  rows: string[][],
  mapping: Record<LeadFieldKey, number | null>,
  defaultSource: LeadSource = "other",
  defaultStatus: LeadStatus = "new",
): ValidatedImportRow[] {
  const result: ValidatedImportRow[] = [];

  rows.forEach((row, idx) => {
    const getVal = (field: LeadFieldKey): string | null => {
      const colIdx = mapping[field];
      if (colIdx === null || colIdx === undefined || colIdx >= row.length) return null;
      const v = row[colIdx]?.trim();
      return v && v.length > 0 ? v : null;
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    const fullName = getVal("fullName") || "";
    const phone = getVal("phone") || "";
    const email = getVal("email");
    const governorate = getVal("governorate");
    const city = getVal("city");
    const tripName = getVal("tripName");
    const rawTravelers = getVal("travelersCount");
    const rawSource = getVal("source");
    const notes = getVal("notes");
    const rawStatus = getVal("status");

    // Validation
    if (!fullName || fullName.length < 2) {
      errors.push("اسم العميل مفقود أو أقل من حرفين");
    }

    const phoneNormalized = normalizePhone(phone);
    if (!phone || phoneNormalized.replace(/\D/g, "").length < 8) {
      errors.push("رقم الهاتف غير صالح (يلزم 8 أرقام على الأقل)");
    }

    let travelersCount = 1;
    if (rawTravelers) {
      const parsed = parseInt(rawTravelers, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
        travelersCount = parsed;
      } else {
        warnings.push("عدد المسافرين غير دقيق؛ تم ضبطه على 1");
      }
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      warnings.push("صيغة البريد الإلكتروني غير قياسية");
    }

    const source = rawSource ? normalizeSource(rawSource) : defaultSource;
    const status = rawStatus ? normalizeStatus(rawStatus) : defaultStatus;

    result.push({
      index: idx + 1,
      data: {
        fullName: fullName || "بدون اسم",
        phone: phone || "00000000",
        email: email || null,
        governorate: governorate || null,
        city: city || null,
        tripName: tripName || null,
        travelersCount,
        source,
        notes: notes || null,
        status,
      },
      phoneNormalized,
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  });

  return result;
}

/**
 * Generates an RFC-4180 CSV string with UTF-8 BOM.
 */
export function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const str = String(v);
    if (
      str.includes(",") ||
      str.includes("،") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r") ||
      str.includes(";")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens Arabic and French correctly
  return `\uFEFF${lines.join("\r\n")}`;
}

/**
 * Creates a downloadable sample CSV template for Jannat Sahara Lead Import.
 */
export function generateSampleCsvTemplate(): string {
  const headers = [
    "الاسم واللقب",
    "رقم الهاتف",
    "البريد الإلكتروني",
    "الولاية",
    "الرحلة المطلوبة",
    "عدد المسافرين",
    "المصدر",
    "ملاحظات",
  ];

  const sampleRows = [
    [
      "اسم العميل",
      "20000000",
      "name@example.com",
      "تونس",
      "عمرة المولد النبوي 2026",
      "2",
      "Meta Ads",
      "مهتم بغرفة ثنائية مع إعاشة كاملة",
    ],
    [
      "اسم العميل",
      "21000000",
      "",
      "صفاقس",
      "عمرة رجب 2026",
      "3",
      "WhatsApp",
      "طلب تفاصيل الفنادق القريبة من الحرم",
    ],
  ];

  return generateCsv(headers, sampleRows);
}
