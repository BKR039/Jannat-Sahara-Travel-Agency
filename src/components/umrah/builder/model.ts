import {
  BUDGET_LEVELS,
  CONTACT_PREFERENCES,
  DESTINATION_TIMINGS,
  FLIGHT_PREFERENCES,
  MADINAH_AREAS,
  MAKKAH_AREAS,
  NIGHTS_LIMITS,
  ROOM_TYPES,
  TRAVELLER_LIMITS,
  calculateTotalNights,
  earliestDepartureISO,
  isRealISODate,
  latestDepartureISO,
  type BudgetLevel,
  type ContactPreference,
  type DestinationTiming,
  type FlightPreference,
  type MadinahArea,
  type MakkahArea,
  type RoomType,
} from "@/lib/umrah-builder.schema";

/** Client-side state of the custom Umrah package builder. */
export interface BuilderState {
  departureDate: string;
  returnDate: string;
  departureAirport: string;
  returnAirport: string;
  airportFlexible: boolean;
  flightPreference: FlightPreference | "";
  transitHub: string;
  additionalDestination: string;
  destinationTiming: DestinationTiming | "";
  makkahNights: number;
  makkahMode: "hotel" | "custom_hotel" | "area" | "";
  makkahHotelId: string | null;
  makkahHotelName: string;
  makkahArea: MakkahArea | "";
  makkahPreference: BudgetLevel | "";
  madinahNights: number;
  madinahMode: "hotel" | "custom_hotel" | "area" | "";
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
  packageId?: string | null;
  packageTitle?: string;
  arrivalAirport?: string;
  flightRoute?: string;
  packagePrice?: number;
  packageNotes?: string;
}

