# Janna Sahara Admin — Travel Command Center

A full rebuild of the admin experience on top of the existing database. No data is deleted or migrated away; the public website keeps working exactly as it does today. Where the current schema is complex (packages with ~80 columns), the new admin puts a simple, opinionated layer on top of it.

## New navigation

```text
Main        Dashboard · Trips · Customers · Bookings · Requests · Messages
Management  Reports
System      Settings
```

Gallery, Blog, FAQ, Testimonials, Branches, Website content, SEO, Social, Email, Notifications, Security, Branding and Admins all move inside Settings (grouped as Website Management / Communication / System) instead of the main sidebar. Existing pages are reused as Settings panels, so nothing is lost.

Old URLs (`/admin/packages`, `/admin/gallery`, …) keep working via redirects so bookmarks don't break.

## Dashboard

- Header: logo, "Good morning, {owner}", global search, notifications, View website, profile menu.
- Quick actions row: Add Trip · Add Customer · View Bookings · View Requests.
- Exactly 4 KPI cards: Revenue this month, Bookings this month, Travelers, Upcoming trips — each with value, % change vs previous period, and a small sparkline.
- Smart Insights: 2–4 deterministic insights computed in one server function from real data (capacity pressure with a projected sell-out date, requests uncontacted > 24h, revenue trend, destination demand shift, low-occupancy departures, stalled requests). Severity: info / opportunity / attention / critical. Ordering is dynamic — a quiet business shows a calm dashboard.
- Recent registrations table: customer, trip, date, status, amount, quick action + View all.
- Upcoming trips: cover, title, departure, travelers / capacity, seats left, progress bar, status.

## Trips

Tabs: All · Umrah · Tourism · Upcoming · Completed · Drafts. Rows show cover, title, category, destination, departure, price, bookings/capacity, status, and row actions Edit / Duplicate / Preview / Archive. Duplicate is one click (copies everything, clears dates and marks draft).

### Add / edit trip — one screen

Left column, single scroll, autosave:

1. Basics: title, cover, trip type (Umrah / Tourism / Other), starting price, duration, departure date, optional return date. Nothing else required to publish.
2. Contextual accommodation: Umrah → compact Makkah + Madinah cards (hotel, location, nights, optional image, "add accommodation"). Tourism → destination legs (Tunis → Istanbul → Cappadocia) with hotel, location, nights, image.
3. Pricing: starting price, optional previous price/discount, payment note, and included-services toggles (Flight, Hotel, Transport, Visa, Meals, Activities).
4. Advanced options (collapsed): slug, SEO title/description, internal reference, meeting point, custom itinerary, notes.

Right column: live preview of the public package card/page, updating as you type, with Save draft and Publish.

Slug, status and other required DB columns are derived automatically from the title.

## Customers

Customers are derived from existing bookings, requests and messages (grouped by phone/email) — no new signup system. List: name, phone, email, last trip, bookings, status, total spent. Clicking opens a profile drawer with personal info, bookings, trips, payments, requests, communication history and notes, all in one place.

## Bookings, Requests, Messages

- Bookings grouped by trip with an occupancy header ("Umrah Mawlid — 38/45"), then customer, phone, travelers, payment status, booking status, created, actions. Statuses: pending, confirmed, paid, partially paid, cancelled.
- Requests: one unified inbox merging flight requests, trip inquiries and contact requests, with type, customer, date, status, assignee, last contact. A detail drawer handles view / contact / add quote / change status / internal note / mark confirmed, keeping the existing flight-request fields.
- Messages: single area with Unread · Pending · Resolved.

## Reports

Decision-oriented: revenue, bookings, travelers, best trips, best destinations, conversion rate, average booking value, monthly trend, upcoming capacity, customer acquisition. Simple charts only.

## Design system

New `src/components/admin/kit/` with KPI card, trip card, customer row, booking row, status badge, insight card, quick action, modal, drawer, form section, search, filter, date picker, empty state, skeleton, toast — all on Janna Sahara tokens (warm off-white, deep green, orange primary, cream surfaces, soft shadows, rounded cards) using semantic tokens only, no hardcoded colors.

RTL/LTR: logical properties throughout (`ms/me`, `ps/pe`, `inset-inline`), direction-aware icons; Arabic RTL, French LTR.

## Performance

Route-level code splitting, lazy charts and drawers, dashboard KPIs + insights in one batched server function, paginated and debounced lists, memoized rows, skeletons, optimistic status updates.

## Technical notes

- New/changed data access lives in server functions under `src/lib/admin/` guarded by the existing `requireSupabaseAuth` + role checks; RLS and `user_roles` permissions stay as they are.
- Payment status and booking payment amounts need small additive columns on `bookings` (`payment_status`, `paid_amount`) plus optional `assigned_to`/`last_contact_at` on requests, and a JSON `accommodation` field on packages for the simplified builder. All additive, all nullable, no existing data touched. One migration, shown for approval before it runs.
- Existing trip data continues to render on the public site unchanged; the accommodation builder writes into the new JSON field while the legacy hotel/timeline columns stay intact and readable.

## Delivery order

1. Design-system kit + new shell/IA + redirects
2. Dashboard (KPIs, insights, registrations, upcoming trips)
3. Trips list + fast trip editor with live preview and duplicate
4. Bookings, Requests inbox, Messages
5. Customers
6. Reports + Settings consolidation + performance/RTL pass
