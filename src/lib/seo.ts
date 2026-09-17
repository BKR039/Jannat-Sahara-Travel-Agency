/**
 * The single source of truth for public URL generation in metadata.
 *
 * Canonical links, og:url and the sitemap all resolve through here so the
 * domain is configured in exactly one place instead of being repeated in
 * every route's `head()`.
 *
 * Configuration
 * -------------
 * Set `VITE_SITE_URL` to the production origin (e.g. `https://janatsahara.tn`).
 * Vite inlines it at build time into both the client and SSR bundles, so the
 * value is identical on the server and after hydration — no mismatch.
 *
 * When it is unset, `absoluteUrl()` returns the path unchanged. That keeps the
 * previous (relative) behaviour rather than emitting a guessed or broken
 * domain: relative canonicals are resolved by crawlers against the current
 * document, so an unconfigured deployment is no worse off than before, and a
 * configured one is fully correct.
 *
 * `site_settings.seo_canonical_base` exists in the admin but is not read by the
 * public site (audit S-01 — the Settings→website wiring is a later phase).
 * When that wiring lands, this module is the one place that needs to consume it.
 */

/** Trim trailing slashes so joins never produce `//`. */
function normalizeBase(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

const ENV_SITE_URL: string = normalizeBase(
  (import.meta.env?.["VITE_SITE_URL"] as string | undefined) ?? undefined,
);

/**
 * Origin configured in Settings -> SEO (`seo_canonical_base`).
 *
 * `head()` is synchronous, so the value is primed once by the root route loader
 * and read from here afterwards. `VITE_SITE_URL` still wins when set, because a
 * build-time constant is identical on the server and after hydration; the
 * database value is only used when no env origin is configured.
 */
let runtimeSiteUrl = "";

/** Called by the root loader once the settings row has been read. */
export function primeCanonicalBase(origin: string | null | undefined): void {
  runtimeSiteUrl = normalizeBase(origin ?? undefined);
}

function siteUrl(): string {
  return ENV_SITE_URL || runtimeSiteUrl;
}

/** @deprecated read through `absoluteUrl()`; kept for existing call sites. */
export const SITE_URL: string = ENV_SITE_URL;

/** True when a production origin is configured and URLs can be made absolute. */
export function hasAbsoluteBase(): boolean {
  return siteUrl().length > 0;
}

/**
 * Absolute URL for a site-relative path.
 * Falls back to the normalized relative path when no base is configured.
 */
export function absoluteUrl(path: string): string {
  const clean = `/${String(path ?? "").replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
  const withoutTrailing = clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  const base = siteUrl();
  return base ? `${base}${withoutTrailing === "/" ? "/" : withoutTrailing}` : withoutTrailing;
}

/** Canonical `<link>` descriptor for a route's `head()`. */
export function canonical(path: string): { rel: "canonical"; href: string } {
  return { rel: "canonical", href: absoluteUrl(path) };
}

/**
 * JSON-LD payload, serialized so it cannot escape its `<script>` element.
 *
 * `JSON.stringify` leaves `<` untouched, so a value containing `</script>`
 * closes the tag and everything after it is parsed as HTML. The structured
 * data on this site is built from CMS content — branch names and addresses,
 * article headlines, programme titles — so the strings in it are attacker-
 * influenced by anyone with admin write access, and one of those payloads
 * would execute for every visitor to the page.
 *
 * Escaping `<` as its `\u003c` JSON escape is the standard mitigation: the
 * value parses back byte-identical for any JSON-LD consumer, and an HTML
 * tokenizer never sees a tag.
 */
export function jsonLd(payload: unknown): string {
  // Two backslashes on purpose: the replacement must be the six characters
  // \\u003c that JSON decodes back to "<". One backslash is consumed by
  // this file's own parser, leaving a literal "<" and a no-op replace.
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}
