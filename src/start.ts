import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/** Best-effort language hint. Never throws — this runs inside the error path. */
function acceptLanguageHeader(): string | null {
  try {
    return getRequest()?.headers?.get("accept-language") ?? null;
  } catch {
    return null;
  }
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(acceptLanguageHeader()), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Baseline security headers on every response (SEC-04 Clickjacking & SEC-08 CSP Baseline).
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response = (result as { response?: Response }).response;
  if (response instanceof Response) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()",
    );

    // SEC-04 Clickjacking Protection: Disallow framing by foreign origins
    response.headers.set("X-Frame-Options", "SAMEORIGIN");

    // SEC-08 Content-Security-Policy baseline (hardened: https-only images)
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://connect.facebook.net https://www.facebook.com https://api.dicebear.com",
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ];
    response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

    // SEC-4-03: Sensitive route and admin cache prevention
    try {
      const req = getRequest();
      const url = req ? new URL(req.url) : null;
      if (url && (url.pathname.startsWith("/admin") || url.pathname.startsWith("/auth"))) {
        response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
        response.headers.set("Pragma", "no-cache");
      }
    } catch {
      // Best-effort in non-standard request environments
    }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, securityHeadersMiddleware],
}));
