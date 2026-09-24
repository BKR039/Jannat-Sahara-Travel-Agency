# 06 — Admin Dashboard

Entry: `/admin` (`src/routes/admin.tsx`, `ssr: false`, role-gated — see
`04-auth-and-permissions.md`). Chrome: `src/components/admin/AdminShell.tsx`
(workflow-based sidebar, notification bell with unread counts, language switcher).
Shared primitives: `src/components/admin/kit/index.tsx` and `ui.tsx`.

## Screens

| Route | Purpose | Data path |
| --- | --- | --- |
| `admin.index.tsx` | **Travel Command Center**: KPI cards (revenue, bookings, travellers, upcoming trips with 12-month series and deltas), monthly chart, Smart Insights, recent bookings, queue counters | `getCommandCenter` → `loadCommandCenter` (`dashboard.server.ts`, service role) |
| `admin.sales.tsx` | **Sales Center 2.0**: Operational, luxury travel agency sales workspace (focused 6-KPI grid, secondary performance strip, debounced multi-field search, primary & secondary filters with 5 quick saved views, table selection with master checkbox, floating bulk action bar [status, assign, archive, delete, export], RFC-4180 CSV import wizard with auto column mapping and duplicate detection, UTF-8 BOM CSV export, lead profile editor, soft archive & restore with reason tracking, protected deletion preserving customer identities, and comprehensive lead activities timeline) | `listLeads`, `getLead`, `updateLead`, `archiveLead`, `restoreLead`, `deleteLead`, `bulkUpdateLeadsStatus`, `bulkArchiveLeads`, `bulkDeleteLeads`, `assignLead`, `bulkAssignLeads`, `importLeadsBatch`, `listSalesAssignees`, `createManualLead`, `scheduleLeadFollowUp`, `recordLeadObjection`, `saveLeadOffer`, `convertLeadToBooking` (`leads.functions.ts`) |
| `admin.reports.tsx` | Operational Business Analytics dashboard: top KPIs (revenue, collected, outstanding, active bookings, customers, pending requests), 12-month paid vs outstanding collection trend, installment schedule analytics, packages performance, branch analytics, and deterministic actionable Smart Insights | `getReports` → `loadReports` (`dashboard.server.ts`, joins bookings, packages, installments, branches, customer profiles) |
| `admin.requests.tsx` | Unified request & booking inbox (custom Umrah, flight requests, confirmed/new bookings, contact messages) with live status & type counts, urgency pills, instant Call/WhatsApp shortcuts, deep-link support (`?request=`), and drawer detail | `listRequests` (`command.functions.ts` → `crm.server.ts`), real Supabase tables |
| `admin.flight-requests.tsx` | Operational flight inquiry inbox: preserves user-submitted freeform origin/destination strings, passenger breakdowns, instant contact shortcuts, CSV export, delete dialog, and deep-link support (`?request=`) | `listRequests` / `deleteRequest` (`command.functions.ts`), real `flight_requests` table |
| `admin.messages.tsx` | Contact messages, `handled` toggling | browser client on `contact_messages` |
| `admin.customers.tsx` | Full Customer CRM: unified customer identity across bookings, requests, and messages with persistent profiles (`customer_profiles`), interactive installment schedule (`installments`) with automatic paid toggle and balance recalculation, chronological timeline, internal notes, and public request linking | `listCustomers` / `getCustomer` / `toggleInstallment` / `addInstallment` / `updateCustomerProfile` (`command.functions.ts` → `crm.server.ts`) |
| `admin.packages.index.tsx` | Trips list (search, filters, duplicate, publish/draft) | browser client on `packages` |
| `admin.packages.$id.tsx` | Trip editor — `TripWizard` 3-step flow (Basics → adaptive Details → Review/Publish) with live preview and debounced auto-save; `PackageEditorPage.tsx` holds the richer field set | `src/components/admin/packages/*`, browser client |
| `admin.blog.tsx`, `admin.gallery.tsx`, `admin.testimonials.tsx`, `admin.faq.tsx` | Content CRUD with `active`/`published` toggles and `sort_order` | browser client |
| `admin.branches.tsx` | Operational Branch Management (single source of truth): 4-part categorized add/edit drawer, interactive active switch, main branch designation, Google Maps link testing, phone/WhatsApp shortcuts, and immediate real-time sync with public website & footer | browser client on `branches` with multi-query invalidation |
| `admin.notifications.tsx` | Notification feed: mark read / mark all read / delete | browser client on `notifications` |
| `admin.admins.tsx` | Team & roles | `listAdmins`, `inviteAdmin`, `removeUserRole` |
| `admin.settings.tsx` | Settings hub | see below |

