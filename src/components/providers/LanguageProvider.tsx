import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { dirFor, normalizeLang, readStoredLang, storeLang } from "@/lib/i18n";

/**
 * Single global source of truth for the active locale. Arabic is the default
 * language for the first render (server and client alike, so hydration always
 * matches); a previously saved visitor choice is applied right after mount.
 * Keeps <html lang> and <html dir> in sync with i18next.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  // Apply the persisted preference after hydration only.
  useEffect(() => {
    const stored = readStoredLang();
    if (stored && stored !== normalizeLang(i18n.language)) {
      void i18n.changeLanguage(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lang = normalizeLang(i18n.language);
    storeLang(lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dirFor(lang);
    }
  }, [i18n.language]);

  return <>{children}</>;
}
