# 05 — Public Website

## Routes

| Route file | URL | Content source |
| --- | --- | --- |
| `index.tsx` | `/` | Hero (`site_content` key `hero`) + booking widget + stats + featured packages + services + features + testimonials + gallery preview + latest articles + branches/contact + CTA |
| `about.tsx` | `/about` | `site_content` / static localized copy |
| `umrah.tsx` | `/umrah` | `packagesQuery("umrah")` via `PackagesPage` |
| `umrah_.builder.tsx` | `/umrah/builder` | Custom Umrah package builder (7-step wizard, nights auto-rebalancing, catalogue & custom hotels, transit/stopover flights, full configuration snapshot preservation upon lead submission, high-intent lead creation in Sales Center, and celebratory success state) |
| `trips.tsx` | `/trips` | `packagesQuery("trip")` |
| `visa.tsx` | `/visa` | `packagesQuery("visa")` |
| `flights.tsx` | `/flights` | Flight **request** engine (no static flight cards) |
| `packages.$slug.tsx` | `/packages/$slug` | `packageBySlugQuery(slug)` |
| `booking.tsx` | `/booking` | Booking flow for a selected package |
| `booking-success.tsx` | `/booking-success` | Confirmation screen |
| `gallery.tsx` | `/gallery` | `galleryQuery()` + `ImageLightbox` |
| `blog.tsx`, `blog_.$slug.tsx` | `/blog`, `/blog/$slug` | `articlesQuery`, `articleBySlugQuery`, helpers in `src/lib/blog.ts`. Premium editorial layout with Table of Contents (sticky rail on desktop, collapsible index on mobile), reading column constraint (max-w 780px), reading progress bar, semantic components (`MiqatGrid`, `SaiTimeline`, `InteractiveChecklist`, `PrayerCard`, `CalloutBox`), and Umrah CTA banner (`UmrahCtaBanner`). |
| `faq.tsx` | `/faq` | `faqsQuery()` |
| `contact.tsx` | `/contact` | Premium 5-step progressive consultation lead capture experience ("خلّي فريق جنة الصحراء يتصل بيك"): Step 1 Contact Info (name, phone, 24 Tunisian governorates), Step 2 Trip interest with query param pre-selection (`?trip=`), Step 3 Interest tags, Step 4 Contact channel preference, Step 5 Preferred contact time & notes, with honeypot anti-spam, duplicate protection, and dedicated confirmation screen with direct WhatsApp shortcut |
| `legal.privacy.tsx`, `legal.terms.tsx` | `/legal/privacy`, `/legal/terms` | Static localized copy |

Shared chrome: `SiteLayout` = `Navbar` (with `LanguageSwitcher`, `ThemeToggle`,
`PackageDropdown` entry points) + `Footer` (contact info, social links from
`contact_info`, newsletter subscribe form).

## Read path

All public reads use the browser Supabase client through the query-option factories
in `src/lib/queries.ts`:

`packagesQuery`, `packageBySlugQuery`, `statsQuery`, `servicesQuery`,
`featuresQuery`, `testimonialsQuery`, `galleryQuery`, `articlesQuery`,
`articleBySlugQuery`, `faqsQuery`, `contentQuery(key)`, `contactInfoQuery`,
`branchesQuery`.

Each factory already applies the publish filter that mirrors RLS
(`status = 'published'`, `active = true`, `published = true`) and `sort_order`
ordering. **Add new public reads here**, not inline in components.

## Homepage sections

`src/components/sections/HomeSections.tsx` exports memoized sections
(`ServicesSection`, `FeaturesSection`, `TestimonialsSection`,
`GalleryPreviewSection`, `LatestArticlesSection`, `CtaSection`), composed by
`src/routes/index.tsx` together with `HeroSection`, `PackageSelector` (hero booking
widget with the virtualized `PackageDropdown`), `StatsSection` and
`BranchesSection`.

Performance helpers: `LazySection` (`useInView`) defers below-the-fold sections,
`LazyImage` handles lazy loading, `SkeletonGrid` covers loading states.

## Contact & branches

`src/components/sections/BranchesSection.tsx` is the unified luxury contact card:

- branch selector list ↔ `BranchesMap.tsx` (Leaflet, client-only, smooth fly-to);
- an active-branch information bar (circular WhatsApp / call / directions / copy
  actions, hours, phone, email, address);
- general contact block and the contact form below the map;
- emits **LocalBusiness JSON-LD**.

The map only renders `branches` rows with `is_active = true`, ordered
`is_main_branch desc, sort_order asc`.

## Public write endpoints used by the site

| UI | Server function |
| --- | --- |
| Contact form (`contact.tsx`, `BranchesSection`) | `submitContactMessage` |
| Footer newsletter | `subscribeNewsletter` |
| Booking flow step 2 | `uploadPassport` |
| Booking flow submit | `submitBooking` |
| Flight request form | `submitFlightRequest` |
| Umrah builder (`umrah_.builder.tsx`) | `submitCustomPackageRequest` |

See `07-workflows.md` for the full flows.

## SEO

- Head metadata per route via the TanStack `head()` option; strings come from
  i18next `seo.*` keys so titles/descriptions follow the active language.
  `src/routes/__root.tsx` sets the defaults (`og:type`, `og:site_name`,
  `twitter:card`, author, fonts).
- JSON-LD: blog list + article (`blog.tsx`, `blog.$slug.tsx`) and LocalBusiness
  (`BranchesSection`).
- `public/robots.txt` allows all major crawlers.
- `/admin` is `noindex, nofollow`.
- `KNOWN LIMITATION`: there is **no sitemap route** and no canonical-link tags in
  the repo (`sitemap.xml` is not generated). Head metadata is set per route, but
  `og:image` is only present where a route defines it.

## Accessibility & responsiveness

Radix primitives supply focus management and ARIA; interactive icons carry
`aria-label` (e.g. `LanguageSwitcher`). Layouts are Tailwind-responsive and audited
for both RTL (Arabic) and LTR (French/English) — logical properties (`me-`, `ps-`)
are used instead of left/right where direction matters.
