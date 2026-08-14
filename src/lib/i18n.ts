import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";
import en from "@/locales/en/common.json";

import arShell from "@/locales/ar/adminShell.json";
import frShell from "@/locales/fr/adminShell.json";
import enShell from "@/locales/en/adminShell.json";

import arOps from "@/locales/ar/adminOps.json";
import frOps from "@/locales/fr/adminOps.json";
import enOps from "@/locales/en/adminOps.json";

import arContent from "@/locales/ar/adminContent.json";
import frContent from "@/locales/fr/adminContent.json";
import enContent from "@/locales/en/adminContent.json";

export const SUPPORTED_LANGUAGES = ["ar", "fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

/** Storage key used to persist the visitor's language across reloads. */
export const LANG_STORAGE_KEY = "janat-sahara-lang";

/** Default locale: Arabic is always the initial render language (server + client). */
export const DEFAULT_LANGUAGE: SupportedLanguage = "ar";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ar: { common: ar, admin: { ...arShell, ...arOps, ...arContent } },
      fr: { common: fr, admin: { ...frShell, ...frOps, ...frContent } },
      en: { common: en, admin: { ...enShell, ...enOps, ...enContent } },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    defaultNS: "common",
    ns: ["common", "admin"],
    interpolation: { escapeValue: false },
  });
}

/** Read the visitor's saved language choice (browser only). */
export function readStoredLang(): SupportedLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (!raw) return null;
    const base = raw.split("-")[0];
    return SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)
      ? (base as SupportedLanguage)
      : null;
  } catch {
    return null;
  }
}

/** Persist the visitor's language choice. */
export function storeLang(lang: SupportedLanguage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

/** Normalize any language tag ("fr-FR", "en-GB") to a supported locale. */
export function normalizeLang(lang: string | undefined | null): SupportedLanguage {
  const base = (lang ?? "ar").split("-")[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : "ar";
}

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(normalizeLang(lang));
}

export function dirFor(lang: string): "rtl" | "ltr" {
  return isRtl(lang) ? "rtl" : "ltr";
}

export default i18n;
