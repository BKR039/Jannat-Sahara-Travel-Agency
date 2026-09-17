import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  PUBLIC_SETTING_GROUPS,
  DEFAULT_PUBLIC_SETTINGS,
  resolvePublicSettings,
  type PublicSiteSettings,
} from "@/lib/site-settings";

export type Package = Database["public"]["Tables"]["packages"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Feature = Database["public"]["Tables"]["features"]["Row"];
export type Testimonial = Database["public"]["Tables"]["testimonials"]["Row"];
export type GalleryItem = Database["public"]["Tables"]["gallery_items"]["Row"];
export type Article = Database["public"]["Tables"]["articles"]["Row"];
export type Faq = Database["public"]["Tables"]["faqs"]["Row"];
export type SiteStat = Database["public"]["Tables"]["site_stats"]["Row"];
export type SiteContent = Database["public"]["Tables"]["site_content"]["Row"];
export type ContactInfo = Database["public"]["Tables"]["contact_info"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type PackageCategory = Database["public"]["Enums"]["package_category"];

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data ?? ([] as unknown as T);
}

export const packagesQuery = (category?: PackageCategory, featuredOnly = false) =>
  queryOptions({
    queryKey: ["packages", category ?? "all", featuredOnly] as const,
    queryFn: async () => {
      let q = supabase.from("packages").select("*").eq("status", "published").order("sort_order");
      if (category) q = q.eq("category", category);
      if (featuredOnly) q = q.eq("featured", true);
      return unwrap<Package[]>(q);
    },
  });

export const packageBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["package", slug] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Package | null;
    },
  });

export const statsQuery = () =>
  queryOptions({
    queryKey: ["site_stats"] as const,
    queryFn: () => unwrap<SiteStat[]>(supabase.from("site_stats").select("*").order("sort_order")),
  });

export const servicesQuery = () =>
  queryOptions({
    queryKey: ["services"] as const,
    queryFn: () =>
      unwrap<Service[]>(
        supabase.from("services").select("*").eq("active", true).order("sort_order"),
      ),
  });

export const featuresQuery = () =>
  queryOptions({
    queryKey: ["features"] as const,
    queryFn: () =>
      unwrap<Feature[]>(
        supabase.from("features").select("*").eq("active", true).order("sort_order"),
      ),
  });

export const testimonialsQuery = () =>
  queryOptions({
    queryKey: ["testimonials"] as const,
    queryFn: () =>
      unwrap<Testimonial[]>(
        supabase.from("testimonials").select("*").eq("active", true).order("sort_order"),
      ),
  });

export const galleryQuery = (category?: string) =>
  queryOptions({
    queryKey: ["gallery", category ?? "all"] as const,
    queryFn: async () => {
      let q = supabase.from("gallery_items").select("*").eq("active", true).order("sort_order");
      if (category) q = q.eq("category", category);
      return unwrap<GalleryItem[]>(q);
    },
  });

export const articlesQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["articles", limit ?? "all"] as const,
    queryFn: async () => {
      let q = supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (limit) q = q.limit(limit);
      return unwrap<Article[]>(q);
    },
  });

export const articleBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Article | null;
    },
  });

export const faqsQuery = () =>
  queryOptions({
    queryKey: ["faqs"] as const,
    queryFn: () =>
      unwrap<Faq[]>(supabase.from("faqs").select("*").eq("active", true).order("sort_order")),
  });

export const contentQuery = (key: string) =>
  queryOptions({
    queryKey: ["content", key] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data as SiteContent | null;
    },
  });

export const contactInfoQuery = () =>
  queryOptions({
    queryKey: ["contact_info"] as const,
    queryFn: () =>
      unwrap<ContactInfo[]>(supabase.from("contact_info").select("*").order("sort_order")),
  });

export const branchesQuery = () =>
  queryOptions({
    queryKey: ["branches"] as const,
    queryFn: () =>
      unwrap<Branch[]>(
        supabase
          .from("branches")
          .select("*")
          .eq("is_active", true)
          .order("is_main_branch", { ascending: false })
          .order("sort_order"),
      ),
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
  const { data, error } = await supabase
    .from("packages")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r): r is { slug: string; updated_at: string } => !!r.slug)
    .map((r) => ({ slug: r.slug, updatedAt: r.updated_at ?? null }));
}

/** Published articles for the sitemap — same filter as `articlesQuery`. */
export async function fetchIndexableArticles(): Promise<IndexableUrl[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("slug, updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r): r is { slug: string; updated_at: string } => !!r.slug)
    .map((r) => ({ slug: r.slug, updatedAt: r.updated_at ?? null }));
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
      const { data, error } = await supabase
        .from("site_settings")
        .select("key,value,group_name")
        .in("group_name", [...PUBLIC_SETTING_GROUPS]);
      if (error) {
        console.error("[site-settings] read failed", error.message);
        return DEFAULT_PUBLIC_SETTINGS;
      }
      return resolvePublicSettings(data);
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
    console.error("[site-settings] read failed", err);
    return DEFAULT_PUBLIC_SETTINGS;
  }
}

export type { PublicSiteSettings };

export type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

/** Hotel catalogue for the custom Umrah package builder (agency-managed). */
export const hotelsQuery = (city: "makkah" | "madinah") =>
  queryOptions({
    queryKey: ["hotels", city] as const,
    queryFn: () =>
      unwrap<Hotel[]>(
        supabase.from("hotels").select("*").eq("city", city).eq("active", true).order("sort_order"),
      ),
  });