## Settings Control Center

`src/routes/admin.settings.tsx` is built as a **Website Management Control Center** using a modern two-column desktop layout (large content workspace on the visual left, categorized navigation sidebar on the right) and a horizontal category carousel on mobile.

### Top Header & Live Status
- **Title & Subtitle**: `إعدادات الموقع` — تحكم مركزي في هوية الموقع، المحتوى، التواصل، والخيارات التشغيلية.
- **Status Indicator**: Live pulsating indicator `الموقع: متصل (Online)`.
- **Save Status**: Dynamic indicator displaying `لديك تغييرات غير محفوظة` when form state is dirty, and `آخر حفظ: HH:MM:SS` when persisted.
- **Header Actions**: Direct link to live public site `عرض الموقع` and embedded portal slot `#settings-save-slot` hosting the active category's save button and discard controls.
- **Unsaved Changes Guard**: `AlertDialog` prompt preventing accidental tab switching or loss of uncommitted edits.

### Information Architecture (4 Logical Groups — 11 Supported Categories)

1. **الموقع العام (Website)**:
   - `general`: Trilingual agency name (AR/FR/EN), tagline, real logo & favicon upload/preview/replace/remove to Supabase `media` bucket, head office address, localized working hours, and Google Maps URL.
   - `homepage`: Homepage CMS blocks (hero badge/title/subtitle/image, about text, stats, and CTA banner).
   - `brand`: Brand appearance, primary/secondary hex color pickers, and live interactive hero/nav preview stage.
   - `seo`: Default meta title, description, keywords, OpenGraph sharing image, canonical base URL, and indexing toggle.

2. **بيانات الأعمال والاتصال (Business)**:
   - `communication`: Operational contacts (landline phone, mobile, emergency, official email, WhatsApp) with instant test action buttons ("اتصال", "فتح واتساب", "إرسال بريد"), and email booking routing preferences.
   - `branches`: Dedicated interactive branch cards displaying name, address, phone, main branch status, active toggle (`branches.is_active`), Google Maps shortcut, and deep link to `/admin/branches`.
   - `social`: Verified links for Facebook, Instagram, TikTok, YouTube, LinkedIn, and Telegram.

3. **تنظيم المحتوى والتذييل (Content)**:
   - `navigation`: Visibility toggles for the 11 homepage sections (`hero`, `services`, `features`, `branches`, `gallery`, `blog`, `testimonials`, `faq`, `stats`, `about`, `cta`) with live enabled counter badge (`7/11`).
   - `footer`: Canonical global footer overview, live sync metrics for contact/branches/socials, and documented SADA Media Production credit preserving the canonical `href="#"` placeholder.

4. **النظام والأمان (System)**:
   - `security`: Active authenticated session details, self-service password reset form, and authorized admin team permissions summary.
   - `system`: Cloud services latency ping (PostgreSQL response time), `media` storage bucket status, JWT auth status, and cache purge action (`qc.invalidateQueries`).

Persistence:
- `contact_info` table: Flat key-value table with `value`, `value_fr`, `value_en` support.
- `site_settings` table: Grouped key-value table (`brand`, `seo`, `email`).
- `branches` table: Relational records with active and main branch flags.
- `site_sections`, `site_content`, `site_stats` tables: Homepage CMS and visibility controls.

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

## Trips (Packages) Management Rules

- **Unified Trip Editor** (`src/components/admin/packages/TripEditorPage.tsx`):
  - Shared operational fields (dates, price, currency, single cover image, real hotels, flight info) configured once without 3x multilingual duplication.
  - Multilingual content tabs (Arabic, French, English) restricted to Title and Short Description.
  - Auto-derived duration (`return_date - departure_date`).
  - Umrah packages link directly to Makkah and Madinah hotels from the real `hotels` database, populating both `accommodation` JSON (ID references) and `hotel` text summary for public website compatibility.
  - One-click Draft / Publish workflow with real-time customer preview card.
  - Quick actions in list (`/admin/packages`): Edit, Duplicate, Preview (`/packages/$slug`), Publish/Unpublish toggle, and Delete.

