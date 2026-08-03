import type { Database, Json } from "@/integrations/supabase/types";

/**
 * The generated Supabase types don't yet know about the `_fr` sibling
 * columns that mirror every translatable field. These narrow local types
 * describe exactly the extra columns each admin editor needs, so we avoid
 * `any` while the generated types catch up.
 *
 * Use `withFr<Row, Extra>()` helpers below only as type-level casts at the
 * query boundary (`select("*")` results, `insert`/`update` payloads).
 */

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type PackageRowFr = Row<"packages"> & {
  title_fr: string | null;
  short_description_fr: string | null;
  description_fr: string | null;
  destination_fr: string | null;
  city_fr: string | null;
  country_fr: string | null;
  hotel_fr: string | null;
  airline_fr: string | null;
  transport_fr: string | null;
  duration_fr: string | null;
  meeting_point_fr: string | null;
  seo_title_fr: string | null;
  seo_description_fr: string | null;
  seo_keywords_fr: Json | null;
  included_fr: Json | null;
  excluded_fr: Json | null;
  timeline_fr: Json | null;
  required_documents_fr: Json | null;
};

export type PackageInsertFr = Partial<PackageRowFr>;

export type ArticleRowFr = Row<"articles"> & {
  title_fr: string | null;
  excerpt_fr: string | null;
  content_fr: string | null;
  author_fr: string | null;
  tags_fr: Json | null;
};

export type FaqRowFr = Row<"faqs"> & {
  question_fr: string | null;
  answer_fr: string | null;
  category_fr: string | null;
};

export type TestimonialRowFr = Row<"testimonials"> & {
  role_fr: string | null;
  content_fr: string | null;
};

export type GalleryItemRowFr = Row<"gallery_items"> & {
  title_fr: string | null;
  category_fr: string | null;
};

export type BranchRowFr = Row<"branches"> & {
  name_fr: string | null;
  address_fr: string | null;
  city_fr: string | null;
  working_hours_fr: string | null;
};

export type SiteContentRowFr = Row<"site_content"> & {
  title_fr: string | null;
  subtitle_fr: string | null;
  body_fr: string | null;
  cta_label_fr: string | null;
};

export type SiteStatRowFr = Row<"site_stats"> & {
  label_fr: string | null;
};

export type ContactInfoRowFr = Row<"contact_info"> & {
  label_fr: string | null;
};

/** Cast a Supabase query result (or payload) to a `_fr`-aware shape. */
export function asFr<T>(value: unknown): T {
  return value as T;
}
