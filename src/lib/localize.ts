import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n, { normalizeLang, type SupportedLanguage } from "@/lib/i18n";

/**
 * Localization layer for database-backed (agency) content.
 *
 * Convention: every translatable column `x` has optional siblings `x_fr` and
 * `x_en`. Arabic lives in the base column (site default language).
 *
 * Fallback policy (deliberate, see i18n spec):
 *  - Arabic UI  -> base column only.
 *  - French UI  -> `x_fr` only.
 *  - English UI -> `x_en` only.
 *  - A missing translation NEVER falls back to another language. The only
 *    reuse allowed is a base value that contains no Arabic script at all
 *    (numbers, latin proper names, URLs, codes) — that is language-neutral.
 */

export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;

export function hasArabic(value: unknown): boolean {
  return typeof value === "string" && ARABIC_RE.test(value);
}

export type Localizable = Record<string, unknown> | null | undefined;

/** Column suffix holding the translation for a given locale. */
export function langSuffix(lang: string | undefined): "" | "_fr" | "_en" {
  const l = normalizeLang(lang);
  return l === "ar" ? "" : (`_${l}` as "_fr" | "_en");
}

/** Localized "translation pending" label (never Arabic in FR/EN UI). */
export function pendingLabel(lang?: string): string {
  return i18n.t("common.translationPending", {
    lng: normalizeLang(lang ?? i18n.language),
    defaultValue: "",
  });
}

/** @deprecated kept for compatibility — use pendingLabel(). */
export const FR_PENDING = "Traduction en cours";

function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Pick the localized value of `field` on `row`.
 * `fallback`:
 *  - "pending" (default) -> localized "translation pending" label
 *  - "empty"             -> empty string (caller hides the block)
 *  - "base"              -> base value even if Arabic (only for language-neutral
 *                           data: names, codes, phone numbers, URLs)
 */
export function localizeField(
  row: Localizable,
  field: string,
  lang: string,
  fallback: "pending" | "empty" | "base" = "pending",
): string {
  if (!row) return "";
  const base = normalize(row[field]);
  const suffix = langSuffix(lang);
  if (!suffix) return base ?? "";

  const translated = normalize(row[`${field}${suffix}`]);
  if (translated) return translated;
  if (fallback === "base") return base ?? "";
  if (!base) return "";
  // Base value carries no Arabic (numbers, latin names, urls) -> language neutral.
  if (!hasArabic(base)) return base;
  return fallback === "pending" ? pendingLabel(lang) : "";
}

export function isArabic(lang: string | undefined): boolean {
  return normalizeLang(lang) === "ar";
}

export function isFrench(lang: string | undefined): boolean {
  return normalizeLang(lang) === "fr";
}

export function isEnglish(lang: string | undefined): boolean {
  return normalizeLang(lang) === "en";
}

/** Localized JSON array column (e.g. `included`, `timeline`, `tags`). */
export function localizeList<T = unknown>(row: Localizable, field: string, lang: string): T[] {
  if (!row) return [];
  const parse = (value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const suffix = langSuffix(lang);
  if (!suffix) return parse(row[field]);

  const translated = parse(row[`${field}${suffix}`]);
  if (translated.length > 0) return translated;
  const base = parse(row[field]);
  // Keep only fully language-neutral base lists (no Arabic anywhere).
  const neutral = base.filter(
    (item) => !hasArabic(typeof item === "string" ? item : JSON.stringify(item)),
  );
  return neutral.length === base.length ? base : [];
}

const INTL_LOCALES: Record<SupportedLanguage, string> = {
  ar: "ar-TN",
  fr: "fr-FR",
  en: "en-GB",
};

/** Locale tag used for Intl formatting. */
export function intlLocale(lang: string | undefined): string {
  return INTL_LOCALES[normalizeLang(lang)];
}

/** Short numeric date in FR/EN, Arabic long date in Arabic. */
export function formatDate(value: string | Date | null | undefined, lang: string): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isArabic(lang)) {
    return new Intl.DateTimeFormat("ar-TN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Long, human date ("12 March 2026" / "12 mars 2026" / Arabic long form). */
export function formatLongDate(value: string | Date | null | undefined, lang: string): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Grouped number with latin digits in Arabic for readability. */
export function formatNumber(value: number | string | null | undefined, lang: string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) return "";
  return new Intl.NumberFormat(isArabic(lang) ? "ar-TN-u-nu-latn" : intlLocale(lang), {
    maximumFractionDigits: 0,
  }).format(num);
}

/** "4 050 TND" — currency always trails the amount. */
export function formatPrice(
  value: number | string | null | undefined,
  lang: string,
  currency = "TND",
): string {
  const amount = formatNumber(value, lang);
  if (!amount) return "";
  return `${amount} ${currency}`;
}

/**
 * React hook exposing the localization helpers bound to the active language.
 */
export function useLocalized() {
  const { i18n: instance } = useTranslation();
  const lang = normalizeLang(instance.language);

  const L = useCallback(
    (row: Localizable, field: string, fallback: "pending" | "empty" | "base" = "pending") =>
      localizeField(row, field, lang, fallback),
    [lang],
  );

  const list = useCallback(
    <T = unknown,>(row: Localizable, field: string) => localizeList<T>(row, field, lang),
    [lang],
  );

  return {
    lang,
    isAr: lang === "ar",
    isFr: lang === "fr",
    isEn: lang === "en",
    rtl: lang === "ar",
    /** localized text field */
    L,
    /** localized JSON array field */
    list,
    date: useCallback((v: string | Date | null | undefined) => formatDate(v, lang), [lang]),
    longDate: useCallback((v: string | Date | null | undefined) => formatLongDate(v, lang), [lang]),
    number: useCallback((v: number | string | null | undefined) => formatNumber(v, lang), [lang]),
    price: useCallback(
      (v: number | string | null | undefined, currency = "TND") => formatPrice(v, lang, currency),
      [lang],
    ),
  };
}

/**
 * Localized value inside a free-form JSON blob (e.g. `site_content.data`).
 * Same fallback policy as `localizeField`: no cross-language fallback.
 */
export function pickLocalized(
  blob: Record<string, unknown> | null | undefined,
  key: string,
  lang: string,
): string | undefined {
  if (!blob) return undefined;
  const suffix = langSuffix(lang);
  const base = normalize(blob[key]);
  if (!suffix) return base ?? undefined;
  const translated = normalize(blob[`${key}${suffix}`]);
  if (translated) return translated;
  if (base && !hasArabic(base)) return base;
  return undefined;
}

/** Localized string array inside a free-form JSON blob. */
export function pickLocalizedList(
  blob: Record<string, unknown> | null | undefined,
  key: string,
  lang: string,
): string[] {
  if (!blob) return [];
  const suffix = langSuffix(lang);
  const asList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  if (!suffix) return asList(blob[key]);
  const translated = asList(blob[`${key}${suffix}`]);
  if (translated.length > 0) return translated;
  return asList(blob[key]).filter((v) => !hasArabic(v));
}