## Hotels Management Rules

- **Hotel Manager** (`src/routes/admin.hotels.tsx`, `src/lib/admin/hotels.functions.ts`):
  - City-first organization (All, Makkah, Madinah) with fast filtering and search.
  - Operational hotel records: Star rating (1-5★), exact location, neighborhood/area, Google Maps link (`/maps?q=...`), and single cover image.
  - Active/Inactive toggle: Inactive hotels are immediately hidden from public Umrah selectors and trip builder, while historical bookings/requests remain 100% intact.
  - Compact side drawer for fast creation and in-place editing.

## Admin write model

Most admin CRUD writes go directly from the browser with the signed-in user's token
and are authorized by RLS (`has_role(auth.uid(),'admin')`); the `log_audit_event()`
trigger records changes for the audited tables. Privileged operations (auth admin
API, passport signed URLs, aggregate loaders) run through server functions.

## Global Toggle / Switch Standards

All status switches across the admin dashboard use the standardized `StatusSwitch` component (`src/components/admin/kit/StatusSwitch.tsx`):
- Explicit boolean state handling (avoids stale-closure `!item.active` inversion bugs).
- Per-row pending state isolation (`isPending={pendingId === item.id}`): clicking one switch disables only that item and displays an inline spinner while all other switches remain responsive.
- Isolated coordinate direction (`dir="ltr"` on `SwitchPrimitives.Root` in `src/components/ui/switch.tsx`): prevents RTL thumb-overflow translations in Arabic viewports.
- Pure click targets: wrapped without nested `<label>` tags to prevent synthetic double-click event cancellation.
- Query invalidation and rollback: optimistically reflects change, invalidates active queries, and reverts on error with error toast.

## Unified Content Management System (CMS) Rules

The six public website content sections are managed through unified, responsive admin screens:
- `/admin/services` (Table: `services`, Public: `ServicesSectionBase` in `HomeSections.tsx`)
- `/admin/features` (Table: `features`, Public: `FeaturesSectionBase` in `HomeSections.tsx` & `HeroSection.tsx`)
- `/admin/gallery` (Table: `gallery_items`, Public: `/gallery` & `GallerySectionBase`): Rebuilt from the ground up as a focused **Media Library** with bulk multi-image uploads (1 to 50+ images), required group assignment (`category`), thumbnail preview queue with per-item cancellation, live upload progress with concurrency control, retry of failed uploads, group browsing with image counts, quick suggestions from packages, multi-selection, bulk group reassignment, and bulk deletion with automatic `media` storage cleanup. No per-image title or translation fields are required.
- `/admin/blog` (Table: `articles`, Public: `/blog`, `/blog/$slug`, `HomeSections.tsx`)
- `/admin/testimonials` (Table: `testimonials`, Public: `TestimonialsSectionBase` in `HomeSections.tsx`)
- `/admin/faq` (Table: `faqs`, Public: `/faq` & `/packages/$slug`)

### Architecture Standards for CMS Pages:
1. **Design Kit Consistency**: All screens use `Page`, `Panel`, `Dialog`, `Drawer`, `FilterTabs`, `SearchInput`, `EmptyState`, `ErrorState`, and `SkeletonRows` from `src/components/admin/kit`.
2. **Media Library Workflows**: Gallery uses a focused bulk upload dialog (`Add Images` → `Choose Group` → `Done`) avoiding redundant per-image metadata forms. Other CMS routes use structured drawers for articles, services, and FAQs.
3. **Structured Groupings**:
   - `CONTENT`: Multilingual text inputs via `LocalizedField` (Arabic default base, optional French and English; empty translations stored as `NULL` to preserve public fallbacks without auto-translation).
   - `VISUAL & MEDIA`: Dynamic icon selectors or real file uploads to Supabase storage bucket `media/` via `uploadMedia()` with live image preview and replacement.
   - `DISPLAY & METADATA`: Display sort order (`sort_order`), category/group tags, and active/published toggles.
