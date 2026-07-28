import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { isRtl } from "@/lib/i18n";

/**
 * Keeps <html lang> and <html dir> in sync with the active i18next language.
 * Arabic is the default and RTL-first.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language || "ar";
    const dir = isRtl(lang) ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [i18n.language]);

  return <>{children}</>;
}
