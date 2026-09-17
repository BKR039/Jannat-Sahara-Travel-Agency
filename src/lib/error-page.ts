/**
 * Branded 500 page rendered by the worker when SSR fails.
 *
 * This runs in the crash path, so it must not depend on anything that could
 * itself be broken: no i18next runtime, no React, no network. The copy is read
 * straight from the same locale JSON the rest of the site uses (static imports,
 * resolved at build time), keyed by `errorPage.*` — so the strings stay in sync
 * with the app without importing the i18n instance.
 *
 * Language is resolved from the request's `Accept-Language` header when one is
 * available, falling back to the site default (Arabic) rather than English.
 */
import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";
import en from "@/locales/en/common.json";

type Lang = "ar" | "fr" | "en";

const COPY: Record<Lang, { title: string; description: string; retry: string; goHome: string }> = {
  ar: ar.errorPage,
  fr: fr.errorPage,
  en: en.errorPage,
};

const SUPPORTED: readonly Lang[] = ["ar", "fr", "en"];
const DEFAULT_LANG: Lang = "ar";

/** First supported language in an Accept-Language header, else the site default. */
export function resolveErrorPageLang(acceptLanguage: string | null | undefined): Lang {
  if (!acceptLanguage) return DEFAULT_LANG;
  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: (tag ?? "").trim().toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((t) => t.tag && !Number.isNaN(t.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const base = tag.split("-")[0] as Lang;
    if (SUPPORTED.includes(base)) return base;
  }
  return DEFAULT_LANG;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderErrorPage(acceptLanguage?: string | null): string {
  const lang = resolveErrorPageLang(acceptLanguage);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = COPY[lang] ?? COPY[DEFAULT_LANG];

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(t.title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(t.title)}</h1>
      <p>${escapeHtml(t.description)}</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">${escapeHtml(t.retry)}</button>
        <a class="secondary" href="/">${escapeHtml(t.goHome)}</a>
      </div>
    </div>
  </body>
</html>`;
}
