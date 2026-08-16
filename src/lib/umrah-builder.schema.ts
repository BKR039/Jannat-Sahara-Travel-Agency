import { z } from "zod";

/**
 * Custom Umrah package builder — shared contract between the public builder UI,
 * the submission server function and the admin workspace.
 *
 * Option values are stable codes (never user-facing strings); every label comes
 * from i18n (`umrahBuilder.*`) so the feature respects AR / FR / EN.
 */

export const MAKKAH_AREAS = ["haram_close", "central", "ibrahim_khalil", "ajyad", "suggest"] as const;
export const MADINAH_AREAS = ["very_close", "close", "value", "suggest"] as const;
export const BUDGET_LEVELS = ["economy", "standard", "premium", "luxury"] as const;

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
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const OPTIONAL_TEXT = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

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
    locale: z.enum(["ar", "fr", "en"]).optional(),

    departureDate: DATE,
    returnDate: DATE,

    departureAirport: OPTIONAL_TEXT(120),
    returnAirport: OPTIONAL_TEXT(120),
    airportFlexible: z.boolean().default(false),

    makkahNights: z.number().int().min(0).max(60),
    makkahHotelId: z.string().uuid().nullable().optional(),
    makkahHotelName: OPTIONAL_TEXT(200),
    makkahArea: z.enum(MAKKAH_AREAS).optional().or(z.literal("")),
    makkahPreference: z.enum(BUDGET_LEVELS).optional().or(z.literal("")),

    madinahNights: z.number().int().min(0).max(60),
    madinahHotelId: z.string().uuid().nullable().optional(),
    madinahHotelName: OPTIONAL_TEXT(200),
    madinahArea: z.enum(MADINAH_AREAS).optional().or(z.literal("")),
    madinahPreference: z.enum(BUDGET_LEVELS).optional().or(z.literal("")),

    adults: z.number().int().min(1).max(30),
    children: z.number().int().min(0).max(30),
    infants: z.number().int().min(0).max(30),

    notes: OPTIONAL_TEXT(2000),
  })
  .refine((v) => v.returnDate >= v.departureDate, {
    message: "Return date must be after the departure date",
    path: ["returnDate"],
  })
  .refine((v) => v.makkahNights + v.madinahNights >= 1, {
    message: "At least one night is required",
    path: ["makkahNights"],
  });

export type CustomPackageRequestInputType = z.input<typeof CustomPackageRequestInput>;
