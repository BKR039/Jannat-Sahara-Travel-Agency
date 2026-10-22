import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  PUBLIC_SETTING_GROUPS,
  DEFAULT_PUBLIC_SETTINGS,
  resolvePublicSettings,
  type PublicSiteSettings,
} from "@/lib/site-settings";
import {
  FALLBACK_PACKAGES,
  FALLBACK_SERVICES,
  FALLBACK_FEATURES,
  FALLBACK_TESTIMONIALS,
  FALLBACK_GALLERY,
  FALLBACK_ARTICLES,
  FALLBACK_STATS,
  FALLBACK_CONTENT,
  FALLBACK_BRANCHES,
  FALLBACK_CONTACT_INFO,
  FALLBACK_FAQS,
  FALLBACK_SITE_SECTIONS,
} from "@/lib/fallback-data";

export type Package = Database["public"]["Tables"]["packages"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Feature = Database["public"]["Tables"]["features"]["Row"];
export type Testimonial = Database["public"]["Tables"]["testimonials"]["Row"];
export type GalleryItem = Database["public"]["Tables"]["gallery_items"]["Row"];
export type Article = Database["public"]["Tables"]["articles"]["Row"];
export type Faq = Database["public"]["Tables"]["faqs"]["Row"];
export type SiteStat = Database["public"]["Tables"]["site_stats"]["Row"];
export type SiteContent = Database["public"]["Tables"]["site_content"]["Row"];
export type SiteSection = Database["public"]["Tables"]["site_sections"]["Row"];
export type ContactInfo = Database["public"]["Tables"]["contact_info"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type PackageCategory = Database["public"]["Enums"]["package_category"];

async function unwrap<T>(
  p: PromiseLike<{ data: unknown; error: unknown }>,
  fallback: T = [] as unknown as T,
): Promise<T> {
  try {
    const { data, error } = await p;
    if (error) {
      console.warn("[queries] query returned error:", (error as any)?.message || error);
      return fallback;
    }
    return (data ?? fallback) as unknown as T;
  } catch (err) {
    console.warn("[queries] fetch/network error:", (err as any)?.message || err);
    return fallback;
  }
}

export const packagesQuery = (category?: PackageCategory, featuredOnly = false) =>
  queryOptions({
    queryKey: ["packages", category ?? "all", featuredOnly] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        let q = supabase
          .from("packages")
          .select(
            "id, title, title_fr, title_en, slug, category, cover, short_description, short_description_fr, short_description_en, destination, destination_fr, destination_en, duration, duration_fr, duration_en, price, discount, discount_price, currency, seats, featured, hotel, hotel_rating, airline, departure_date, return_date, status, sort_order",
          )
          .eq("status", "published")
          .order("sort_order");
        if (category) q = q.eq("category", category);
        if (featuredOnly) q = q.eq("featured", true);
        const res = await unwrap<Package[]>(q, []);
        if (res && res.length > 0) return res;
      } catch (err) {
        console.warn("[packagesQuery] failed", err);
      }
      let filtered = FALLBACK_PACKAGES;
      if (category) filtered = filtered.filter((p) => p.category === category);
      if (featuredOnly) filtered = filtered.filter((p) => p.featured);
      return filtered;
    },
  });

export const packageBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["package", slug] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("packages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (!error && data) {
          return data as Package;
        }
      } catch (err) {
        console.warn("[packageBySlugQuery] failed", err);
      }
      return FALLBACK_PACKAGES.find((p) => p.slug === slug) ?? null;
    },
  });

export const statsQuery = () =>
  queryOptions({
    queryKey: ["site_stats"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<SiteStat[]>(supabase.from("site_stats").select("*").order("sort_order"), []);
      return (res && res.length > 0) ? res : FALLBACK_STATS;
    },
  });

export const servicesQuery = () =>
  queryOptions({
    queryKey: ["services"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<Service[]>(
        supabase.from("services").select("*").eq("active", true).order("sort_order"),
        [],
      );
      return (res && res.length > 0) ? res : FALLBACK_SERVICES;
    },
  });

