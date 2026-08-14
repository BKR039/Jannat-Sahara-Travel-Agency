# 10 — Operations: Env, Integrations, Error Handling, Deployment

## Environment variables

| Variable | Scope | Used by |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | client (`import.meta.env`) | `src/integrations/supabase/client.ts` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | server (`process.env`) | `client.server.ts`, `auth-middleware.ts` |
| `RESEND_API_KEY` | server | `booking.functions.ts`, `flight-request.functions.ts` |
| `RESEND_FROM_EMAIL` | server | same (defaults to `onboarding@resend.dev`) |
| `BOOKING_NOTIFICATION_EMAIL` | server | booking + flight-request notification recipient |

Rules: never prefix a secret with `VITE_`; read `process.env` inside handlers only.
The `.env` file and the Supabase vars are platform-managed. After changing an
unprefixed secret, **re-publish** for production to pick it up.

## Third-party integrations

| Integration | How |
| --- | --- |
| **Supabase (Lovable Cloud)** | Postgres + RLS, Auth, private Storage |
| **Resend** | plain `fetch` POST to `https://api.resend.com/emails` from server functions; HTML rendered by `booking-email.server.ts` / `flight-request-email.server.ts` (both escape user input) |
| **Leaflet / OpenStreetMap tiles** | branch map, client-only |
| **Google Fonts** | `<link>` tags in `__root.tsx` head (never `@import` in `styles.css`) |
| **MCP (agent integration)** | `@lovable.dev/mcp-js` |

No analytics, payment, or CRM SaaS integration exists in the repo.

## MCP server

- Routes: `src/routes/mcp.ts`, `src/routes/[.mcp]/list-tools.ts`,
  `src/routes/[.mcp]/invoke-tool/$tool.ts`,
  `src/routes/[.well-known]/oauth-protected-resource.ts`, consent screen at
  `src/routes/[.]lovable.oauth.consent.tsx`. Manifest: `.lovable/mcp/manifest.json`.
- Server definition: `src/lib/mcp/index.ts` (`name: "sahara-travel-foundation"`),
  Supabase access helper `src/lib/mcp/supabase.ts`.
- Tools in `src/lib/mcp/tools/`: `list-packages`, `list-bookings`,
  `list-flight-requests`, `list-contact-messages`, `update-booking-status`.
- Access is OAuth-protected; treat these tools as an admin-equivalent surface when
  changing permissions.

## Error handling

| Layer | Behaviour |
| --- | --- |
| Worker entry `src/server.ts` | catches thrown errors and h3-swallowed JSON 500s (`{"unhandled":true,"message":"HTTPError"}`), logs the captured error and returns the branded HTML page from `src/lib/error-page.ts` |
| Request middleware `errorMiddleware` (`src/start.ts`) | same fallback for non-status errors |
| Router | `__root.tsx` `errorComponent` (localized, retry + go-home, reports via `src/lib/lovable-error-reporting.ts`) and `notFoundComponent` (localized 404) |
| Client mutations | `sonner` toasts with localized messages |
| Error capture | `src/lib/error-capture.ts` stores the last error for the worker wrapper |
| `ThemeProvider` | falls back to a default theme instead of throwing when context is missing (HMR safety) |

Loading states: TanStack Query `isLoading` branches, `SkeletonGrid`, spinners in the
admin gate, and `LazySection` deferral for below-the-fold content.

## Security posture (implemented)

- CSRF middleware on server functions; baseline security headers on every response
  (frame options intentionally omitted for the Lovable preview iframe).
- All anonymous writes: zod validation → sanitizers → rate limit → service-role
  insert.
- Private passport storage with server-generated paths and short-lived signed URLs.
- Audit trail via `log_audit_event()` trigger plus explicit `audit_logs` inserts in
  admin server functions.
- Roles isolated in `user_roles` + `SECURITY DEFINER has_role()`.

## Local development

```bash
bun install
bun run dev      # vite dev on :8080
bun run build    # production build
bun run lint
bun run format
node scripts/i18n-audit.mjs   # hardcoded-string / missing-key audit
```

Schema changes must go through the platform migration flow so
`supabase/migrations/` and `src/integrations/supabase/types.ts` stay in sync.

## Publishing

Publishing/deployment is handled by Lovable (Vite build → Worker bundle,
`src/server.ts` as fetch entry). Preview and production point at the same Supabase
project, so **content edited in preview is live data**. There is no staging
database, migration CI, or seed script for a fresh environment
(`UNKNOWN — VERIFY IN CODE` how a brand-new environment would be bootstrapped
beyond replaying `supabase/migrations/`).
