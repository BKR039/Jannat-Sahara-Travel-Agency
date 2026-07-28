import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
export type PackageCategory = Database["public"]["Enums"]["package_category"];

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return (data ?? ([] as unknown as T));
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
      const { data, error } = await supabase.from("packages").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Package | null;
    },
  });

export const statsQuery = () =>
  queryOptions({
    queryKey: ["site_stats"] as const,
    queryFn: () =>
      unwrap<SiteStat[]>(supabase.from("site_stats").select("*").order("sort_order")),
  });

export const servicesQuery = () =>
  queryOptions({
    queryKey: ["services"] as const,
    queryFn: () =>
      unwrap<Service[]>(supabase.from("services").select("*").eq("active", true).order("sort_order")),
  });

export const featuresQuery = () =>
  queryOptions({
    queryKey: ["features"] as const,
    queryFn: () =>
      unwrap<Feature[]>(supabase.from("features").select("*").eq("active", true).order("sort_order")),
  });

export const testimonialsQuery = () =>
  queryOptions({
    queryKey: ["testimonials"] as const,
    queryFn: () =>
      unwrap<Testimonial[]>(supabase.from("testimonials").select("*").eq("active", true).order("sort_order")),
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
      let q = supabase.from("articles").select("*").eq("published", true).order("published_at", { ascending: false });
      if (limit) q = q.limit(limit);
      return unwrap<Article[]>(q);
    },
  });

export const articleBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle();
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
      const { data, error } = await supabase.from("site_content").select("*").eq("key", key).maybeSingle();
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