export const featuresQuery = () =>
  queryOptions({
    queryKey: ["features"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<Feature[]>(
        supabase.from("features").select("*").eq("active", true).order("sort_order"),
        [],
      );
      return (res && res.length > 0) ? res : FALLBACK_FEATURES;
    },
  });

export const testimonialsQuery = () =>
  queryOptions({
    queryKey: ["testimonials"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<Testimonial[]>(
        supabase.from("testimonials").select("*").eq("active", true).order("sort_order"),
        [],
      );
      return (res && res.length > 0) ? res : FALLBACK_TESTIMONIALS;
    },
  });

export const galleryQuery = (category?: string, limit?: number) =>
  queryOptions({
    queryKey: ["gallery", category ?? "all", limit ?? "all"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        let q = supabase
          .from("gallery_items")
          .select("id, image, title, title_fr, title_en, category, sort_order, active")
          .eq("active", true)
          .order("sort_order");
        if (category && category !== "all") q = q.eq("category", category);
        if (limit) q = q.limit(limit);
        const res = await unwrap<GalleryItem[]>(q, []);
        if (res && res.length > 0) return res;
      } catch (err) {
        console.warn("[galleryQuery] failed", err);
      }
      let filtered = FALLBACK_GALLERY;
      if (category && category !== "all") filtered = filtered.filter((g) => g.category === category);
      if (limit) filtered = filtered.slice(0, limit);
      return filtered;
    },
  });

export const articlesQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["articles", limit ?? "all"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        let q = supabase
          .from("articles")
          .select(
            "id, slug, title, title_fr, title_en, excerpt, excerpt_fr, excerpt_en, cover, tags, tags_fr, tags_en, author, author_fr, author_en, published_at, published, updated_at",
          )
          .eq("published", true)
          .order("published_at", { ascending: false });
        if (limit) q = q.limit(limit);
        const res = await unwrap<Article[]>(q, []);
        if (res && res.length > 0) return res;
      } catch (err) {
        console.warn("[articlesQuery] failed", err);
      }
      return limit ? FALLBACK_ARTICLES.slice(0, limit) : FALLBACK_ARTICLES;
    },
  });

export const articleBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        if (!error && data) {
          return data as Article;
        }
      } catch (err) {
        console.warn("[articleBySlugQuery] failed", err);
      }
      return FALLBACK_ARTICLES.find((a) => a.slug === slug) ?? null;
    },
  });

export const faqsQuery = () =>
  queryOptions({
    queryKey: ["faqs"] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<Faq[]>(supabase.from("faqs").select("*").eq("active", true).order("sort_order"), []);
      return (res && res.length > 0) ? res : FALLBACK_FAQS;
    },
  });

export const contentQuery = (key: string) =>
  queryOptions({
    queryKey: ["content", key] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_content")
          .select("*")
          .eq("key", key)
          .maybeSingle();
        if (!error && data) {
          return data as SiteContent;
        }
      } catch (err) {
        console.warn(`[contentQuery] failed for ${key}:`, err);
      }
      return FALLBACK_CONTENT[key] ?? null;
    },
  });

export const contactInfoQuery = () =>
  queryOptions({
    queryKey: ["contact_info"] as const,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<ContactInfo[]>(supabase.from("contact_info").select("*").order("sort_order"), []);
      return (res && res.length > 0) ? res : FALLBACK_CONTACT_INFO;
    },
  });

export const branchesQuery = () =>
  queryOptions({
    queryKey: ["branches"] as const,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await unwrap<Branch[]>(
        supabase
          .from("branches")
          .select("*")
          .eq("is_active", true)
          .order("is_main_branch", { ascending: false })
          .order("sort_order"),
        [],
      );
      return (res && res.length > 0) ? res : FALLBACK_BRANCHES;
    },
  });

/* ------------------------------------------------------------------ sitemap */

export interface IndexableUrl {
  slug: string;
  updatedAt: string | null;
}

