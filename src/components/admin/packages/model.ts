import type { PackageRowFr, PackageInsertFr } from "@/lib/admin/frTypes";

export type PackageRow = PackageRowFr;
import type { Database } from "@/integrations/supabase/types";

export type PackageCategory = Database["public"]["Enums"]["package_category"];
export type PackageStatus = Database["public"]["Enums"]["package_status"];

export const CATEGORIES: PackageCategory[] = ["umrah", "trip", "flight", "visa"];
export const STATUSES: PackageStatus[] = ["draft", "published", "archived", "sold_out"];

export type ItineraryItem = {
  day: string;
  title: string;
  description: string;
  title_fr: string;
  description_fr: string;
};

export type PackageForm = {
  /* general */
  title: string;
  title_fr: string;
  slug: string;
  category: PackageCategory;
  status: PackageStatus;
  featured: boolean;
  sort_order: string;
  country: string;
  country_fr: string;
  city: string;
  city_fr: string;
  destination: string;
  destination_fr: string;
  short_description: string;
  short_description_fr: string;
  description: string;
  description_fr: string;
  /* pricing */
  price: string;
  discount_price: string;
  discount: string;
  child_price: string;
  infant_price: string;
  currency: string;
  /* media */
  cover: string;
  brochure_pdf: string;
  /* hotel */
  hotel: string;
  hotel_fr: string;
  hotel_rating: string;
  transport: string;
  transport_fr: string;
  /* flights */
  airline: string;
  airline_fr: string;
  departure_date: string;
  return_date: string;
  /* lists */
  timeline: ItineraryItem[];
  included: string[];
  included_fr: string[];
  excluded: string[];
  excluded_fr: string[];
  required_documents: string[];
  required_documents_fr: string[];
  gallery: string[];
  /* seo */
  seo_title: string;
  seo_title_fr: string;
  seo_description: string;
  seo_description_fr: string;
  seo_keywords: string[];
  seo_keywords_fr: string[];
  /* availability */
  duration: string;
  duration_fr: string;
  seats: string;
  total_seats: string;
  /* booking */
  meeting_point: string;
  meeting_point_fr: string;
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function num(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

export function emptyForm(category: PackageCategory = "umrah"): PackageForm {
  return {
    title: "",
    title_fr: "",
    slug: "",
    category,
    status: "draft",
    featured: false,
    sort_order: "0",
    country: "",
    country_fr: "",
    city: "",
    city_fr: "",
    destination: "",
    destination_fr: "",
    short_description: "",
    short_description_fr: "",
    description: "",
    description_fr: "",
    price: "0",
    discount_price: "",
    discount: "",
    child_price: "",
    infant_price: "",
    currency: "TND",
    cover: "",
    brochure_pdf: "",
    hotel: "",
    hotel_fr: "",
    hotel_rating: "",
    transport: "",
    transport_fr: "",
    airline: "",
    airline_fr: "",
    departure_date: "",
    return_date: "",
    timeline: [],
    included: [],
    included_fr: [],
    excluded: [],
    excluded_fr: [],
    required_documents: [],
    required_documents_fr: [],
    gallery: [],
    seo_title: "",
    seo_title_fr: "",
    seo_description: "",
    seo_description_fr: "",
    seo_keywords: [],
    seo_keywords_fr: [],
    duration: "",
    duration_fr: "",
    seats: "",
    total_seats: "",
    meeting_point: "",
    meeting_point_fr: "",
  };
}

/** Pads/truncates `fr` so it always has the same length as `ar`. */
function pairArray(ar: string[], fr: unknown): string[] {
  const frArr = strArray(fr);
  return ar.map((_, i) => frArr[i] ?? "");
}

export function toForm(p: PackageRow): PackageForm {
  const included = strArray(p.included);
  const excluded = strArray(p.excluded);
  const requiredDocuments = strArray(p.required_documents);
  return {
    title: p.title ?? "",
    title_fr: p.title_fr ?? "",
    slug: p.slug ?? "",
    category: p.category,
    status: p.status,
    featured: p.featured ?? false,
    sort_order: num(p.sort_order),
    country: p.country ?? "",
    country_fr: p.country_fr ?? "",
    city: p.city ?? "",
    city_fr: p.city_fr ?? "",
    destination: p.destination ?? "",
    destination_fr: p.destination_fr ?? "",
    short_description: p.short_description ?? "",
    short_description_fr: p.short_description_fr ?? "",
    description: p.description ?? "",
    description_fr: p.description_fr ?? "",
    price: num(p.price),
    discount_price: num(p.discount_price),
    discount: num(p.discount),
    child_price: num(p.child_price),
    infant_price: num(p.infant_price),
    currency: p.currency ?? "TND",
    cover: p.cover ?? "",
    brochure_pdf: p.brochure_pdf ?? "",
    hotel: p.hotel ?? "",
    hotel_fr: p.hotel_fr ?? "",
    hotel_rating: num(p.hotel_rating),
    transport: p.transport ?? "",
    transport_fr: p.transport_fr ?? "",
    airline: p.airline ?? "",
    airline_fr: p.airline_fr ?? "",
    departure_date: p.departure_date ?? "",
    return_date: p.return_date ?? "",
    timeline: Array.isArray(p.timeline)
      ? (p.timeline as unknown[]).map((raw, i) => {
          const t = (raw ?? {}) as Record<string, unknown>;
          const frList = Array.isArray(p.timeline_fr) ? (p.timeline_fr as unknown[]) : [];
          const tf = (frList[i] ?? {}) as Record<string, unknown>;
          return {
            day: typeof t.day === "string" ? t.day : "",
            title: typeof t.title === "string" ? t.title : "",
            description: typeof t.description === "string" ? t.description : "",
            title_fr: typeof tf.title === "string" ? tf.title : "",
            description_fr: typeof tf.description === "string" ? tf.description : "",
          };
        })
      : [],
    included,
    included_fr: pairArray(included, p.included_fr),
    excluded,
    excluded_fr: pairArray(excluded, p.excluded_fr),
    required_documents: requiredDocuments,
    required_documents_fr: pairArray(requiredDocuments, p.required_documents_fr),
    gallery: strArray(p.gallery),
    seo_title: p.seo_title ?? "",
    seo_title_fr: p.seo_title_fr ?? "",
    seo_description: p.seo_description ?? "",
    seo_description_fr: p.seo_description_fr ?? "",
    seo_keywords: strArray(p.seo_keywords),
    seo_keywords_fr: strArray(p.seo_keywords_fr),
    duration: p.duration ?? "",
    duration_fr: p.duration_fr ?? "",
    seats: num(p.seats),
    total_seats: num(p.total_seats),
    meeting_point: p.meeting_point ?? "",
    meeting_point_fr: p.meeting_point_fr ?? "",
  };
}

function optNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function optText(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function toPayload(f: PackageForm): PackageInsertFr {
  return {
    title: f.title.trim(),
    title_fr: optText(f.title_fr),
    slug: slugify(f.slug || f.title),
    category: f.category,
    status: f.status,
    featured: f.featured,
    sort_order: optNum(f.sort_order) ?? 0,
    country: optText(f.country),
    country_fr: optText(f.country_fr),
    city: optText(f.city),
    city_fr: optText(f.city_fr),
    destination: optText(f.destination),
    destination_fr: optText(f.destination_fr),
    short_description: optText(f.short_description),
    short_description_fr: optText(f.short_description_fr),
    description: optText(f.description),
    description_fr: optText(f.description_fr),
    price: optNum(f.price) ?? 0,
    discount_price: optNum(f.discount_price),
    discount: optNum(f.discount),
    child_price: optNum(f.child_price),
    infant_price: optNum(f.infant_price),
    currency: optText(f.currency) ?? "TND",
    cover: optText(f.cover),
    brochure_pdf: optText(f.brochure_pdf),
    hotel: optText(f.hotel),
    hotel_fr: optText(f.hotel_fr),
    hotel_rating: optNum(f.hotel_rating),
    transport: optText(f.transport),
    transport_fr: optText(f.transport_fr),
    airline: optText(f.airline),
    airline_fr: optText(f.airline_fr),
    departure_date: optText(f.departure_date),
    return_date: optText(f.return_date),
    timeline: f.timeline
      .filter((t) => t.day || t.title || t.description)
      .map((t) => ({ day: t.day, title: t.title, description: t.description })),
    timeline_fr: f.timeline
      .filter((t) => t.day || t.title || t.description)
      .map((t) => ({ day: t.day, title: t.title_fr, description: t.description_fr })),
    included: f.included.filter(Boolean),
    included_fr: f.included.map((v, i) => f.included_fr[i] ?? "").filter((_, i) => Boolean(f.included[i])),
    excluded: f.excluded.filter(Boolean),
    excluded_fr: f.excluded.map((v, i) => f.excluded_fr[i] ?? "").filter((_, i) => Boolean(f.excluded[i])),
    required_documents: f.required_documents.filter(Boolean),
    required_documents_fr: f.required_documents
      .map((v, i) => f.required_documents_fr[i] ?? "")
      .filter((_, i) => Boolean(f.required_documents[i])),
    gallery: f.gallery.filter(Boolean),
    seo_title: optText(f.seo_title),
    seo_title_fr: optText(f.seo_title_fr),
    seo_description: optText(f.seo_description),
    seo_description_fr: optText(f.seo_description_fr),
    seo_keywords: f.seo_keywords.filter(Boolean),
    seo_keywords_fr: f.seo_keywords_fr.filter(Boolean),
    duration: optText(f.duration),
    duration_fr: optText(f.duration_fr),
    seats: optNum(f.seats),
    total_seats: optNum(f.total_seats),
    meeting_point: optText(f.meeting_point),
    meeting_point_fr: optText(f.meeting_point_fr),
  };
}

export type FieldErrors = Partial<Record<keyof PackageForm, string>>;

export function validate(f: PackageForm): FieldErrors {
  const e: FieldErrors = {};
  if (!f.title.trim()) e.title = "Title is required.";
  if (!slugify(f.slug || f.title)) e.slug = "Slug is required.";

  const price = Number(f.price);
  if (!f.price.trim() || !Number.isFinite(price) || price < 0)
    e.price = "Price must be a positive number.";

  if (f.discount_price.trim()) {
    const dp = Number(f.discount_price);
    if (!Number.isFinite(dp) || dp < 0) e.discount_price = "Must be a positive number.";
    else if (Number.isFinite(price) && dp >= price)
      e.discount_price = "Discounted price should be lower than the base price.";
  }
  if (f.discount.trim()) {
    const d = Number(f.discount);
    if (!Number.isFinite(d) || d < 0 || d > 100) e.discount = "Use a percentage between 0 and 100.";
  }
  for (const key of ["child_price", "infant_price"] as const) {
    if (f[key].trim() && !(Number(f[key]) >= 0)) e[key] = "Must be a positive number.";
  }
  if (f.hotel_rating.trim()) {
    const r = Number(f.hotel_rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) e.hotel_rating = "Rating must be between 1 and 5.";
  }
  if (f.seats.trim() && !(Number(f.seats) >= 0)) e.seats = "Must be 0 or more.";
  if (f.total_seats.trim() && !(Number(f.total_seats) >= 0)) e.total_seats = "Must be 0 or more.";
  if (f.seats.trim() && f.total_seats.trim() && Number(f.seats) > Number(f.total_seats))
    e.seats = "Available seats cannot exceed total seats.";
  if (f.departure_date && f.return_date && f.return_date < f.departure_date)
    e.return_date = "Return date must be after departure.";
  if (f.seo_title.trim().length > 60) e.seo_title = "Keep the SEO title under 60 characters.";
  if (f.seo_description.trim().length > 160)
    e.seo_description = "Keep the SEO description under 160 characters.";

  if (f.status === "published") {
    if (!f.cover.trim()) e.cover = "A cover image is required before publishing.";
    if (!f.short_description.trim())
      e.short_description = "A short description is required before publishing.";
  }
  return e;
}

/* --------------------------- tab ↔ field mapping --------------------------- */

export const TAB_FIELDS = {
  general: [
    "title",
    "title_fr",
    "slug",
    "category",
    "status",
    "featured",
    "sort_order",
    "country",
    "country_fr",
    "city",
    "city_fr",
    "destination",
    "destination_fr",
    "short_description",
    "short_description_fr",
    "description",
    "description_fr",
  ],
  pricing: ["price", "discount_price", "discount", "child_price", "infant_price", "currency"],
  media: ["cover", "brochure_pdf"],
  hotel: ["hotel", "hotel_fr", "hotel_rating", "transport", "transport_fr"],
  flights: ["airline", "airline_fr", "departure_date", "return_date"],
  itinerary: ["timeline"],
  included: ["included", "included_fr"],
  excluded: ["excluded", "excluded_fr"],
  documents: ["required_documents", "required_documents_fr"],
  seo: [
    "seo_title",
    "seo_title_fr",
    "seo_description",
    "seo_description_fr",
    "seo_keywords",
    "seo_keywords_fr",
  ],
  gallery: ["gallery"],
  availability: ["duration", "duration_fr", "seats", "total_seats"],
  booking: ["meeting_point", "meeting_point_fr"],
} as const satisfies Record<string, readonly (keyof PackageForm)[]>;

export type TabKey = keyof typeof TAB_FIELDS;

export function errorCountForTab(tab: TabKey, errors: FieldErrors): number {
  return (TAB_FIELDS[tab] as readonly (keyof PackageForm)[]).filter((f) => errors[f]).length;
}
