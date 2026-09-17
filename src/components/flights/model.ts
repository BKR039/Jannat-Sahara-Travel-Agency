import type { CABIN_CLASSES } from "@/lib/flight-request.schema";

/**
 * The flight request as the page holds it while it is being built.
 *
 * Mirrors `FlightRequestInput` one-to-one — this is the same shape the server
 * function already validates, kept in its own module only so the composition
 * and the summary can share the type without importing each other.
 */
export type Draft = {
  name: string;
  phone: string;
  email: string;
  fromAirport: string;
  toAirport: string;
  tripType: "one_way" | "round_trip";
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: (typeof CABIN_CLASSES)[number];
  notes: string;
};

export const EMPTY_DRAFT: Draft = {
  name: "",
  phone: "",
  email: "",
  fromAirport: "",
  toAirport: "",
  tripType: "round_trip",
  departureDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "economy",
  notes: "",
};
