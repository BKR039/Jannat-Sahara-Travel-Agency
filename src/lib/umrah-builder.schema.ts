import { z } from "zod";

/**
 * Custom Umrah package builder — shared contract between the public builder UI,
 * the submission server function and the admin workspace.
 *
 * Option values are stable codes (never user-facing strings); every label comes
 * from i18n (`umrahBuilder.*`) so the feature respects AR / FR / EN.
 */

export const MAKKAH_AREAS = [
  "haram_close",
  "central",
  "ibrahim_khalil",
  "ajyad",
  "suggest",
] as const;
export const MADINAH_AREAS = ["very_close", "close", "value", "suggest"] as const;
export const BUDGET_LEVELS = ["economy", "standard", "premium", "luxury"] as const;
export const ROOM_TYPES = ["double", "triple", "quadruple", "family", "flexible"] as const;
export const CONTACT_PREFERENCES = ["whatsapp", "phone", "email"] as const;

export const CUSTOM_REQUEST_STATUSES = [
  "new",
  "reviewing",
  "offer_preparing",
  "contacted",
  "confirmed",
  "cancelled",
] as const;

export type MakkahArea = (typeof MAKKAH_AREAS)[number];
export type MadinahArea = (typeof MADINAH_AREAS)[number];
export type BudgetLevel = (typeof BUDGET_LEVELS)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

/* ------------------------------------------------------------ travel limits */

/** Application limits. The counters and the server share these — one source. */
export const TRAVELLER_LIMITS = {
  adults: { min: 1, max: 30 },
  children: { min: 0, max: 30 },
  infants: { min: 0, max: 30 },
} as const;

export const NIGHTS_LIMITS = { min: 0, max: 60 } as const;

/** How far ahead a request may be made. Beyond this it is not actionable. */
export const MAX_TRIP_HORIZON_DAYS = 730;

/* -------------------------------------------------------------- date helpers */

/**
 * True only for a real calendar date in `YYYY-MM-DD` form.
 * The regex alone accepts impossible dates (`2026-02-30`), and the `Date`
 * constructor silently rolls them over, so the parts are compared back.
 */
export function isRealISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today in UTC as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` offset by whole days, in UTC. */
function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Earliest acceptable departure. One day of slack absorbs the timezone gap
 * between a traveller's local "today" and the server's UTC day.
 */
export function earliestDepartureISO(now: Date = new Date()): string {
  return shiftISO(todayISO(now), -1);
}

/** Latest acceptable departure. */
export function latestDepartureISO(now: Date = new Date()): string {
  return shiftISO(todayISO(now), MAX_TRIP_HORIZON_DAYS);
}

const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine(isRealISODate, "Invalid date");

const OPTIONAL_TEXT = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** Rejects NaN, Infinity, decimals and out-of-range values in one place. */
const COUNT = (min: number, max: number) =>
  z.number().refine(Number.isFinite, "Must be a finite number").int().min(min).max(max);

export const CustomPackageRequestInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .min(6)
      .max(32)
      .regex(/^[+()\d\s-]+$/, "Invalid phone number"),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    whatsapp: z
      .string()
      .trim()
      .max(32)
      .regex(/^[+()\d\s-]*$/, "Invalid phone number")
      .optional()
      .or(z.literal("")),
    contactPreference: z.enum(CONTACT_PREFERENCES).optional().or(z.literal("")),
    locale: z.enum(["ar", "fr", "en"]).optional(),

    departureDate: DATE,
    returnDate: DATE,

    departureAirport: OPTIONAL_TEXT(120),
    returnAirport: OPTIONAL_TEXT(120),
    airportFlexible: z.boolean().default(false),

    makkahNights: COUNT(NIGHTS_LIMITS.min, NIGHTS_LIMITS.max),
    makkahHotelId: z.string().uuid().nullable().optional(),
    makkahHotelName: OPTIONAL_TEXT(200),
    makkahArea: z.enum(MAKKAH_AREAS).optional().or(z.literal("")),
    makkahPreference: z.enum(BUDGET_LEVELS).optional().or(z.literal("")),

    madinahNights: COUNT(NIGHTS_LIMITS.min, NIGHTS_LIMITS.max),
    madinahHotelId: z.string().uuid().nullable().optional(),
    madinahHotelName: OPTIONAL_TEXT(200),
    madinahArea: z.enum(MADINAH_AREAS).optional().or(z.literal("")),
    madinahPreference: z.enum(BUDGET_LEVELS).optional().or(z.literal("")),

    adults: COUNT(TRAVELLER_LIMITS.adults.min, TRAVELLER_LIMITS.adults.max),
    children: COUNT(TRAVELLER_LIMITS.children.min, TRAVELLER_LIMITS.children.max),
    infants: COUNT(TRAVELLER_LIMITS.infants.min, TRAVELLER_LIMITS.infants.max),

    roomType: z.enum(ROOM_TYPES).optional().or(z.literal("")),
    notes: OPTIONAL_TEXT(2000),
  })
  // Strictly after: a same-day return is a zero-night trip, which cannot hold
  // any stay. The minimum stay is one night.
  .refine((v) => v.returnDate > v.departureDate, {
    message: "The stay must be at least one night",
    path: ["returnDate"],
  })
  .refine((v) => v.departureDate >= earliestDepartureISO(), {
    message: "Departure date cannot be in the past",
    path: ["departureDate"],
  })
  .refine((v) => v.departureDate <= latestDepartureISO(), {
    message: "Departure date is too far in the future",
    path: ["departureDate"],
  })
  .refine((v) => v.makkahNights + v.madinahNights >= 1, {
    message: "At least one night is required",
    path: ["makkahNights"],
  });

export type CustomPackageRequestInputType = z.input<typeof CustomPackageRequestInput>;