4. **Cache Invalidation**: Mutations immediately invalidate both admin query keys (`admin-*`) and public query keys (`services`, `features`, `gallery`, `articles`, `testimonials`, `faqs`).

## Website Settings Control Center (`/admin/settings`)

The Settings hub has been rebuilt from first principles into a high-value, SaaS-grade **Settings Control Center** with a 2-column layout (Navigation Index on desktop, responsive tab carousel on mobile), top Status Bar, and sticky Save Bar:

1. **General (`general`)**:
   - Official agency name, working hours, head office address, Google Maps link, main operational phones, email, and WhatsApp (`contact_info`).
   - Dedicated link & summary pointer to `/admin/branches` (eliminating duplicate branch CRUD).
2. **Public Website / Visibility (`visibility`)**:
   - Central control of all 11 homepage sections (`hero`, `services`, `features`, `branches`, `gallery`, `blog`, `testimonials`, `faq`, `stats`, `about`, `cta`).
   - Single source of truth in `site_sections` table in Supabase.
   - Status indicators (`● معروض للزوار` / `○ مخفي حالياً`) with real toggle switches that immediately hide or restore sections on `src/routes/index.tsx` without deleting content.
   - Direct shortcuts to dedicated CMS pages (`/admin/services`, `/admin/features`, etc.).
3. **Homepage Content (`homepage`)**:
   - Centralized configuration of global blocks without reproducing CMS CRUD: Hero (headline, subtitle, image, cta, badges), About agency (title, subtitle, description, image), Statistics KPIs (`site_stats`), and Closing CTA (`site_content`).
   - Shortcuts banner guiding admins to dedicated content managers.
4. **Website Appearance (`brand`)**:
   - Logo, Favicon, Primary brand color with live picker, Secondary/Accent color with live picker, Tagline (`site_settings` group `brand`).
   - Interactive multi-device live preview.
5. **Contact & Communication (`communication`)**:
   - Centralized direct contact numbers (landline, mobile, email, WhatsApp, 24/7 emergency) (`contact_info`).
   - Email routing: Booking notification recipient, CC recipients, sender identity, reply-to, and subject prefix (`site_settings` group `email`).
   - Real alert delivery switches (`email_booking_enabled` and `notify_new_message`).
6. **SEO & Sharing (`seo`)**:
   - Website title, meta description, keywords, OpenGraph sharing image, canonical base URL, Google verification code, search engine indexing toggle (`site_settings` group `seo`).
   - Live Google-style SERP preview card.
7. **Social Media (`social`)**:
   - Official social links: Facebook, Instagram, TikTok, YouTube, LinkedIn, Telegram (`contact_info`).
   - URL validation and direct "Open / Test" link verification buttons.
8. **Security & Access (`security`)**:
   - Logged-in admin account status, confirmed email, last sign-in timestamp.
   - Current role and permission scope (Super Admin / Admin / Staff).
   - Password reset via secure email recovery link.
   - Team Members Hub direct link to `/admin/admins` (eliminating fake 2FA toggles or mock sliders).

## Team Members & Access Management (`/admin/admins`)

Production-grade team management interface built with `Page`, `Panel`, `MemberManageDrawer`, `MemberInviteDrawer`, `PermissionMatrixInspector`, and `PermissionGate`:
1. **Centralized Permission Enforcement**: Role default permissions merged with per-user custom overrides in `public.user_permissions`. Gated server-side on `requirePermission(context.userId, permission)` and `requireAdmin/requireSuperAdmin`.
2. **Account Lifecycle & Statuses**: Distinctly tracks and visualizes `ACTIVE` (`نشط`), `INVITED` (`مدعو`), and `DISABLED` (`معطل`) statuses alongside email verification indicators.
3. **Account Enable / Disable**: Toggling a member to disabled sets `ban_duration: '876000h'` and `app_metadata.disabled: true`. Server-side `assertActiveUser` checks this on every call and immediately throws `AuthorizationError` for disabled accounts.
4. **Last Super Admin Protection**: Server-side counts active `super_admin` rows; strictly prevents demoting, disabling, or deleting the last Super Admin to prevent administrative lockout.
5. **Self-Destruction Safeguards**: Prevents Super Admin from deleting or disabling their own active account.
6. **Secure Password Management**: Super Admin triggers recovery links via `supabaseAdmin.auth.admin.generateLink({ type: 'recovery' })` and triggers recovery email via `resetPasswordForEmail`. Plaintext passwords are never stored or exposed in the browser.
7. **Granular Permission Matrix Inspector**: Visualizes inherited permissions vs custom user overrides, enabling Super Admins to customize granular access without modifying global roles.

