import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CONSENT_EVENT_NAME,
  getStoredConsent,
  saveStoredConsent,
  isWelcomeDismissed,
  dismissWelcome,
  type ConsentPreferences,
} from "@/lib/privacy-consent";
import { initMetaPixel, grantMetaPixelConsent, revokeMetaPixelConsent } from "@/lib/meta-pixel";
import { PrivacyConsentContext } from "./privacy-context";

export function PrivacyConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(true); // default true on server to avoid flash
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isCookiePanelOpen, setIsCookiePanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Synchronize consent state and enforce tracking on client mount
  useEffect(() => {
    // 1. Check Cookie Consent
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
      setHasConsented(true);
      setIsCookiePanelOpen(false);
      if (stored.marketing) {
        initMetaPixel();
      }
    } else {
      setConsent(null);
      setHasConsented(false);
      setIsCookiePanelOpen(true);
    }

    // 2. Check Welcome Modal dismissal (independent from cookie consent)
    const welcomeSeen = isWelcomeDismissed();
    if (!welcomeSeen) {
      setIsWelcomeOpen(true);
    }

    // 3. React to consent broadcast changes
    const handleConsentChange = (e: Event) => {
      const customEvent = e as CustomEvent<ConsentPreferences>;
      if (customEvent.detail) {
        setConsent(customEvent.detail);
        setHasConsented(true);
        setIsCookiePanelOpen(false);
        if (customEvent.detail.marketing) {
          initMetaPixel();
          grantMetaPixelConsent();
        } else {
          revokeMetaPixelConsent();
        }
      }
    };

    window.addEventListener(CONSENT_EVENT_NAME, handleConsentChange);
    return () => {
      window.removeEventListener(CONSENT_EVENT_NAME, handleConsentChange);
    };
  }, []);

  const acceptAll = useCallback(() => {
    const updated = saveStoredConsent({ analytics: true, marketing: true });
    setConsent(updated);
    setHasConsented(true);
    setIsCookiePanelOpen(false);
    setIsSettingsOpen(false);
    initMetaPixel();
    grantMetaPixelConsent();
  }, []);

  const rejectOptional = useCallback(() => {
    const updated = saveStoredConsent({ analytics: false, marketing: false });
    setConsent(updated);
    setHasConsented(true);
    setIsCookiePanelOpen(false);
    setIsSettingsOpen(false);
    revokeMetaPixelConsent();
  }, []);

  const saveCustomPreferences = useCallback((prefs: { analytics: boolean; marketing: boolean }) => {
    const updated = saveStoredConsent(prefs);
    setConsent(updated);
    setHasConsented(true);
    setIsCookiePanelOpen(false);
    setIsSettingsOpen(false);
    if (updated.marketing) {
      initMetaPixel();
      grantMetaPixelConsent();
    } else {
      revokeMetaPixelConsent();
    }
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const openWelcome = useCallback(() => {
    setIsWelcomeOpen(true);
  }, []);

  const closeWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
    dismissWelcome();
  }, []);

  const openCookiePanel = useCallback(() => {
    setIsCookiePanelOpen(true);
  }, []);

  const closeCookiePanel = useCallback(() => {
    setIsCookiePanelOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      consent,
      hasConsented,
      isWelcomeOpen,
      isCookiePanelOpen,
      isSettingsOpen,
      openSettings,
      closeSettings,
      openWelcome,
      closeWelcome,
      openCookiePanel,
      closeCookiePanel,
      acceptAll,
      rejectOptional,
      saveCustomPreferences,
    }),
    [
      consent,
      hasConsented,
      isWelcomeOpen,
      isCookiePanelOpen,
      isSettingsOpen,
      openSettings,
      closeSettings,
      openWelcome,
      closeWelcome,
      openCookiePanel,
      closeCookiePanel,
      acceptAll,
      rejectOptional,
      saveCustomPreferences,
    ],
  );

  return <PrivacyConsentContext.Provider value={value}>{children}</PrivacyConsentContext.Provider>;
}
