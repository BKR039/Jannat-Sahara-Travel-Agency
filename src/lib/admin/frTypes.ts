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
  title_en: string | null;
  short_description_en: string | null;
  description_en: string | null;
  destination_en: string | null;
  city_en: string | null;
  country_en: string | null;
  hotel_en: string | null;
  airline_en: string | null;
  transport_en: string | null;
  duration_en: string | null;
  meeting_point_en: string | null;
  seo_title_en: string | null;
  seo_description_en: string | null;
  seo_keywords_en: Json | null;
  included_en: Json | null;
  excluded_en: Json | null;
  timeline_en: Json | null;
  required_documents_en: Json | null;
};

export type PackageInsertFr = Database["public"]["Tables"]["packages"]["Insert"] &
  Partial<Omit<PackageRowFr, keyof Database["public"]["Tables"]["packages"]["Insert"]>>;

export type ArticleRowFr = Row<"articles"> & {
  title_fr: string | null;
  excerpt_fr: string | null;
  content_fr: string | null;
  author_fr: string | null;
  tags_fr: Json | null;
  title_en: string | null;
  excerpt_en: string | null;
  content_en: string | null;
  author_en: string | null;
  tags_en: Json | null;
};

export type FaqRowFr = Row<"faqs"> & {
  question_fr: string | null;
  answer_fr: string | null;
  category_fr: string | null;
  question_en: string | null;
  answer_en: string | null;
  category_en: string | null;
};

export type TestimonialRowFr = Row<"testimonials"> & {
  role_fr: string | null;
  content_fr: string | null;
  role_en: string | null;
  content_en: string | null;
};

export type GalleryItemRowFr = Row<"gallery_items"> & {
  title_fr: string | null;
  category_fr: string | null;
  title_en: string | null;
  category_en: string | null;
};

export type BranchRowFr = Row<"branches"> & {
  name_fr: string | null;
  address_fr: string | null;
  city_fr: string | null;
  working_hours_fr: string | null;
  name_en: string | null;
  address_en: string | null;
  city_en: string | null;
  working_hours_en: string | null;
};

export type SiteContentRowFr = Row<"site_content"> & {
  title_fr: string | null;
  subtitle_fr: string | null;
  body_fr: string | null;
  cta_label_fr: string | null;
  title_en: string | null;
  subtitle_en: string | null;
  body_en: string | null;
  cta_label_en: string | null;
};

export type SiteStatRowFr = Row<"site_stats"> & {
  label_fr: string | null;
  label_en: string | null;
};

export type ContactInfoRowFr = Row<"contact_info"> & {
  label_fr: string | null;
  label_en: string | null;
};

/** Cast a Supabase query result (or payload) to a `_fr`-aware shape. */
export function asFr<T>(value: unknown): T {
  return value as T;
}
