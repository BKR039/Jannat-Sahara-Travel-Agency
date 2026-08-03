import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "@/lib/i18n";

/**
 * Localization layer for database-backed (dynamic) content.
 *
 * Convention: every translatable column `x` has an optional French sibling
 * `x_fr`. Arabic lives in the base column (site default language).
 *
 * Rules:
 *  - Arabic UI  -> always the base column.
 *  - French UI  -> `x_fr` when present and non-empty, otherwise a neutral
 *    fallback so Arabic never leaks into the French interface.
 */

export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;

export function hasArabic(value: unknown): boolean {
  return typeof value === "string" && ARABIC_RE.test(value);
}

export type Localizable = Record<string, unknown> | null | undefined;

/** Neutral placeholder used when a French translation is missing. */
export const FR_PENDING = "Traduction en cours";

function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Pick the localized value of `field` on `row`.
 * `fallback`:
 *  - "pending" (default) -> `FR_PENDING` label when the FR value is missing
 *  - "empty"             -> empty string (caller hides the block)
 *  - "base"              -> base value even if Arabic (only for names, codes,
 *                           phone numbers, URLs and other language-neutral data)
 */
export function localizeField(
  row: Localizable,
  field: string,
  lang: string,
  fallback: "pending" | "empty" | "base" = "pending",
): string {
  if (!row) return "";
  const base = normalize(row[field]);
  if (!isFrench(lang)) return base ?? "";

  const fr = normalize(row[`${field}_fr`]);
  if (fr) return fr;
  if (fallback === "base") return base ?? "";
  if (!base) return "";
  // Base value carries no Arabic (numbers, latin names, urls) -> safe to reuse.
  if (!hasArabic(base)) return base;
  return fallback === "pending" ? FR_PENDING : "";
}

export function isFrench(lang: string | undefined): boolean {
  return (lang ?? "ar").split("-")[0] === "fr";
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

  if (isFrench(lang)) {
    const fr = parse(row[`${field}_fr`]);
    if (fr.length > 0) return fr;
    const base = parse(row[field]);
    // Keep language-neutral entries only (avoid Arabic leaking into FR).
    const neutral = base.filter((item) => !hasArabic(typeof item === "string" ? item : JSON.stringify(item)));
    return neutral.length === base.length ? base : [];
  }
  return parse(row[field]);
}

/** Locale tag used for Intl formatting. */
export function intlLocale(lang: string | undefined): string {
  return isFrench(lang) ? "fr-FR" : "ar-TN";
}

/** dd/mm/yyyy in French, Arabic long date in Arabic. */
export function formatDate(value: string | Date | null | undefined, lang: string): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isFrench(lang)) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat("ar-TN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Long, human date ("12 mars 2026" / Arabic long form). */
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

/** Grouped number: 4 050 in French, Arabic grouping in Arabic. */
export function formatNumber(value: number | string | null | undefined, lang: string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) return "";
  return new Intl.NumberFormat(isFrench(lang) ? "fr-FR" : "ar-TN-u-nu-latn", {
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
  const { i18n } = useTranslation();
  const lang = (i18n.language || "ar").split("-")[0] as SupportedLanguage;

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
    isFr: isFrench(lang),
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
