import type { Package } from "@/lib/queries";

export type ServiceKey = "umrah" | "trip" | "flight" | "visa";
export type PaxType = "adult" | "child" | "infant";

export interface Passenger {
  id: string;
  type: PaxType;
  fullName: string;
  passportNumber: string;
  nationality: string;
  gender: string;
  dateOfBirth: string;
  passportExpiry: string;
  phone: string;
  email: string;
  emergencyContact: string;
  notes: string;
  passportPath: string | null;
  passportName: string | null;
}

export interface Counts {
  adults: number;
  children: number;
  infants: number;
}

export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyPassenger(type: PaxType): Passenger {
  return {
    id: randomId(),
    type,
    fullName: "",
    passportNumber: "",
    nationality: "",
    gender: "",
    dateOfBirth: "",
    passportExpiry: "",
    phone: "",
    email: "",
    emergencyContact: "",
    notes: "",
    passportPath: null,
    passportName: null,
  };
}

/** Keeps the passenger list in sync with the traveller counts, preserving filled data. */
export function syncPassengers(list: Passenger[], counts: Counts): Passenger[] {
  const out: Passenger[] = [];
  (["adult", "child", "infant"] as PaxType[]).forEach((type) => {
    const needed =
      type === "adult" ? counts.adults : type === "child" ? counts.children : counts.infants;
    const existing = list.filter((p) => p.type === type);
    for (let i = 0; i < needed; i += 1) {
      out.push(existing[i] ?? emptyPassenger(type));
    }
  });
  return out;
}

export function adultPrice(pkg: Package): number {
  const discounted = pkg.discount_price != null ? Number(pkg.discount_price) : null;
  return discounted ?? Number(pkg.price ?? 0);
}

export function childPrice(pkg: Package): number {
  const raw = (pkg as unknown as { child_price?: number | null }).child_price;
  return raw != null ? Number(raw) : adultPrice(pkg);
}

export function infantPrice(pkg: Package): number {
  const raw = (pkg as unknown as { infant_price?: number | null }).infant_price;
  return raw != null ? Number(raw) : 0;
}

export function computeTotal(pkg: Package | null, counts: Counts): number {
  if (!pkg) return 0;
  return (
    adultPrice(pkg) * counts.adults +
    childPrice(pkg) * counts.children +
    infantPrice(pkg) * counts.infants
  );
}

export function money(value: number, currency: string): string {
  return `${Math.round(value).toLocaleString()} ${currency}`;
}

export const MAX_PASSPORT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
