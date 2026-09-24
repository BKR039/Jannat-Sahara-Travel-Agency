import { createContext, useContext } from "react";
import type { ConsentPreferences } from "@/lib/privacy-consent";

export interface PrivacyConsentContextType {
  consent: ConsentPreferences | null;
  hasConsented: boolean;
  isWelcomeOpen: boolean;
  isCookiePanelOpen: boolean;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  openCookiePanel: () => void;
  closeCookiePanel: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  saveCustomPreferences: (prefs: { analytics: boolean; marketing: boolean }) => void;
}

export const PrivacyConsentContext = createContext<PrivacyConsentContextType | null>(null);

const fallbackPrivacyConsent: PrivacyConsentContextType = {
  consent: null,
  hasConsented: true,
  isWelcomeOpen: false,
  isCookiePanelOpen: false,
  isSettingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
  openWelcome: () => {},
  closeWelcome: () => {},
  openCookiePanel: () => {},
  closeCookiePanel: () => {},
  acceptAll: () => {},
  rejectOptional: () => {},
  saveCustomPreferences: () => {},
};

export function usePrivacyConsent(): PrivacyConsentContextType {
  const ctx = useContext(PrivacyConsentContext);
  return ctx ?? fallbackPrivacyConsent;
}
