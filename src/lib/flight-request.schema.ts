import { z } from "zod";

export const CABIN_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
export const TRIP_TYPES = ["one_way", "round_trip"] as const;
export const FLIGHT_REQUEST_STATUSES = [
  "new",
  "contacted",
  "waiting",
  "quoted",
  "confirmed",
  "cancelled",
] as const;

export type CabinClass = (typeof CABIN_CLASSES)[number];

// Display labels are NOT stored here. This module holds stable wire values only;
// the visible label is resolved through i18n in ./flight-request.labels.

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const FlightRequestInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .min(6)
      .max(32)
      .regex(/^[+()\d\s-]+$/, "Invalid phone number"),
    email: z.string().trim().email().max(254),
    fromAirport: z.string().trim().min(2).max(120),
    toAirport: z.string().trim().min(2).max(120),
    tripType: z.enum(TRIP_TYPES),
    departureDate: DATE,
    returnDate: DATE.optional().or(z.literal("")),
    adults: z.number().int().min(1).max(20),
    children: z.number().int().min(0).max(20),
    infants: z.number().int().min(0).max(20),
    cabinClass: z.enum(CABIN_CLASSES),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    /** Language the visitor used when submitting (ar | fr | en). */
    locale: z.enum(["ar", "fr", "en"]).optional(),
  })
  .refine((v) => v.tripType !== "round_trip" || !!v.returnDate, {
    message: "Return date is required for round trips",
    path: ["returnDate"],
  })
  .refine((v) => !v.returnDate || v.returnDate >= v.departureDate, {
    message: "Return date must be after the departure date",
    path: ["returnDate"],
  });

export type FlightRequestInputType = z.infer<typeof FlightRequestInput>;
