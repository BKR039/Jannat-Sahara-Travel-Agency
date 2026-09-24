/**
 * Jannat Sahara — Privacy & Cookie Consent Model.
 *
 * Implements deterministic, versioned, client-safe consent storage and eventing.
 *
 * Categories:
 * - necessary: Strictly necessary for website operation, authentication, theme, language,
 *   and booking draft state. Always true and cannot be disabled.
 * - analytics: Performance and UX metrics. Default: false.
 * - marketing: Advertising and conversion tracking (specifically Meta Pixel). Default: false.
 */

export const CONSENT_STORAGE_KEY = "janat-sahara-privacy-consent" as const;
export const CONSENT_EVENT_NAME = "janat-sahara-consent-change" as const;
export const CURRENT_CONSENT_VERSION = 1 as const;

export interface ConsentPreferences {
  version: 1;
  timestamp: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

/** Reads stored consent from localStorage with safety checks and version migration. */
export function getStoredConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === CURRENT_CONSENT_VERSION && parsed.necessary === true) {
      return {
        version: CURRENT_CONSENT_VERSION,
        timestamp:
          typeof parsed.timestamp === "string" ? parsed.timestamp : new Date().toISOString(),
        necessary: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
      };
    }
  } catch (err) {
    console.warn("[privacy-consent] Failed to parse stored consent", err);
  }
  return null;
}

/** Saves user consent preferences to localStorage and broadcasts the update. */
export function saveStoredConsent(prefs: {
  analytics: boolean;
  marketing: boolean;
}): ConsentPreferences {
  const consent: ConsentPreferences = {
    version: CURRENT_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    necessary: true,
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, { detail: consent }));
    } catch (err) {
      console.error("[privacy-consent] Failed to save consent preferences", err);
    }
  }

  return consent;
}

export const WELCOME_DISMISSED_STORAGE_KEY = "janat-sahara-welcome-dismissed" as const;

/** Checks if the first-visit welcome modal has already been seen/dismissed by the visitor. */
export function isWelcomeDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(WELCOME_DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Marks the first-visit welcome modal as dismissed. */
export function dismissWelcome(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WELCOME_DISMISSED_STORAGE_KEY, "true");
  } catch (err) {
    console.warn("[privacy-consent] Failed to save welcome dismissed state", err);
  }
}