/**
 * Published packages for the sitemap. Uses the same publish filter as
 * `packagesQuery` (mirrored by RLS) and selects only what a sitemap needs.
 */
export async function fetchIndexablePackages(): Promise<IndexableUrl[]> {
  try {
    const { data, error } = await supabase
      .from("packages")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .filter((r): r is { slug: string; updated_at: string } => !!r.slug)
      .map((r) => ({ slug: r.slug, updatedAt: r.updated_at ?? null }));
  } catch (err) {
    console.warn("[sitemap] packages query failed", err);
    return [];
  }
}

/** Published articles for the sitemap — same filter as `articlesQuery`. */
export async function fetchIndexableArticles(): Promise<IndexableUrl[]> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .filter((r): r is { slug: string; updated_at: string } => !!r.slug)
      .map((r) => ({ slug: r.slug, updatedAt: r.updated_at ?? null }));
  } catch (err) {
    console.warn("[sitemap] articles query failed", err);
    return [];
  }
}

/* ---------------------------------------------------------- site settings */

/**
 * The single public read of `site_settings`.
 *
 * Every public component consumes settings through this one query, so the page
 * makes one request no matter how many components need a value. The select is
 * restricted to the public groups, and `resolvePublicSettings` then whitelists
 * individual keys — a defence in depth alongside the table's RLS policy.
 *
 * A failure resolves to defaults instead of throwing: a settings outage must
 * never blank the website.
 */
export const siteSettingsQuery = () =>
  queryOptions({
    queryKey: ["site_settings"] as const,
    // Brand and SEO values change rarely; hold them longer than page content.
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<PublicSiteSettings> => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key,value,group_name")
          .in("group_name", [...PUBLIC_SETTING_GROUPS]);
        if (error) {
          console.warn("[site-settings] read failed", error.message);
          return DEFAULT_PUBLIC_SETTINGS;
        }
        return resolvePublicSettings(data);
      } catch (err) {
        console.warn("[site-settings] fetch failed", err);
        return DEFAULT_PUBLIC_SETTINGS;
      }
    },
  });

/** Non-hook read for route `head()`, which cannot use React Query. */
export async function fetchPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key,value,group_name")
      .in("group_name", [...PUBLIC_SETTING_GROUPS]);
    if (error) throw error;
    return resolvePublicSettings(data);
  } catch (err) {
    console.warn("[site-settings] read failed", err);
    return DEFAULT_PUBLIC_SETTINGS;
  }
}

export type { PublicSiteSettings };

export type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export const hotelsQuery = (city: "makkah" | "madinah" | string) =>
  queryOptions({
    queryKey: ["hotels", city] as const,
    staleTime: 10 * 60 * 1000,
    queryFn: () => {
      const canonicalCity =
        city.toLowerCase() === "makkah"
          ? "Makkah"
          : city.toLowerCase() === "madinah"
            ? "Madinah"
            : city;
      return unwrap<Hotel[]>(
        supabase
          .from("hotels")
          .select("id, name, name_fr, name_en, city, sort_order, active")
          .ilike("city", canonicalCity)
          .eq("active", true)
          .order("sort_order"),
        [],
      );
    },
  });

/* -------------------------------------------------------- site sections */

export const siteSectionsQuery = (page = "home") =>
  queryOptions({
    queryKey: ["site_sections", page] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_sections")
          .select("*")
          .eq("page", page)
          .order("sort_order");
        if (error) {
          console.warn("[site_sections] query failed", error.message);
          return FALLBACK_SITE_SECTIONS;
        }
        return (data && data.length > 0) ? data : FALLBACK_SITE_SECTIONS;
      } catch (err) {
        console.warn("[site_sections] fetch failed", err);
        return FALLBACK_SITE_SECTIONS;
      }
    },
  });

export function isSectionVisible(
  sections: SiteSection[] | undefined,
  key: string,
  fallback = true,
): boolean {
  if (!sections || sections.length === 0) return fallback;
  const match = sections.find((s) => s.section_key === key);
  return match ? match.enabled : fallback;
}
