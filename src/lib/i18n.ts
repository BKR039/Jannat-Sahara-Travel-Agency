import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";

export const SUPPORTED_LANGUAGES = ["ar", "fr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ar: { common: ar },
        fr: { common: fr },
      },
      fallbackLng: "ar",
      supportedLngs: SUPPORTED_LANGUAGES,
      defaultNS: "common",
      ns: ["common"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "htmlTag", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "janat-sahara-lang",
      },
    });
}

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}

export default i18n;
