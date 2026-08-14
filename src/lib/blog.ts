import type { Article } from "@/lib/queries";
import { hasArabic, intlLocale, langSuffix, localizeField } from "@/lib/localize";

type TagSource = Pick<Article, "tags"> & { tags_fr?: unknown; tags_en?: unknown };

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

/** Tags are stored as a JSON array; first tag acts as the category. */
export function articleTags(article: TagSource, lang?: string): string[] {
  const suffix = langSuffix(lang);
  if (suffix) {
    const translated = parseTags((article as Record<string, unknown>)[`tags${suffix}`]);
    if (translated.length > 0) return translated;
    // Never leak Arabic tags into a latin-script interface.
    return parseTags(article.tags).filter((tag) => !hasArabic(tag));
  }
  return parseTags(article.tags);
}


export function articleCategory(article: TagSource, lang?: string): string | null {
  return articleTags(article, lang)[0] ?? null;
}

/** Localized article title / excerpt / content / author. */
export function articleText(
  article: Record<string, unknown> | null | undefined,
  field: "title" | "excerpt" | "content" | "author",
  lang: string,
): string {
  return localizeField(article, field, lang, field === "author" ? "base" : "pending");
}

/** Rough reading time in minutes (~200 words/min, works for Arabic too). */
export function readingMinutes(article: Pick<Article, "content" | "excerpt">): number {
  const text = `${article.excerpt ?? ""} ${article.content ?? ""}`.trim();
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatArticleDate(value: string | null, lang = "ar"): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(intlLocale(lang), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function articleUrl(slug: string): string {
  if (typeof window === "undefined") return `/blog/${slug}`;
  return `${window.location.origin}/blog/${slug}`;
}

export function shareLinks(slug: string, title: string) {
  const url = encodeURIComponent(articleUrl(slug));
  const text = encodeURIComponent(title);
  return {
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
  };
}
