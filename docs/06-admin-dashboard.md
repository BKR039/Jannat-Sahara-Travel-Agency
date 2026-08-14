# 06 — Admin Dashboard

Entry: `/admin` (`src/routes/admin.tsx`, `ssr: false`, role-gated — see
`04-auth-and-permissions.md`). Chrome: `src/components/admin/AdminShell.tsx`
(workflow-based sidebar, notification bell with unread counts, language switcher).
Shared primitives: `src/components/admin/kit/index.tsx` and `ui.tsx`.

## Screens

| Route | Purpose | Data path |
| --- | --- | --- |
| `admin.index.tsx` | **Travel Command Center**: KPI cards (revenue, bookings, travellers, upcoming trips with 12-month series and deltas), monthly chart, Smart Insights, recent bookings, queue counters | `getCommandCenter` → `loadCommandCenter` (`dashboard.server.ts`, service role) |
| `admin.reports.tsx` | Reports/analytics | `getReports` → `loadReports` |
| `admin.requests.tsx` | Unified inbox of incoming work | `listRequests` (`command.functions.ts`) |
| `admin.bookings.tsx` | Booking list, filters, status & payment updates, passport link | browser client reads/updates + `getPassportSignedUrl` |
| `admin.flight-requests.tsx` | Flight request management: status pipeline, internal notes, admin reply, export | browser client on `flight_requests` |
| `admin.messages.tsx` | Contact messages, `handled` toggling | browser client on `contact_messages` |
| `admin.customers.tsx` | CRM: customer identities aggregated from bookings/requests, notes | `listCustomers` → `crm.server.ts`, `customer_notes` |
| `admin.packages.index.tsx` | Trips list (search, filters, duplicate, publish/draft) | browser client on `packages` |
| `admin.packages.$id.tsx` | Trip editor — `TripWizard` 3-step flow (Basics → adaptive Details → Review/Publish) with live preview and debounced auto-save; `PackageEditorPage.tsx` holds the richer field set | `src/components/admin/packages/*`, browser client |
| `admin.blog.tsx`, `admin.gallery.tsx`, `admin.testimonials.tsx`, `admin.faq.tsx` | Content CRUD with `active`/`published` toggles and `sort_order` | browser client |
| `admin.branches.tsx` | Branch management — reuses `settings/BranchesSection.tsx` (single source of truth) | browser client on `branches` |
| `admin.notifications.tsx` | Notification feed: mark read / mark all read / delete | browser client on `notifications` |
| `admin.admins.tsx` | Team & roles | `listAdmins`, `inviteAdmin`, `removeUserRole` |
| `admin.settings.tsx` | Settings hub | see below |

## Settings system

`src/routes/admin.settings.tsx` renders a **Settings Overview hub** with scannable
cards grouped as **Agency / Website / Communication / System**, then a focused
editing view per section with a `← Settings` header and a compact `StatusPill`
save indicator (no sticky bottom save bar).

Sections in `src/components/admin/settings/`:

`GeneralSection`, `BrandSection`, `ContentSection` (homepage), `StatsSection`,
`SeoSection`, `ContactSection`, `BranchesSection`, `SocialSection`,
`EmailSection`, `NotificationsSection`, `TeamSection`, `SecuritySection`,
with shared field primitives in `parts.tsx`.

Persistence:

- `useSiteSettings(group, specs)` — generic editor over the flat `site_settings`
  key/value table: reads rows for the group, tracks dirty state, validates with
  `maxLen` / `numberRange` / `combine` validators, then `upsert`s and invalidates
  the `["site_settings"]` query key.
- `useContactSettings.ts` — same idea for `contact_info` rows.
- `StatsSection`, `BranchesSection`, `ContentSection` write to their own tables
  (`site_stats`, `branches`, `site_content`).

Notes and caveats:

- `SecuritySection` describes access/session policy but does not configure
  Supabase Auth — treat its copy as informational: `FRONTEND ONLY`.
- `NotificationsSection` persists `notify_*` keys that no trigger or job reads:
  `NOT CONNECTED`.
- `EmailSection` stores the recipient/sender preferences in `site_settings`, while
  the server functions read `BOOKING_NOTIFICATION_EMAIL` / `RESEND_FROM_EMAIL`
  from env. `KNOWN LIMITATION`: changing the email in Settings does not change
  where notifications are sent unless the env var is updated —
  `UNKNOWN — VERIFY IN CODE` if a later change wires the setting into the handler.

## Branch management rules

- Cards list all branches with obvious Edit and Activate/Deactivate actions.
- Only one branch may be `is_main_branch`; selecting a new main branch clears the
  previous one (business rule enforced in `BranchesSection`, not by a DB constraint —
  `KNOWN LIMITATION`).
- Validation is local and localized; the public map reflects changes on the next
  fetch.
- `admin.branches.tsx` and the Settings → Branches section render the **same**
  component; fix branch behaviour in one place.

## Smart Insights & KPIs

`src/lib/admin/dashboard.server.ts` (service role, ~458 lines) computes:

- monthly revenue/bookings/travellers series and month-over-month deltas,
- queue counters (new bookings, new flight requests, unread messages),
- six insight kinds, e.g. `stale-requests` (uncontacted > 24 h) and
  `revenue-trend`, each with severity, title, body, href and action label.

Insight text is produced **server-side in a single language** (English strings in
the current implementation). `KNOWN LIMITATION`: insights do not follow the admin's
selected interface language.

## Admin write model

Most admin CRUD writes go directly from the browser with the signed-in user's token
and are authorized by RLS (`has_role(auth.uid(),'admin')`); the `log_audit_event()`
trigger records changes for the audited tables. Privileged operations (auth admin
API, passport signed URLs, aggregate loaders) run through server functions.
