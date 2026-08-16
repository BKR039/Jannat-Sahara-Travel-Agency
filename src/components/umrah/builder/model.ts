import type {
  BudgetLevel,
  ContactPreference,
  MadinahArea,
  MakkahArea,
  RoomType,
} from "@/lib/umrah-builder.schema";

/** Client-side state of the custom Umrah package builder. */
export interface BuilderState {
  departureDate: string;
  returnDate: string;
  departureAirport: string;
  returnAirport: string;
  airportFlexible: boolean;
  makkahNights: number;
  makkahMode: "hotel" | "area" | "";
  makkahHotelId: string | null;
  makkahHotelName: string;
  makkahArea: MakkahArea | "";
  makkahPreference: BudgetLevel | "";
  madinahNights: number;
  madinahMode: "hotel" | "area" | "";
  madinahHotelId: string | null;
  madinahHotelName: string;
  madinahArea: MadinahArea | "";
  madinahPreference: BudgetLevel | "";
  adults: number;
  children: number;
  infants: number;
  roomType: RoomType | "";
  notes: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  contactPreference: ContactPreference | "";
}

export const INITIAL_STATE: BuilderState = {
  departureDate: "",
  returnDate: "",
  departureAirport: "",
  returnAirport: "",
  airportFlexible: false,
  makkahNights: 5,
  makkahMode: "",
  makkahHotelId: null,
  makkahHotelName: "",
  makkahArea: "",
  makkahPreference: "",
  madinahNights: 4,
  madinahMode: "",
  madinahHotelId: null,
  madinahHotelName: "",
  madinahArea: "",
  madinahPreference: "",
  adults: 2,
  children: 0,
  infants: 0,
  roomType: "",
  notes: "",
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  contactPreference: "whatsapp",
};

export const BUILDER_STEPS = [
  "dates",
  "flights",
  "travellers",
  "makkah",
  "madinah",
  "room",
  "contact",
] as const;
export type BuilderStep = (typeof BUILDER_STEPS)[number];

const STORAGE_KEY = "janat-umrah-builder-draft";

/** Persist the in-progress configuration so a refresh never loses the work. */
export function loadDraft(): BuilderState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BuilderState>;
    return { ...INITIAL_STATE, ...parsed };
  } catch {
    return null;
  }
}

export function saveDraft(state: BuilderState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Inclusive trip length in days ("10 days" for 15 → 25 September). */
export function tripDays(from: string, to: string): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b) return 0;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff >= 0 ? diff + 1 : 0;
}

export function travellersTotal(state: BuilderState): number {
  return state.adults + state.children + state.infants;
}

/** Which steps are complete enough to continue. */
export function stepValid(step: BuilderStep, state: BuilderState): boolean {
  switch (step) {
    case "dates":
      return !!state.departureDate && !!state.returnDate && state.returnDate >= state.departureDate;
    case "flights":
      return state.airportFlexible || (!!state.departureAirport && !!state.returnAirport);
    case "makkah":
      if (state.makkahNights === 0) return true;
      if (state.makkahMode === "hotel") return !!state.makkahHotelId;
      if (state.makkahMode === "area")
        return !!state.makkahArea && (state.makkahArea !== "suggest" || !!state.makkahPreference);
      return false;
    case "madinah":
      if (state.madinahNights === 0) return true;
      if (state.madinahMode === "hotel") return !!state.madinahHotelId;
      if (state.madinahMode === "area")
        return !!state.madinahArea && (state.madinahArea !== "suggest" || !!state.madinahPreference);
      return false;
    case "travellers":
      return state.adults >= 1;
    case "room":
      return !!state.roomType && state.makkahNights + state.madinahNights >= 1;
    case "contact":
      return (
        state.name.trim().length >= 2 &&
        !!state.contactPreference &&
        /^[+()\d\s-]{6,32}$/.test(state.phone.trim()) &&
        (!state.email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(state.email.trim()))
      );
  }
}

/**
 * WhatsApp hand-off message built from the actual configuration.
 * All labels come from i18n so the message follows the visitor's language.
 */
export function buildWhatsAppMessage(
  state: BuilderState,
  t: (key: string, options?: Record<string, unknown>) => string,
  fmt: { date: (v: string) => string; area: (v: string) => string; budget: (v: string) => string },
): string {
  const lines: string[] = [t("umrahBuilder.whatsapp.intro"), ""];

  lines.push(`${t("umrahBuilder.summary.dates")}:`);
  lines.push(`${fmt.date(state.departureDate)} → ${fmt.date(state.returnDate)}`);
  lines.push("");

  lines.push(`${t("umrahBuilder.summary.flights")}:`);
  if (state.airportFlexible) lines.push(t("umrahBuilder.flights.flexible"));
  else lines.push(`${state.departureAirport} → ${state.returnAirport}`);
  lines.push("");

  const place = (
    label: string,
    nights: number,
    hotel: string,
    area: string,
    budget: string,
  ) => {
    if (nights === 0) return;
    lines.push(`${label}:`);
    lines.push(t("umrahBuilder.summary.nightsCount", { count: nights }));
    if (hotel) lines.push(`${t("umrahBuilder.summary.hotel")}: ${hotel}`);
    else if (area) lines.push(`${t("umrahBuilder.summary.area")}: ${fmt.area(area)}`);
    if (budget) lines.push(`${t("umrahBuilder.summary.budget")}: ${fmt.budget(budget)}`);
    lines.push("");
  };

  place(
    t("umrahBuilder.summary.makkah"),
    state.makkahNights,
    state.makkahHotelName,
    state.makkahArea,
    state.makkahPreference,
  );
  place(
    t("umrahBuilder.summary.madinah"),
    state.madinahNights,
    state.madinahHotelName,
    state.madinahArea,
    state.madinahPreference,
  );

  lines.push(`${t("umrahBuilder.summary.travellers")}:`);
  lines.push(t("umrahBuilder.summary.adultsCount", { count: state.adults }));
  if (state.children) lines.push(t("umrahBuilder.summary.childrenCount", { count: state.children }));
  if (state.infants) lines.push(t("umrahBuilder.summary.infantsCount", { count: state.infants }));

  if (state.roomType) {
    lines.push("");
    lines.push(`${t("umrahBuilder.summary.room")}: ${t(`umrahBuilder.room.types.${state.roomType}`)}`);
  }

  if (state.notes.trim()) {
    lines.push("");
    lines.push(`${t("umrahBuilder.summary.notes")}: ${state.notes.trim()}`);
  }

  if (state.name.trim()) {
    lines.push("");
    lines.push(`${t("umrahBuilder.contact.name")}: ${state.name.trim()}`);
    if (state.phone.trim()) lines.push(`${t("umrahBuilder.contact.phone")}: ${state.phone.trim()}`);
  }

  return lines.join("\n");
}
