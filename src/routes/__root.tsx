import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { Toaster } from "@/components/ui/sonner";
import { siteSettingsQuery } from "@/lib/queries";
import { DEFAULT_PUBLIC_SETTINGS } from "@/lib/site-settings";
import { primeCanonicalBase } from "@/lib/seo";
import { brandThemeCss } from "@/lib/brand-theme";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-h5 font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-small text-muted-foreground">{t("notFound.description")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-small font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const { t } = useTranslation();
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-h5 font-semibold tracking-tight text-foreground">
          {t("errorPage.title")}
        </h1>
        <p className="mt-2 text-small text-muted-foreground">{t("errorPage.description")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-small font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errorPage.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-small font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("errorPage.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  /**
   * Site-level settings are loaded once here and shared with every route.
   * `head()` cannot await, so the loader primes both the query cache (for
   * components) and the canonical base (for `absoluteUrl`).
   */
  loader: async ({ context }) => {
    const settings = await context.queryClient
      .ensureQueryData(siteSettingsQuery())
      .catch(() => DEFAULT_PUBLIC_SETTINGS);
    primeCanonicalBase(settings.seoCanonicalBase);
    return settings;
  },
  head: ({ loaderData }) => {
    const s = loaderData ?? DEFAULT_PUBLIC_SETTINGS;

    // Settings supply the site-level DEFAULTS. A page that defines its own
    // title/description still wins — route heads are merged after this one.
    const title = s.seoSiteTitle || i18n.t("seo.root.title");
    const description = s.seoMetaDescription || i18n.t("seo.root.description");

    const meta: Array<Record<string, string>> = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      { name: "description", content: description },
      { name: "author", content: "Janat Sahara Travel" },
      { property: "og:title", content: title },
      {
        property: "og:description",
        content: s.seoMetaDescription || i18n.t("seo.root.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Janat Sahara Travel" },
      { name: "twitter:card", content: "summary_large_image" },
    ];

    if (s.seoKeywords) meta.push({ name: "keywords", content: s.seoKeywords });
    if (s.seoOgImage) {
      meta.push({ property: "og:image", content: s.seoOgImage });
      meta.push({ name: "twitter:image", content: s.seoOgImage });
    }
    if (s.seoGoogleVerification) {
      meta.push({ name: "google-site-verification", content: s.seoGoogleVerification });
    }
    // The agency can switch the whole site out of search results.
    if (!s.seoIndexingEnabled) meta.push({ name: "robots", content: "noindex, nofollow" });

    return {
      meta,
      links: [
        { rel: "stylesheet", href: appCss },
        /*
         * Brand mark, generated from the agency logo. The `.ico` that shipped
         * with the starter template was still what the browser tab showed.
         * A custom favicon set under Settings → Brand still wins; otherwise
         * these are the agency's own assets, not the template's.
         */
        ...(s.brandFaviconUrl
          ? [{ rel: "icon", href: s.brandFaviconUrl }]
          : [
              { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
              { rel: "icon", href: "/favicon.ico", sizes: "any" },
              { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
            ]),
        {
          rel: "preload",
          href: "/fonts/alfont_com_TheYearofHandicrafts-SemiBold.otf",
          as: "font",
          type: "font/otf",
          crossOrigin: "anonymous",
        },
        {
          rel: "preload",
          href: "/fonts/alfont_com_TheYearofHandicrafts-Black.otf",
          as: "font",
          type: "font/otf",
          crossOrigin: "anonymous",
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '686261157163328');
fbq('track', 'PageView');`,
          }}
        />
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=686261157163328&ev=PageView&noscript=1" />`,
          }}
        />
        {/* End Meta Pixel Code */}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const settings = Route.useLoaderData();

  // Rendered on the server from the root loader, so the agency's colours are
  // present in the first paint — no flash of the default palette.
  const themeCss = brandThemeCss(settings?.brandPrimaryColor, settings?.brandAccentColor);

  return (
    <QueryClientProvider client={queryClient}>
      {themeCss && <style data-brand-theme>{themeCss}</style>}
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <Outlet />
          <Toaster position="top-center" richColors closeButton />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
