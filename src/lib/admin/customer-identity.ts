/**
 * The canonical customer identity of this CRM.
 *
 * There is no `customers` / `clients` table in this schema. A customer is a
 * derived entity: the agency's records (bookings, flight requests, contact
 * messages and custom Umrah requests) are grouped by a deterministic key built
 * from the contact details the person actually gave. That key is already a
 * first-class value in the database — `customer_notes.customer_key` stores it —
 * so this module makes the existing rule explicit and shared instead of hiding
 * it inside one aggregation function.
 *
 * Matching rules, in order:
 *
 *   1. `p:<last 8 digits>`  — a phone number with at least 6 usable characters.
 *      Only digits and `+` survive normalization, so `+216 55 123 456`,
 *      `0021655123456` and `55 123 456` all resolve to the same customer.
 *   2. `e:<lowercased email>` — when there is no usable phone.
 *   3. `x:<row identity>`   — neither is usable. This is intentionally a key of
 *      one: the record keeps its own identity rather than being merged into a
 *      stranger's profile.
 *
 * A name is NEVER part of the key. Two different people share a name far more
 * often than they share a phone number, and merging them would leak one
 * customer's history into another's profile.
 *
 * Normalization exists only for matching. Nothing here rewrites what the
 * customer typed — the original phone and email are still what the admin sees
 * and what the agency dials.
 */

/** Digits and a leading `+` only — formatting, spaces and separators are noise. */
export function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9+]/g, "");
}

/** Case and surrounding whitespace never distinguish two email addresses. */
export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Below this, a "phone number" is a typo, not an identity. */
export const MIN_PHONE_LENGTH = 6;

/** How much of the number is compared — enough to ignore country-code format. */
export const PHONE_KEY_DIGITS = 8;

/** Matches `customer_notes.customer_key`, which is `text` with no length cap. */
export const CUSTOMER_KEY_MAX = 200;

/**
 * Resolve the customer this record belongs to.
 *
 * @param fallback identity used when no contact detail is usable — the row id
 *                 for stored records, the request reference at submission time.
 */
export function customerKey(
  phone: string | null | undefined,
  email: string | null | undefined,
  fallback: string,
): string {
  const p = normalizePhone(phone);
  if (p.length >= MIN_PHONE_LENGTH) return `p:${p.slice(-PHONE_KEY_DIGITS)}`;
  const e = normalizeEmail(email);
  if (e) return `e:${e}`;
  return `x:${fallback}`;
}

/** True when the key came from real contact details rather than the fallback. */
export function isResolvedKey(key: string | null | undefined): boolean {
  return typeof key === "string" && (key.startsWith("p:") || key.startsWith("e:"));
}

/** Which detail produced the key — shown in the admin so the match is explainable. */
export function keySource(key: string | null | undefined): "phone" | "email" | "unlinked" {
  if (typeof key !== "string") return "unlinked";
  if (key.startsWith("p:")) return "phone";
  if (key.startsWith("e:")) return "email";
  return "unlinked";
}
