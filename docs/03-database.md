# 03 — Database

Source of truth: `supabase/migrations/*.sql` (chronological) and the generated
`src/integrations/supabase/types.ts` (never edit either by hand; schema changes go
through the migration tool).

## Enums

| Enum | Values |
| --- | --- |
| `public.package_category` | `umrah`, `trip`, `flight`, `visa` |
| `public.package_status` | `draft`, `published`, `archived` |
| `public.app_role` | created as `('admin')`, later extended — code uses `super_admin`, `admin`, `staff` (`src/hooks/useAuth.ts`). Verify the current enum labels with the migration that altered the type before relying on a value. |

## Tables (as present in `types.ts`)

Content / CMS:

| Table | Role |
| --- | --- |
| `packages` | Trips/Umrah/visa/flight offers. Rich columns: pricing (`price`, `discount`, `discount_price`, `child_price`, `infant_price`, `currency`), logistics (`destination`, `city`, `country`, `duration`, `departure_date`, `return_date`, `hotel`, `hotel_rating`, `airline`, `transport`, `meeting_point`, `seats`, `total_seats`), JSON arrays (`gallery`, `included`, `excluded`, `timeline`, `required_documents`), media (`cover`, `brochure_pdf`), SEO (`seo_title`, `seo_description`, `seo_keywords`), plus `status`, `featured`, `sort_order` and `_fr`/`_en` translations of most text columns |
| `articles` | Blog posts (`published`, `published_at`, `slug`) |
| `gallery_items`, `testimonials`, `faqs`, `services`, `features` | Homepage/site content, each with `active` + `sort_order` |
| `site_content` | Keyed content blocks (e.g. `hero`) with `title/subtitle/body/image/cta_label/cta_href/data` and `_fr`/`_en` |
| `site_stats` | Homepage counters (`label`, `value`, `icon`) |
| `contact_info` | Keyed contact rows (`address`, `phone`, `mobile`, `email`, `hours`, `facebook`, `instagram`, `whatsapp`) |
| `branches` | Offices: `name`, `city`, `address`, `phone`, `email`, `latitude`, `longitude`, `working_hours`, `google_maps_url`, `image`, `is_main_branch`, `is_active`, `sort_order`, `_fr`/`_en` |
| `site_settings` | Flat key/value store: `key`, `value`, `group` |

Operations:

| Table | Role |
| --- | --- |
| `bookings` | Visitor reservations; `people` CHECK 1–50, `status` default `new` (free text), later columns `payment_status`, `paid_amount`, `customer_notes` |
| `booking_passengers` | Per-passenger rows for a booking |
| `flight_requests` | Quote inquiries with unique `reference`; CHECK constraints on `status` (`new|contacted|waiting|quoted|confirmed|cancelled`), `trip_type` (`one_way|round_trip`), `cabin_class` (`economy|premium_economy|business|first`); plus `internal_notes`, `assigned_to`, `admin_reply`, `completed_at` |
| `contact_messages` | Contact form submissions, `handled` flag |
| `newsletter_subscribers` | Email subscriptions |
| `customer_notes` | CRM notes attached to a customer identity |
| `notifications` | In-dashboard notification feed (`kind`, `title`, `body`, `entity`, `entity_id`, `read_at`) |
| `audit_logs` | Written by the `log_audit_event()` trigger and by admin server functions |
| `rate_limits` | Fixed-window rate-limit ledger (service-role only) |
| `user_roles` | `user_id` + `role` (`app_role`) — the only place roles live |

## Functions & triggers

- `public.tg_set_updated_at()` / `public.update_updated_at_column()` — `BEFORE UPDATE`
  triggers on most tables to maintain `updated_at`.
- `public.has_role(_user_id uuid, _role app_role)` — `SECURITY DEFINER`, `STABLE`,
  `search_path = public`. Used by nearly every RLS policy.
- `public.is_admin(_user_id)` and `public.is_super_admin(_user_id)` — helper
  predicates exposed in `types.ts`.
- `public.log_audit_event()` — generic audit trigger, attached with a `DO` loop over
  a table list including `packages`, `bookings`, `branches`, `site_settings`,
  `contact_info` and others (see `20260803114158_*.sql`).
- Notification triggers — insert into `public.notifications` on new bookings and new
  contact messages (`20260728122029_*.sql`, lines ~170–200).
  `KNOWN LIMITATION`: `site_settings` has `notify_*` keys
  (`notify_new_booking`, `notify_new_message`, `notify_newsletter`,
  `notify_daily_digest`) but the DB triggers do not read them — the toggles are
  stored and displayed, and are `NOT CONNECTED` to trigger behaviour. A daily
  digest job does not exist in the repo.

## RLS and grants — the pattern

Every table has RLS enabled. Two shapes dominate:

1. **Public content** — anonymous SELECT filtered by a publish flag:
   - `packages_public_read`: `USING (status = 'published')`
   - `articles_public_read`: `USING (published = true)`
   - `services/features/testimonials/gallery/faqs_public_read`: `USING (active = true)`
   - `site_content`, `site_stats`, `contact_info`, `site_settings`,
     `branches_public_read`: `USING (true)` (branches additionally filtered in the
     query by `is_active`).
   - Writes on these tables are `TO authenticated USING/ WITH CHECK
     has_role(auth.uid(),'admin')` — e.g. `site_settings_admin_write`,
     `branches_admin_all`.
2. **Lead tables** — anonymous INSERT, admin-only read/update/delete:
   - `bookings_public_insert` (`WITH CHECK (true)`) + `bookings_admin_select/update/delete`
   - `contact_messages_public_insert` + admin select/update/delete
   - `booking_passengers`: "Anyone can create passengers for a booking" +
     staff view/update, admin delete
   - `newsletter_subscribers`: "Anyone can subscribe" + admin read
   - `flight_requests`: **no public insert policy** — inserts happen only through
     the service-role server function. Grants are `SELECT, UPDATE, DELETE` to
     `authenticated` and `ALL` to `service_role`.
   - `user_roles`: `user_roles_self_read` (a user may read their own roles) — this
     is what `useUserRoles` relies on.
   - `notifications`: `notifications_admin_all`.
   - `rate_limits`: service-role only.

`site_settings` is publicly readable (`USING (true)`) because brand/SEO/contact
values are rendered on the public site. `KNOWN LIMITATION`: do not store secrets or
private operational values in `site_settings` — anonymous visitors can read every
row, including `notify_*` and email-recipient settings.

Grants follow the required pattern (`GRANT SELECT ... TO anon` only for public
tables, `GRANT ALL ... TO service_role` everywhere used by server code).

## Storage

| Bucket | Visibility | Policies |
| --- | --- | --- |
| `passports` | private | `passports_public_upload` (insert), `passports_admin_read`, `passports_admin_delete` |

Reads always go through signed URLs minted server-side.

## Indexes

Notable: `bookings_status_idx`, `idx_branches_active_sort`,
`idx_notifications_created`, partial `idx_notifications_unread WHERE read_at IS NULL`.
