/**
 * Meta Pixel (Facebook Pixel) TypeScript Definitions & Safe Helpers.
 * Pixel ID: 686261157163328
 *
 * Base script is installed in `src/routes/__root.tsx` within the document <head>.
 * Custom events (Lead, Contact, Purchase, etc.) are deliberately not implemented yet
 * per initial verification phase.
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
  (command: string, ...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
}

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

/**
 * Type-safe helper to track standard Meta Pixel events if fbq is initialized.
 */
export function trackMetaEvent(
  eventName: StandardEventName,
  parameters?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", eventName, parameters);
  }
}

/**
 * Type-safe helper to track custom Meta Pixel events if fbq is initialized.
 */
export function trackCustomMetaEvent(
  eventName: string,
  parameters?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, parameters);
  }
}