## Customer CRM & Client Accounts (`/admin/customers`)

Production-grade CRM workspace for travel agency client management:
1. **Unified Client Identity**: Clients are deterministically identified by normalized contact credentials (`p:<phone>`, `e:<email>`, or `x:<rowId>`), unifying interactions across `bookings`, `booking_passengers`, `custom_package_requests`, `flight_requests`, and `contact_messages` without duplicate profiles.
2. **Real-Data Financial Workspace & Dual Payment Flows**:
   - **Dual Flow Support**: Supports both direct **Full Payment** (`isFullPayment: true`) and **Partial / Installment Payments**. Clients are never forced into installments when paying upfront.
   - **Authoritative Payment Recording**: `recordDirectPayment` records immediate payments in `installments` (status `'paid'`, exact `paid_at` timestamp), updates `bookings.paid_amount` and `bookings.payment_status` atomically.
   - **Strict Overpayment Validation**: Payments must be `> 0` and cannot exceed the outstanding balance (`total_price - paid_amount`). Overpayments are rejected server-side with `"المبلغ يتجاوز المبلغ المتبقي."`.
   - **Payment Lifecycle & Audit Trail**: Direct editing (`updateInstallmentRecord`) and safe removal (`deleteInstallmentRecord`) automatically recalculate parent booking balances and sync with customer financial summaries.
   - **Accurate Date Aggregation**: Real payments use actual transaction timestamps (`paid_at`) rather than `created_at`, ensuring financial reports accurately reflect monthly cash flow.
3. **Passenger & Passport Intelligence**: Queries `booking_passengers` directly and enriches booking rows, giving operators immediate access to traveller passport numbers, expiration dates, dates of birth, and nationalities inside the workspace drawer.
4. **Safe Archiving vs Hard Deletion**: Clients with booking, payment, or request histories cannot be hard-deleted to prevent orphaned financial records. Instead, a server-guarded `archiveCustomer` endpoint sets `status: 'inactive'`, preserving audit trails and financial consistency while cleaning active operational lists.
5. **Modular CRM Architecture**:
   - `CustomerStatsCards`: Real-time aggregate KPIs (Total Clients, Active Trips, Collected Payments, Remaining Balance, Overdue Installments).
   - `CustomerFilters`: Debounced search, dynamic city selector, and responsive segmented status pills (`all`, `active_trip`, `unpaid`, `overdue`, `customer`, `lead`, `vip`, `inactive`).
   - `CustomerList`: Dense desktop CRM table with instant call/WhatsApp actions + responsive mobile card layouts.
   - `CustomerWorkspaceDrawer`: Complete client dossier with 5 tabs: Trips & Bookings, Installments & Financials (with separated Received Payments and Scheduled Installments cards), Requests & Inquiries, Chronological Timeline, and Internal Notes.
   - `CustomerEditModal`: Resilient profile editor with boundary normalization for `notes` (string, null, empty string), lifecycle statuses (`lead`, `customer`, `vip`, `cancelled`, `inactive`) with explicit status precedence over automated heuristics.
6. **Security & Permissions**: Entire route gated by `<PermissionGate permission="customers.view">`. Sensitive write actions (`addCustomerNote`, `deleteCustomerNote`, `updateCustomerProfile`, `archiveCustomer`) require `customers.edit`. Financial payments and installment mutations require `bookings.edit`.
7. **Reports & Analytics Integration (`/admin/reports`)**:
   - Date-range filtering selector (`all`, `today`, `week`, `month`, `prev_month`, `year`) backed by server-calculated `periodKpis`.
   - Real transactional revenue computed from received payments (`installments` with status `paid` grouped by `paid_at`), with no double counting between booking totals and installments.
   - Unified query invalidation ensuring every payment mutation instantly updates Customer Financials, Dashboard KPIs, and Business Reports.



