/**
 * /robots.txt — generated so it agrees with Settings → SEO → "Search indexing".
 *
 * It previously shipped as a static file in `public/`, which meant the admin
 * toggle only affected the `noindex` meta tag: a crawler reading robots.txt was
 * told one thing and the page another. This route makes both come from the
 * same stored value.
 *
 * Indexing ON  → the previous allow-list, plus the private paths that were
 *                already excluded from the sitemap, plus a Sitemap: line.
 * Indexing OFF → `Disallow: /` for every agent, matching the root `noindex`.
 *
 * Assets are never blocked: no rule targets /_build, /assets or media paths.
 */
import { createFileRoute } from "@tanstack/react-router";
import { fetchPublicSiteSettings } from "@/lib/queries";
import { absoluteUrl, hasAbsoluteBase, primeCanonicalBase } from "@/lib/seo";

/** Paths that must never be indexed, indexing on or off. */
const PRIVATE_PATHS = [
  "/admin",
  "/auth",
  "/reset-password",
  "/booking",
  "/booking-success",
  "/mcp",
  "/.well-known",
];

const NAMED_AGENTS = ["Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit"];

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const settings = await fetchPublicSiteSettings();
        // Runs outside React, so the canonical origin must be primed first.
        primeCanonicalBase(settings.seoCanonicalBase);

        const lines: string[] = [];

        if (!settings.seoIndexingEnabled) {
          lines.push("# Search indexing is switched off in Settings → SEO.");
          lines.push("User-agent: *", "Disallow: /");
        } else {
          for (const agent of NAMED_AGENTS) {
            lines.push(`User-agent: ${agent}`, "Allow: /", "");
          }
          lines.push("User-agent: *", "Allow: /", "");
          for (const path of PRIVATE_PATHS) lines.push(`Disallow: ${path}`);
          lines.push("");
          // An absolute Sitemap: URL is required; omit it rather than emit a
          // relative one when no origin is configured.
          if (hasAbsoluteBase()) lines.push(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
        }

        return new Response(`${lines.join("\n").trim()}\n`, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
