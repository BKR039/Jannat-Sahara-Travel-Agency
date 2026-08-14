import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";
import en from "@/locales/en/common.json";

export const SUPPORTED_LANGUAGES = ["ar", "fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

/** Storage key used to persist the visitor's language across reloads. */
export const LANG_STORAGE_KEY = "janat-sahara-lang";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ar: { common: ar },
        fr: { common: fr },
        en: { common: en },
      },
      fallbackLng: "ar",
      supportedLngs: SUPPORTED_LANGUAGES,
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      defaultNS: "common",
      ns: ["common"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "htmlTag", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: LANG_STORAGE_KEY,
      },
    });
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