export const INITIAL_STATE: BuilderState = {
  packageId: null,
  packageTitle: "",
  arrivalAirport: "",
  flightRoute: "",
  packagePrice: 0,
  packageNotes: "",
  departureDate: "",
  returnDate: "",
  departureAirport: "",
  returnAirport: "",
  airportFlexible: false,
  flightPreference: "direct",
  transitHub: "",
  additionalDestination: "",
  destinationTiming: "after_umrah",
  makkahNights: 7,
  makkahMode: "",
  makkahHotelId: null,
  makkahHotelName: "",
  makkahArea: "",
  makkahPreference: "",
  madinahNights: 5,
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

/**
 * How long an in-progress draft is kept. The draft holds the visitor's contact
 * details, so it is not left in browser storage indefinitely — an abandoned
 * request expires instead of lingering on a shared device.
 */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft {
  savedAt: number;
  state: BuilderState;
}

const clampCount = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

const pickEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | "" =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";

const asString = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";

const asDate = (value: unknown): string =>
  typeof value === "string" && isRealISODate(value) ? value : "";

/**
 * Rebuild a trustworthy state from whatever is in storage.
 *
 * A draft is attacker-editable and can also be stale (an old build's shape, a
 * date that has since passed, a hotel that was removed). Everything is coerced
 * back into range here so restored data can never bypass the same rules a fresh
 * session enforces. Hotel ids are kept as-is but re-checked against the live
 * catalogue by `HotelSelector`.
 */
function sanitizeDraft(raw: unknown): BuilderState {
  const d = (raw ?? {}) as Record<string, unknown>;
  const departureDate = asDate(d["departureDate"]);
  const returnDate = asDate(d["returnDate"]);

  // Drop dates that are no longer bookable rather than restoring an invalid range.
  const earliest = earliestDepartureISO();
  const latest = latestDepartureISO();
  const datesUsable =
    !!departureDate &&
    !!returnDate &&
    returnDate > departureDate &&
    departureDate >= earliest &&
    departureDate <= latest;

  const totalNights = datesUsable ? calculateTotalNights(departureDate, returnDate) : 0;

  const mode = (v: unknown): "hotel" | "custom_hotel" | "area" | "" =>
    v === "hotel" || v === "custom_hotel" || v === "area" ? v : "";
  const hotelId = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

  let rawMakkah = clampCount(
    d["makkahNights"],
    NIGHTS_LIMITS.min,
    NIGHTS_LIMITS.max,
    INITIAL_STATE.makkahNights,
  );
  let rawMadinah = clampCount(
    d["madinahNights"],
    NIGHTS_LIMITS.min,
    NIGHTS_LIMITS.max,
    INITIAL_STATE.madinahNights,
  );

  // If total nights are known, enforce hard constraint on restored draft
  if (totalNights > 0) {
    rawMakkah = Math.min(totalNights, rawMakkah);
    rawMadinah = totalNights - rawMakkah;
  }

  return {
    departureDate: datesUsable ? departureDate : "",
    returnDate: datesUsable ? returnDate : "",
    departureAirport: asString(d["departureAirport"], 120),
    returnAirport: asString(d["returnAirport"], 120),
    airportFlexible: d["airportFlexible"] === true,
    flightPreference: pickEnum(d["flightPreference"], FLIGHT_PREFERENCES) || "direct",
    transitHub: asString(d["transitHub"], 120),
    additionalDestination: asString(d["additionalDestination"], 120),
    destinationTiming: pickEnum(d["destinationTiming"], DESTINATION_TIMINGS) || "after_umrah",
    makkahNights: rawMakkah,
    makkahMode: mode(d["makkahMode"]),
    makkahHotelId: hotelId(d["makkahHotelId"]),
    makkahHotelName: asString(d["makkahHotelName"], 200),
    makkahArea: pickEnum(d["makkahArea"], MAKKAH_AREAS),
    makkahPreference: pickEnum(d["makkahPreference"], BUDGET_LEVELS),
    madinahNights: rawMadinah,
    madinahMode: mode(d["madinahMode"]),
    madinahHotelId: hotelId(d["madinahHotelId"]),
    madinahHotelName: asString(d["madinahHotelName"], 200),
    madinahArea: pickEnum(d["madinahArea"], MADINAH_AREAS),
    madinahPreference: pickEnum(d["madinahPreference"], BUDGET_LEVELS),
    adults: clampCount(
      d["adults"],
      TRAVELLER_LIMITS.adults.min,
      TRAVELLER_LIMITS.adults.max,
      INITIAL_STATE.adults,
    ),
    children: clampCount(
      d["children"],
      TRAVELLER_LIMITS.children.min,
      TRAVELLER_LIMITS.children.max,
      INITIAL_STATE.children,
    ),
    infants: clampCount(
      d["infants"],
      TRAVELLER_LIMITS.infants.min,
      TRAVELLER_LIMITS.infants.max,
      INITIAL_STATE.infants,
    ),
    roomType: pickEnum(d["roomType"], ROOM_TYPES),
    notes: asString(d["notes"], 2000),
    name: asString(d["name"], 120),
    phone: asString(d["phone"], 32),
    whatsapp: asString(d["whatsapp"], 32),
    email: asString(d["email"], 254),
    contactPreference:
      pickEnum(d["contactPreference"], CONTACT_PREFERENCES) || INITIAL_STATE.contactPreference,
  };
}

/** Persist the in-progress configuration so a refresh never loses the work. */
export function loadDraft(): BuilderState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft> & Partial<BuilderState>;

    // Drafts written before the TTL was introduced have no `savedAt`; treat the
    // whole object as the state so an in-progress request is not thrown away.
    const isWrapped = typeof parsed?.savedAt === "number" && !!parsed?.state;
    if (isWrapped && Date.now() - (parsed.savedAt as number) > DRAFT_TTL_MS) {
      clearDraft();
      return null;
    }
    return sanitizeDraft(isWrapped ? parsed.state : parsed);
  } catch {
    return null;
  }
}

