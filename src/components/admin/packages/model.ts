import type { Database } from "@/integrations/supabase/types";

export type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
export type PackageCategory = Database["public"]["Enums"]["package_category"];
export type PackageStatus = Database["public"]["Enums"]["package_status"];

export const CATEGORIES: PackageCategory[] = ["umrah", "trip", "flight", "visa"];
export const STATUSES: PackageStatus[] = ["draft", "published", "archived", "sold_out"];

export type ItineraryItem = { day: string; title: string; description: string };

export type PackageForm = {
  /* general */
  title: string;
  slug: string;
  category: PackageCategory;
  status: PackageStatus;
  featured: boolean;
  sort_order: string;
  country: string;
  city: string;
  destination: string;
  short_description: string;
  description: string;
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
  hotel_rating: string;
  transport: string;
  /* flights */
  airline: string;
  departure_date: string;
  return_date: string;
  /* lists */
  timeline: ItineraryItem[];
  included: string[];
  excluded: string[];
  required_documents: string[];
  gallery: string[];
  /* seo */
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  /* availability */
  duration: string;
  seats: string;
  total_seats: string;
  /* booking */
  meeting_point: string;
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
    slug: "",
    category,
    status: "draft",
    featured: false,
    sort_order: "0",
    country: "",
    city: "",
    destination: "",
    short_description: "",
    description: "",
    price: "0",
    discount_price: "",
    discount: "",
    child_price: "",
    infant_price: "",
    currency: "TND",
    cover: "",
    brochure_pdf: "",
    hotel: "",
    hotel_rating: "",
    transport: "",
    airline: "",
    departure_date: "",
    return_date: "",
    timeline: [],
    included: [],
    excluded: [],
    required_documents: [],
    gallery: [],
    seo_title: "",
    seo_description: "",
    seo_keywords: [],
    duration: "",
    seats: "",
    total_seats: "",
    meeting_point: "",
  };
}

export function toForm(p: PackageRow): PackageForm {
  return {
    title: p.title ?? "",
    slug: p.slug ?? "",
    category: p.category,
    status: p.status,
    featured: p.featured ?? false,
    sort_order: num(p.sort_order),
    country: p.country ?? "",
    city: p.city ?? "",
    destination: p.destination ?? "",
    short_description: p.short_description ?? "",
    description: p.description ?? "",
    price: num(p.price),
    discount_price: num(p.discount_price),
    discount: num(p.discount),
    child_price: num(p.child_price),
    infant_price: num(p.infant_price),
    currency: p.currency ?? "TND",
    cover: p.cover ?? "",
    brochure_pdf: p.brochure_pdf ?? "",
    hotel: p.hotel ?? "",
    hotel_rating: num(p.hotel_rating),
    transport: p.transport ?? "",
    airline: p.airline ?? "",
    departure_date: p.departure_date ?? "",
    return_date: p.return_date ?? "",
    timeline: Array.isArray(p.timeline)
      ? (p.timeline as unknown[]).map((raw) => {
          const t = (raw ?? {}) as Record<string, unknown>;
          return {
            day: typeof t.day === "string" ? t.day : "",
            title: typeof t.title === "string" ? t.title : "",
            description: typeof t.description === "string" ? t.description : "",
          };
        })
      : [],
    included: strArray(p.included),
    excluded: strArray(p.excluded),
    required_documents: strArray(p.required_documents),
    gallery: strArray(p.gallery),
    seo_title: p.seo_title ?? "",
    seo_description: p.seo_description ?? "",
    seo_keywords: strArray(p.seo_keywords),
    duration: p.duration ?? "",
    seats: num(p.seats),
    total_seats: num(p.total_seats),
    meeting_point: p.meeting_point ?? "",
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

export function toPayload(f: PackageForm) {
  return {
    title: f.title.trim(),
    slug: slugify(f.slug || f.title),
    category: f.category,
    status: f.status,
    featured: f.featured,
    sort_order: optNum(f.sort_order) ?? 0,
    country: optText(f.country),
    city: optText(f.city),
    destination: optText(f.destination),
    short_description: optText(f.short_description),
    description: optText(f.description),
    price: optNum(f.price) ?? 0,
    discount_price: optNum(f.discount_price),
    discount: optNum(f.discount),
    child_price: optNum(f.child_price),
    infant_price: optNum(f.infant_price),
    currency: optText(f.currency) ?? "TND",
    cover: optText(f.cover),
    brochure_pdf: optText(f.brochure_pdf),
    hotel: optText(f.hotel),
    hotel_rating: optNum(f.hotel_rating),
    transport: optText(f.transport),
    airline: optText(f.airline),
    departure_date: optText(f.departure_date),
    return_date: optText(f.return_date),
    timeline: f.timeline.filter((t) => t.day || t.title || t.description),
    included: f.included.filter(Boolean),
    excluded: f.excluded.filter(Boolean),
    required_documents: f.required_documents.filter(Boolean),
    gallery: f.gallery.filter(Boolean),
    seo_title: optText(f.seo_title),
    seo_description: optText(f.seo_description),
    seo_keywords: f.seo_keywords.filter(Boolean),
    duration: optText(f.duration),
    seats: optNum(f.seats),
    total_seats: optNum(f.total_seats),
    meeting_point: optText(f.meeting_point),
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
    "slug",
    "category",
    "status",
    "featured",
    "sort_order",
    "country",
    "city",
    "destination",
    "short_description",
    "description",
  ],
  pricing: ["price", "discount_price", "discount", "child_price", "infant_price", "currency"],
  media: ["cover", "brochure_pdf"],
  hotel: ["hotel", "hotel_rating", "transport"],
  flights: ["airline", "departure_date", "return_date"],
  itinerary: ["timeline"],
  included: ["included"],
  excluded: ["excluded"],
  documents: ["required_documents"],
  seo: ["seo_title", "seo_description", "seo_keywords"],
  gallery: ["gallery"],
  availability: ["duration", "seats", "total_seats"],
  booking: ["meeting_point"],
} as const satisfies Record<string, readonly (keyof PackageForm)[]>;

export type TabKey = keyof typeof TAB_FIELDS;

export function errorCountForTab(tab: TabKey, errors: FieldErrors): number {
  return (TAB_FIELDS[tab] as readonly (keyof PackageForm)[]).filter((f) => errors[f]).length;
}
