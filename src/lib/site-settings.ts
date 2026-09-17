/**
 * Public-safe site settings.
 *
 * `site_settings` is a flat key/value table grouped by `group_name`. Only the
 * `brand` and `seo` groups describe the public website; `email`, `notifications`
 * and `security` are operational configuration and must never reach the browser.
 * That boundary is enforced twice — by `PUBLIC_SETTING_GROUPS` here, and by the
 * row-level policy on the table itself.
 *
 * Every field has a safe default, so a missing row or an unreachable database
 * degrades to the behaviour the site had before settings were wired: nothing
 * renders blank because one value is absent.
 */

/** The only groups a visitor may read. */
export const PUBLIC_SETTING_GROUPS = ["brand", "seo"] as const;

/** Keys that are read by the public site, per group. */
export const PUBLIC_SETTING_KEYS = [
  "brand_tagline",
  "brand_logo_url",
  "brand_favicon_url",
  "brand_primary_color",
  "brand_accent_color",
  "seo_site_title",
  "seo_meta_description",
  "seo_keywords",
  "seo_og_image",
  "seo_canonical_base",
  "seo_google_verification",
  "seo_indexing_enabled",
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export interface PublicSiteSettings {
  brandTagline: string;
  brandLogoUrl: string;
  brandFaviconUrl: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  seoSiteTitle: string;
  seoMetaDescription: string;
  seoKeywords: string;
  seoOgImage: string;
  /** Absolute origin for canonical links, e.g. https://janatsahara.tn */
  seoCanonicalBase: string;
  seoGoogleVerification: string;
  /** False only when the agency has explicitly switched indexing off. */
  seoIndexingEnabled: boolean;
}

/**
 * Defaults preserve pre-wiring behaviour: empty means "fall back to whatever
 * the component used before" (i18n copy, the bundled logo, /favicon.ico).
 */
export const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  brandTagline: "",
  brandLogoUrl: "",
  brandFaviconUrl: "",
  brandPrimaryColor: "",
  brandAccentColor: "",
  seoSiteTitle: "",
  seoMetaDescription: "",
  seoKeywords: "",
  seoOgImage: "",
  seoCanonicalBase: "",
  seoGoogleVerification: "",
  seoIndexingEnabled: true,
};

/** Trailing slashes are stripped so URL joins never produce `//`. */
function normalizeOrigin(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : "";
}

/** Only http(s) URLs are accepted for anything rendered as a src/href. */
function safeUrl(value: string): string {
  const raw = value.trim();
  return /^https?:\/\//i.test(raw) || raw.startsWith("/") ? raw : "";
}

/**
 * Build the settings object from raw rows. Unknown keys and non-public groups
 * are ignored rather than trusted, so a widened query cannot leak a value.
 */
export function resolvePublicSettings(
  rows: Array<{ key: string; value: string | null; group_name?: string | null }> | null | undefined,
): PublicSiteSettings {
  const map = new Map<string, string>();
  for (const row of rows ?? []) {
    if (!row?.key) continue;
    if (!(PUBLIC_SETTING_KEYS as readonly string[]).includes(row.key)) continue;
    map.set(row.key, (row.value ?? "").trim());
  }

  const get = (key: PublicSettingKey) => map.get(key) ?? "";

  return {
    brandTagline: get("brand_tagline"),
    brandLogoUrl: safeUrl(get("brand_logo_url")),
    brandFaviconUrl: safeUrl(get("brand_favicon_url")),
    brandPrimaryColor: get("brand_primary_color"),
    brandAccentColor: get("brand_accent_color"),
    seoSiteTitle: get("seo_site_title"),
    seoMetaDescription: get("seo_meta_description"),
    seoKeywords: get("seo_keywords"),
    seoOgImage: safeUrl(get("seo_og_image")),
    // Settings -> SEO -> "Canonical base URL" is the single source of truth for
    // the site's own origin. `brand_website_url` / `brand_canonical_url` are
    // deprecated duplicates and are deliberately not read here.
    seoCanonicalBase: normalizeOrigin(get("seo_canonical_base")),
    seoGoogleVerification: get("seo_google_verification"),
    // Anything other than an explicit "false" keeps indexing on.
    seoIndexingEnabled: get("seo_indexing_enabled").toLowerCase() !== "false",
  };
}
