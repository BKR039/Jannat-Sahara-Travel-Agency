/**
 * /sitemap.xml — indexable public URLs only.
 *
 * Reads through the shared query layer with the anon Supabase client, so RLS
 * applies and only rows a visitor can actually see are ever listed. Nothing is
 * invented: dynamic entries exist only for rows that are really published.
 *
 * Deliberately excluded: /admin/*, /auth, /reset-password, /booking and
 * /booking-success (noindex), and the MCP / .well-known machine endpoints.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  fetchIndexableArticles,
  fetchIndexablePackages,
  fetchPublicSiteSettings,
} from "@/lib/queries";
import { absoluteUrl, hasAbsoluteBase, primeCanonicalBase } from "@/lib/seo";

/** Public, indexable static routes with a rough crawl priority. */
const STATIC_ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/umrah", priority: "0.9", changefreq: "daily" },
  { path: "/umrah/builder", priority: "0.8", changefreq: "monthly" },
  { path: "/trips", priority: "0.9", changefreq: "daily" },
  { path: "/flights", priority: "0.7", changefreq: "weekly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/gallery", priority: "0.5", changefreq: "weekly" },
  { path: "/blog", priority: "0.6", changefreq: "daily" },
  { path: "/faq", priority: "0.5", changefreq: "monthly" },
  { path: "/branches", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/legal/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/legal/terms", priority: "0.2", changefreq: "yearly" },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** W3C date (YYYY-MM-DD) — omitted when the timestamp is unusable. */
function lastmod(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `\n    <lastmod>${date.toISOString().slice(0, 10)}</lastmod>`;
}

function urlEntry(
  path: string,
  opts: { priority?: string; changefreq?: string; updatedAt?: string | null } = {},
): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(absoluteUrl(path))}</loc>${lastmod(opts.updatedAt ?? null)}`,
    opts.changefreq ? `    <changefreq>${opts.changefreq}</changefreq>` : "",
    opts.priority ? `    <priority>${opts.priority}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // This route runs outside React, so the canonical origin configured in
        // Settings has to be primed before any URL is built.
        primeCanonicalBase((await fetchPublicSiteSettings()).seoCanonicalBase);

        const entries: string[] = STATIC_ROUTES.map((r) =>
          urlEntry(r.path, { priority: r.priority, changefreq: r.changefreq }),
        );

        // A data outage must not produce a 500 for crawlers — serve the static
        // routes and let the next crawl pick up the dynamic ones.
        const [packages, articles] = await Promise.all([
          fetchIndexablePackages().catch((err) => {
            console.error("[sitemap] packages lookup failed", err);
            return [];
          }),
          fetchIndexableArticles().catch((err) => {
            console.error("[sitemap] articles lookup failed", err);
            return [];
          }),
        ]);

        for (const p of packages) {
          entries.push(
            urlEntry(`/packages/${p.slug}`, {
              priority: "0.8",
              changefreq: "weekly",
              updatedAt: p.updatedAt,
            }),
          );
        }
        for (const a of articles) {
          entries.push(
            urlEntry(`/blog/${a.slug}`, {
              priority: "0.6",
              changefreq: "monthly",
              updatedAt: a.updatedAt,
            }),
          );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            // Absolute <loc> values are required by the sitemap spec; without a
            // configured VITE_SITE_URL the paths are relative, so don't let
            // caches hold an unusable document for long.
            "cache-control": hasAbsoluteBase() ? "public, max-age=3600, s-maxage=3600" : "no-store",
          },
        });
      },
    },
  },
});
