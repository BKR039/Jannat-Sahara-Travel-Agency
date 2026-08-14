import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { dirFor, normalizeLang } from "@/lib/i18n";

/**
 * Single global source of truth for the active locale: keeps <html lang> and
 * <html dir> in sync with i18next. Arabic is RTL, French and English are LTR.
 * No component may decide its own language — everything reads i18next.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = normalizeLang(i18n.language);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dirFor(lang);
    }
  }, [i18n.language]);

  return <>{children}</>;
}