export function saveDraft(state: BuilderState) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredDraft = { savedAt: Date.now(), state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
  // `isRealISODate` rejects impossible dates like 2026-02-30, which the Date
  // constructor would otherwise silently roll over into the next month.
  if (!isRealISODate(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
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

/** Total calendar nights for a trip (0 if dates are not set). */
export function totalTripNights(departureDate: string, returnDate: string): number;
export function totalTripNights(
  state: { departureDate?: string; returnDate?: string } | null | undefined,
): number;
export function totalTripNights(
  arg1: string | { departureDate?: string; returnDate?: string } | null | undefined,
  arg2?: string,
): number {
  if (!arg1) return 0;
  if (typeof arg1 === "object") {
    return calculateTotalNights(arg1.departureDate ?? "", arg1.returnDate ?? "");
  }
  return calculateTotalNights(arg1, arg2 ?? "");
}

/**
 * Authoritative night allocation balancer.
 * Ensures makkahNights + madinahNights === totalTripNights at all times.
 */
export function rebalanceNights(
  totalNights: number,
  currentMakkah: number,
  cityChanged: "makkah" | "madinah",
  nextValue: number,
): { makkahNights: number; madinahNights: number } {
  if (totalNights <= 0) {
    const val = Math.max(0, Math.trunc(nextValue));
    return {
      makkahNights: cityChanged === "makkah" ? val : currentMakkah,
      madinahNights: cityChanged === "madinah" ? val : 0,
    };
  }

  const clamped = Math.max(0, Math.min(totalNights, Math.trunc(nextValue)));
  if (cityChanged === "makkah") {
    return {
      makkahNights: clamped,
      madinahNights: totalNights - clamped,
    };
  } else {
    return {
      makkahNights: totalNights - clamped,
      madinahNights: clamped,
    };
  }
}

export function travellersTotal(state: BuilderState): number {
  return state.adults + state.children + state.infants;
}

/** Which steps are complete enough to continue. */
export function stepValid(step: BuilderStep, state: BuilderState): boolean {
  switch (step) {
    case "dates":
      return (
        isRealISODate(state.departureDate) &&
        isRealISODate(state.returnDate) &&
        state.returnDate > state.departureDate &&
        state.departureDate >= earliestDepartureISO() &&
        state.departureDate <= latestDepartureISO()
      );
    case "flights": {
      const airportsValid =
        state.airportFlexible || (!!state.departureAirport && !!state.returnAirport);
      if (!airportsValid) return false;
      if (state.flightPreference === "stopover") {
        return state.additionalDestination.trim().length >= 2;
      }
      return true;
    }
    case "makkah":
      if (state.makkahNights === 0) return true;
      if (state.makkahMode === "hotel") return !!state.makkahHotelId;
      if (state.makkahMode === "custom_hotel") return state.makkahHotelName.trim().length >= 2;
      if (state.makkahMode === "area")
        return !!state.makkahArea && (state.makkahArea !== "suggest" || !!state.makkahPreference);
      return false;
    case "madinah":
      if (state.madinahNights === 0) return true;
      if (state.madinahMode === "hotel") return !!state.madinahHotelId;
      if (state.madinahMode === "custom_hotel") return state.madinahHotelName.trim().length >= 2;
      if (state.madinahMode === "area")
        return (
          !!state.madinahArea && (state.madinahArea !== "suggest" || !!state.madinahPreference)
        );
      return false;
    case "travellers":
      return state.adults >= 1;
    case "room": {
      const total = calculateTotalNights(state.departureDate, state.returnDate);
      const sum = state.makkahNights + state.madinahNights;
      if (total > 0 && sum !== total) return false;
      return !!state.roomType && sum >= 1;
    }
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
  fmt: {
    date: (v: string) => string;
    /** City is passed through: Makkah and Madinah have different area codes. */
    area: (city: "makkah" | "madinah", v: string) => string;
    budget: (v: string) => string;
  },
): string {
  const lines: string[] = [t("umrahBuilder.whatsapp.intro"), ""];

  if (state.packageTitle) {
    lines.push(`برنامج العمرة المختار: ${state.packageTitle}`);
    if (state.flightRoute) lines.push(`المسار: ${state.flightRoute}`);
    if (state.arrivalAirport && state.returnAirport) {
      lines.push(`مطار الوصول: ${state.arrivalAirport} | مطار العودة: ${state.returnAirport}`);
    }
    if (state.packagePrice) lines.push(`السعر الرسمي: ${state.packagePrice} TND`);
    if (state.packageNotes && state.packageNotes !== "-") lines.push(`ملاحظات: ${state.packageNotes}`);
    lines.push("");
  }

  lines.push(`${t("umrahBuilder.summary.dates")}:`);
  lines.push(`${fmt.date(state.departureDate)} → ${fmt.date(state.returnDate)}`);
  const total = calculateTotalNights(state.departureDate, state.returnDate);
  if (total > 0) {
    lines.push(t("umrahBuilder.summary.nightsCount", { count: total }));
  }
  lines.push("");

  lines.push(`${t("umrahBuilder.summary.flights")}:`);
  if (state.airportFlexible) lines.push(t("umrahBuilder.flights.flexible"));
  else lines.push(`${state.departureAirport} → ${state.returnAirport}`);

  if (state.flightPreference) {
    const prefKey =
      state.flightPreference === "direct"
        ? "directFlight"
        : state.flightPreference === "transit"
          ? "transitFlight"
          : "stopoverFlight";
    lines.push(`${t("umrahBuilder.summary.flightPreference")}: ${t(`umrahBuilder.summary.${prefKey}`)}`);
    if (state.flightPreference === "transit" && state.transitHub) {
      lines.push(`${t("umrahBuilder.flights.transitHubLabel")}: ${state.transitHub}`);
    }
    if (state.flightPreference === "stopover" && state.additionalDestination) {
      const timing = state.destinationTiming
        ? ` (${t(`umrahBuilder.flights.stopoverTiming.${state.destinationTiming}`)})`
        : "";
      lines.push(`${t("umrahBuilder.summary.additionalDestination")}: ${state.additionalDestination}${timing}`);
    }
  }
  lines.push("");

  const place = (
    city: "makkah" | "madinah",
    nights: number,
    mode: "hotel" | "custom_hotel" | "area" | "",
    hotel: string,
    area: string,
    budget: string,
  ) => {
    if (nights === 0) return;
    lines.push(`${t(`umrahBuilder.summary.${city}`)}:`);
    lines.push(t("umrahBuilder.summary.nightsCount", { count: nights }));
    if (mode === "custom_hotel" && hotel) {
      lines.push(`${t("umrahBuilder.summary.customHotel")}: ${hotel}`);
    } else if (hotel) {
      lines.push(`${t("umrahBuilder.summary.hotel")}: ${hotel}`);
    } else if (area) {
      lines.push(`${t("umrahBuilder.summary.area")}: ${fmt.area(city, area)}`);
    }
    if (budget) lines.push(`${t("umrahBuilder.summary.budget")}: ${fmt.budget(budget)}`);
    lines.push("");
  };

  place(
    "makkah",
    state.makkahNights,
    state.makkahMode,
    state.makkahHotelName,
    state.makkahArea,
    state.makkahPreference,
  );
  place(
    "madinah",
    state.madinahNights,
    state.madinahMode,
    state.madinahHotelName,
    state.madinahArea,
    state.madinahPreference,
  );

  lines.push(`${t("umrahBuilder.summary.travellers")}:`);
  lines.push(t("umrahBuilder.summary.adultsCount", { count: state.adults }));
  if (state.children)
    lines.push(t("umrahBuilder.summary.childrenCount", { count: state.children }));
  if (state.infants) lines.push(t("umrahBuilder.summary.infantsCount", { count: state.infants }));

  if (state.roomType) {
    lines.push("");
    lines.push(
      `${t("umrahBuilder.summary.room")}: ${t(`umrahBuilder.room.types.${state.roomType}`)}`,
    );
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
