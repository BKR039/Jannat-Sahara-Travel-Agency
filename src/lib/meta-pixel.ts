/**
 * Meta Pixel (Facebook Pixel) TypeScript Definitions & Safe Helpers.
 * Pixel ID: 686261157163328
 *
 * Gated strictly by user consent (Marketing category).
 * The script is NOT injected until explicit consent is given.
 */

export const META_PIXEL_ID = "686261157163328" as const;

export type StandardEventName =
  | "AddPaymentInfo"
  | "AddToCart"
  | "AddToWishlist"
  | "CompleteRegistration"
  | "Contact"
  | "CustomizeProduct"
  | "Donate"
  | "FindLocation"
  | "InitiateCheckout"
  | "Lead"
  | "PageView"
  | "Purchase"
  | "Schedule"
  | "Search"
  | "StartTrial"
  | "SubmitApplication"
  | "Subscribe"
  | "ViewContent";

export interface FbqFunction {
  (command: "init", pixelId: string, userData?: Record<string, unknown>): void;
  (
    command: "track",
    eventName: StandardEventName | (string & {}),
    parameters?: Record<string, unknown>,
  ): void;
  (command: "trackCustom", eventName: string, parameters?: Record<string, unknown>): void;
  (command: "consent", action: "grant" | "revoke"): void;
  (command: string, ...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
}

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

let isInitialized = false;

/**
 * Dynamically and safely initializes the Meta Pixel script once marketing consent is granted.
 * Idempotent: safe to call multiple times, will only execute once.
 */
export function initMetaPixel(): void {
  if (typeof window === "undefined" || isInitialized) return;

  if (window.fbq) {
    isInitialized = true;
    grantMetaPixelConsent();
    return;
  }

  try {
    const win = window;
    const doc = document;

    if (!win.fbq) {
      const fbq: FbqFunction = (...args: unknown[]) => {
        if (fbq.callMethod) {
          fbq.callMethod(...args);
        } else {
          fbq.queue = fbq.queue || [];
          fbq.queue.push(args);
        }
      };
      if (!win._fbq) win._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      win.fbq = fbq;

      const script = doc.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      const firstScript = doc.getElementsByTagName("script")[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        doc.head.appendChild(script);
      }
    }

    win.fbq("consent", "grant");
    win.fbq("init", META_PIXEL_ID);
    win.fbq("track", "PageView");
    isInitialized = true;
  } catch (err) {
    console.error("[meta-pixel] Failed to initialize Meta Pixel", err);
  }
}

/** Informs the Meta Pixel that consent has been revoked by the user. */
export function revokeMetaPixelConsent(): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      window.fbq("consent", "revoke");
    } catch (err) {
      console.warn("[meta-pixel] Error revoking consent", err);
    }
  }
}

/** Informs the Meta Pixel that consent has been granted by the user. */
export function grantMetaPixelConsent(): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      window.fbq("consent", "grant");
    } catch (err) {
      console.warn("[meta-pixel] Error granting consent", err);
    }
  }
}

/** Type-safe helper to track standard Meta Pixel events if fbq is initialized. */
export function trackMetaEvent(
  eventName: StandardEventName,
  parameters?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function" && isInitialized) {
    window.fbq("track", eventName, parameters);
  }
}

/** Type-safe helper to track custom Meta Pixel events if fbq is initialized. */
export function trackCustomMetaEvent(
  eventName: string,
  parameters?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function" && isInitialized) {
    window.fbq("trackCustom", eventName, parameters);
  }
}
