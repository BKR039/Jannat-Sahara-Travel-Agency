# 10 — Operations: Env, Integrations, Error Handling, Deployment

## Environment variables

| Variable | Scope | Used by |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | client (`import.meta.env`) | `src/integrations/supabase/client.ts` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | server (`process.env`) | `client.server.ts`, `auth-middleware.ts` |
| `RESEND_API_KEY` | server | `booking.functions.ts`, `flight-request.functions.ts` |
| `RESEND_FROM_EMAIL` | server | same (defaults to `onboarding@resend.dev`) |
| `BOOKING_NOTIFICATION_EMAIL` | server | booking + flight-request notification recipient |
| `VITE_SITE_URL` | client + SSR (`import.meta.env`) | `src/lib/seo.ts` — the production origin (e.g. `https://janatsahara.tn`) used for canonical links, `og:url` and `/sitemap.xml`. **Not a secret.** When unset, those URLs stay relative and the sitemap is served `no-store`; set it in production so canonicals are absolute. |

Rules: never prefix a secret with `VITE_`; read `process.env` inside handlers only.
The `.env` file and the Supabase vars are platform-managed. After changing an
unprefixed secret, **re-publish** for production to pick it up.

## Connecting a Supabase project

`.env.example` is the template — copy it to `.env` and fill in real values.
`.env` is git-ignored and must never be committed.

Run the preflight before trusting any environment:

```bash
node scripts/supabase-preflight.mjs     # or: npm run preflight
```

It is read-only. It checks the required variables, reaches the project, reports
which expected tables and storage buckets are missing, and — once a schema
exists — verifies that an anonymous visitor can read the public content and
**cannot** read bookings, requests, customers, notifications or private
settings. Exit code 0 means the deployment is genuinely connected. It never
prints a key or a row of customer data.

Bootstrapping a fresh project:

```bash
# 1. point supabase/config.toml and .env at the SAME project ref
npx supabase login                       # needs a personal access token
npm run db:link                          # links to VITE_SUPABASE_PROJECT_ID
npm run db:push                          # applies supabase/migrations in order
# -> stops at 20260816150000 on a fresh project. See "Owner bootstrap" below.
npm run db:push                          # re-run to apply the remainder
npm run db:status                        # confirms which migrations are applied
npm run preflight                        # verifies schema, buckets and RLS
```

### Owner bootstrap — expected mid-way stop

`20260816150000` (security fix X-02) removes the automatic super_admin grant and
refuses to run while nobody holds the role, so the agency cannot be locked out of
its own dashboard. On a brand-new project `auth.users` is empty at that point, so
the push stops with:

> Aborting: no super_admin exists in public.user_roles. Grant super_admin to the
> owner account first, then re-run this migration.

That is the guard working, not a broken migration. To continue: sign up the
owner's account and confirm the email while the earlier migrations are in place —
the bootstrap trigger installed by `20260728122029` grants super_admin on
confirmation — then re-run `npm run db:push`. The later migration then removes
that trigger, leaving the role assignable only by an existing super_admin.

If the owner address ever changes, grant the role manually with a one-off
statement instead of re-introducing an email-based trigger.

`supabase/migrations/20260821140000_*.sql` creates the two storage buckets
(`media` public-read, `passports` private) with the size and MIME limits the
application enforces. Storage policies alone do not create buckets, so without
it every upload fails with "Bucket not found" while the policies look correct.

### Seed data vs real business data

There is no seed script; `20260728105042` inserts the original placeholder
content. `20260821150000` then takes the fabricated records out of public
circulation without deleting them — invented testimonials become inactive and
demo packages return to draft, matched only by their stock-image hosts.

Still needs a human before launch: `contact_info` (placeholder phone, email and
address), `gallery_items` and `articles` (stock imagery and placeholder
editorial), and the seeded `branches` address and coordinates. `services`,
`features`, `site_settings` and `site_content` are structural defaults and are
safe to keep.

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
