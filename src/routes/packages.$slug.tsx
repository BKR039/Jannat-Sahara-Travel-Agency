import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, Users, Hotel, Plane, ArrowRight, CalendarRange } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/common/PackageCard";
import { Container, Section } from "@/components/common/Section";
import { LazyImage } from "@/components/common/LazyImage";
import {
  FactGrid,
  InclusionList,
  Itinerary,
  SectionHeading,
  Surface,
  type Fact,
} from "@/components/packages/detail-parts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { packageBySlugQuery, packagesQuery, faqsQuery } from "@/lib/queries";
import { pickLocalized, pickLocalizedList, useLocalized } from "@/lib/localize";
import { absoluteUrl, canonical, jsonLd } from "@/lib/seo";

const MEDIA =
  "https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency";

/**
 * The two cities every Umrah programme visits, illustrated with the agency's
 * own photographs. Names only — no hotel, no distance, no nightly split, none
 * of which the agency has published.
 */
const DESTINATIONS = [
  {
    key: "makkah",
    labelKey: "package.makkah",
    image: `${MEDIA}/makkah-kaaba-wide.jpg?width=900&quality=75&resize=contain`,
  },
  {
    key: "madinah",
    labelKey: "package.madinah",
    image: `${MEDIA}/madinah-nabawi-green-dome.jpg?width=900&quality=75&resize=contain`,
  },
] as const;

/**
 * Public listing page for a package category, or null when it has none.
 * `visa` deliberately has no entry: the public visa route was withdrawn.
 */
function listingFor(category: string): "/umrah" | "/trips" | "/flights" | null {
  if (category === "umrah") return "/umrah";
  if (category === "trip") return "/trips";
  if (category === "flight") return "/flights";
  return null;
}

/** Price the page actually displays, so metadata never contradicts the UI. */
function displayedPrice(pkg: { price: number; discount: number | null }): number {
  const base = Number(pkg.price);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const pct = Number(pkg.discount ?? 0);
  return pct > 0 ? base * (1 - pct / 100) : base;
}

export const Route = createFileRoute("/packages/$slug")({
  /*
   * A slug with no programme behind it is a 404, and it has to be decided here.
   *
   * The component also throws `notFound()`, but by then the server has already
   * answered 200: `/packages/anything-at-all` returned a rendered page with a
   * self-referencing canonical and no `noindex`, so a crawler could index an
   * unlimited number of programmes that do not exist. Throwing from the loader
   * settles it before the response status is written.
   */
  loader: async ({ context, params }) => {
    const pkg = await context.queryClient.ensureQueryData(packageBySlugQuery(params.slug));
    if (!pkg) throw notFound();
    return pkg;
  },
  head: ({ params, loaderData }) => {
    const path = `/packages/${params.slug}`;
    const url = absoluteUrl(path);
    const pkg = loaderData ?? null;

    // No row (404 / not yet loaded): keep the generic head, nothing invented.
    if (!pkg) {
      return {
        meta: [
          { title: i18n.t("seo.packageDetail.title") },
          { property: "og:type", content: "product" },
        ],
        links: [canonical(path)],
      };
    }

    const lang = i18n.language;
    const row = pkg as unknown as Record<string, unknown>;

    // Title: seo_title → localized package title → agency fallback.
    const title =
      pickLocalized(row, "seo_title", lang) ||
      pickLocalized(row, "title", lang) ||
      i18n.t("seo.packageDetail.title");

    // Description: seo_description → short_description → description → fallback.
    const description =
      pickLocalized(row, "seo_description", lang) ||
      pickLocalized(row, "short_description", lang) ||
      pickLocalized(row, "description", lang) ||
      i18n.t("seo.packageDetail.description");

    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];

    const keywords = pickLocalizedList(row, "seo_keywords", lang)
      .filter((k) => typeof k === "string" && k.trim())
      .join(", ");
    if (keywords) meta.push({ name: "keywords", content: keywords });

    const cover = typeof pkg.cover === "string" ? pkg.cover : "";
    if (cover.startsWith("https://")) {
      meta.push({ property: "og:image", content: cover });
      meta.push({ property: "og:image:alt", content: title });
      meta.push({ name: "twitter:image", content: cover });
    }

    // Structured data built only from fields the agency actually filled in.
    // No availability, ratings, reviews or inventory are claimed.
    const product: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: pickLocalized(row, "title", lang) || title,
      url,
    };
    if (description) product["description"] = description;
    if (cover.startsWith("https://")) product["image"] = cover;
    const destination = pickLocalized(row, "destination", lang);
    if (destination) product["category"] = destination;

    const amount = displayedPrice(pkg);
    if (amount > 0) {
      product["offers"] = {
        "@type": "Offer",
        price: amount.toFixed(2),
        priceCurrency: pkg.currency ?? "TND",
        url,
      };
    }

    return {
      meta,
      links: [canonical(path)],
      scripts: [{ type: "application/ld+json", children: jsonLd(product) }],
    };
  },
  component: PackagePage,
});

function PackagePage() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();
  const { L, list, price } = useLocalized();
  const { data: pkg, isLoading } = useQuery(packageBySlugQuery(slug));
  const { data: allPackages } = useQuery(packagesQuery());
  const { data: faqs } = useQuery(faqsQuery());

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 py-16">
          <div className="aspect-[16/9] rounded-lg bg-muted" />
          <div className="h-8 w-1/2 rounded bg-muted" />
        </div>
      </SiteLayout>
    );
  }

  if (!pkg) throw notFound();

  const gallery = (pkg.gallery as string[]) ?? [];
  const included = list<string>(pkg, "included");
  const excluded = list<string>(pkg, "excluded");
  const timeline = list<{ day: string; title: string; description: string }>(pkg, "timeline");
  const discounted =
    pkg.discount && pkg.discount > 0 ? Number(pkg.price) * (1 - Number(pkg.discount) / 100) : null;
  // A programme whose price the agency has not set yet shows no price at all.
  // Rendering the unset 0 would advertise a free trip. The JSON-LD `offers`
  // block already guards on the same condition.
  const hasPrice = Number(pkg.price) > 0;
  const related = (allPackages ?? [])
    .filter((p) => p.category === pkg.category && p.id !== pkg.id)
    .slice(0, 4);
  const faqList = (faqs ?? []).slice(0, 6);

  const dates = L(pkg, "short_description", "empty");
  const duration = L(pkg, "duration", "empty");
  const destination = L(pkg, "destination", "empty");
  const isUmrah = pkg.category === "umrah";
  const priceText = price(discounted ?? Number(pkg.price), pkg.currency ?? "TND");

  /*
   * Every published fact, once.
   *
   * These four values used to be built into three separate lists and rendered
   * three times on the same screen — a summary strip, a details table and the
   * sticky booking card — so a programme with four published fields produced
   * twelve rows of the same information. There is now one list; the hero
   * carries the two that decide whether to keep reading, and the booking card
   * carries the price and the action only.
   *
   * An entry is dropped unless the agency has actually published the field, so
   * a sparsely-filled programme renders a short honest panel rather than a
   * long invented one.
   */
  const facts: Fact[] = [
    dates && { key: "dates", icon: CalendarRange, label: t("package.dates"), value: dates },
    duration && { key: "duration", icon: Clock, label: t("package.duration"), value: duration },
    destination && {
      key: "destination",
      icon: MapPin,
      label: t("package.destination"),
      value: destination,
    },
    L(pkg, "hotel", "base") && {
      key: "hotel",
      icon: Hotel,
      label: t("package.hotel"),
      value: L(pkg, "hotel", "base"),
    },
    L(pkg, "airline", "base") && {
      key: "airline",
      icon: Plane,
      label: t("package.airline"),
      value: L(pkg, "airline", "base"),
    },
    typeof pkg.seats === "number" &&
      pkg.seats > 0 && {
        key: "seats",
        icon: Users,
        label: t("package.seats"),
        value: String(pkg.seats),
      },
  ].filter(Boolean) as Fact[];

  const bookLink = (
    <Link to="/booking" search={{ pkg: pkg.slug }}>
      {t("actions.bookNow")}
    </Link>
  );

  return (
    <SiteLayout>
      {/* ------------------------------- hero -------------------------------- */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {pkg.cover && (
            <img
              src={pkg.cover}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              sizes="100vw"
              className="h-full w-full object-cover"
            />
          )}
          {/*
           * A scrim, not a curtain. This was `from-black/40 to-black/85`,
           * which turned the Kaaba into a silhouette — the one photograph on
           * the page, mostly painted out. It now darkens from the bottom only,
           * enough to carry white text over it while the image stays the image.
           */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/20" />
        </div>

        <Container className="py-12 text-on-dark md:py-16">
          {listingFor(pkg.category) && (
            <Link
              to={listingFor(pkg.category)!}
              className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-on-dark/85 transition-colors hover:text-on-dark"
            >
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {t("actions.viewAll")}
            </Link>
          )}

          <span className="inline-block rounded-badge border border-on-dark/30 bg-on-dark/10 px-3 py-1 text-caption font-semibold backdrop-blur">
            {t(`categories.${pkg.category}`)}
          </span>

          <h1 className="mt-4 max-w-3xl text-h2 font-extrabold leading-[1.25] [overflow-wrap:anywhere]">
            {L(pkg, "title")}
          </h1>

          {/* The two facts that decide whether to read on. Everything else
              waits for the overview below. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-body font-semibold">
            {dates && (
              <span className="inline-flex items-center gap-2">
                <CalendarRange className="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
                {dates}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-2 opacity-90">
                <Clock className="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
                {duration}
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="min-w-[12rem]">
              {bookLink}
            </Button>
            {hasPrice && (
              <p className="text-on-dark/90">
                <span className="text-caption uppercase tracking-wide opacity-80">
                  {t("package.from")}
                </span>{" "}
                <span className="text-h5 font-extrabold">{priceText}</span>{" "}
                <span className="text-caption opacity-80">{t("package.perPerson")}</span>
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* --------------------- main column + booking aside -------------------- */}
      <Container className="py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
          <div className="min-w-0 space-y-12">
            {/* ------------------------ overview ------------------------- */}
            {(L(pkg, "description", "empty") || facts.length > 0) && (
              <section aria-labelledby="trip-overview">
                <SectionHeading id="trip-overview" title={t("package.overview")} />
                {L(pkg, "description", "empty") && (
                  <p className="mb-5 max-w-2xl text-body leading-relaxed text-foreground/90">
                    {L(pkg, "description", "empty")}
                  </p>
                )}
                <FactGrid facts={facts} />
              </section>
            )}

            {/* ----------------------- destinations ---------------------- */}
            {isUmrah && (
              <section aria-labelledby="trip-destinations">
                <SectionHeading
                  id="trip-destinations"
                  title={t("package.destinations")}
                  description={t("package.destinationsNote")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {DESTINATIONS.map((d) => (
                    <figure
                      key={d.key}
                      className="relative overflow-hidden rounded-card border border-border-subtle"
                    >
                      <LazyImage
                        src={d.image}
                        alt={t(d.labelKey)}
                        wrapperClassName="aspect-[16/10] w-full"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-body font-bold text-on-dark">
                        {t(d.labelKey)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* ------------------------ itinerary ------------------------ */}
            {timeline.length > 0 && (
              <section aria-labelledby="trip-timeline">
                <SectionHeading id="trip-timeline" title={t("package.timeline")} />
                <Itinerary steps={timeline} />
              </section>
            )}

            {/* ------------------------ inclusions ----------------------- */}
            {(included.length > 0 || excluded.length > 0) && (
              <section aria-labelledby="trip-included">
                <SectionHeading id="trip-included" title={t("package.included")} />
                <Surface className="grid gap-8 p-5 sm:p-6 md:grid-cols-2">
                  <InclusionList
                    title={t("package.included")}
                    items={included}
                    variant="included"
                  />
                  <InclusionList
                    title={t("package.excluded")}
                    items={excluded}
                    variant="excluded"
                  />
                </Surface>
              </section>
            )}

            {/* -------------------------- gallery ------------------------ */}
            {gallery.length > 0 && (
              <section aria-labelledby="trip-gallery">
                <SectionHeading id="trip-gallery" title={t("package.gallery")} />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="aspect-square rounded-card border border-border-subtle object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ------------------ important information ------------------ */}
            <section aria-labelledby="trip-info">
              <SectionHeading id="trip-info" title={t("package.importantInfo")} />
              <div className="space-y-4">
                {faqList.length > 0 && (
                  <Accordion
                    type="single"
                    collapsible
                    className="rounded-card border border-border-subtle bg-card px-4"
                  >
                    {faqList.map((f) => (
                      <AccordionItem key={f.id} value={f.id}>
                        <AccordionTrigger className="min-h-11 text-start text-small font-semibold">
                          {L(f, "question")}
                        </AccordionTrigger>
                        <AccordionContent className="text-small leading-relaxed text-muted-foreground">
                          {L(f, "answer")}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
                <Surface className="p-5 sm:p-6">
                  <h3 className="mb-2 text-small font-bold text-foreground">
                    {t("package.terms")}
                  </h3>
                  <p className="text-small leading-relaxed text-muted-foreground">
                    {t("bookingFlow.review.terms")} {t("bookingFlow.confirm.noPayment")}
                  </p>
                </Surface>
              </div>
            </section>
          </div>

          {/*
           * Booking card: the price and the action, and nothing that is
           * already answered in the overview above. It used to restate every
           * fact on the page a second time.
           */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Surface tinted className="p-6">
                {hasPrice ? (
                  <>
                    <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("package.from")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-h3 font-extrabold text-primary">{priceText}</span>
                      {discounted !== null && (
                        <span className="text-small text-muted-foreground line-through">
                          {price(Number(pkg.price), pkg.currency ?? "TND")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      {t("package.perPerson")}
                    </p>
                  </>
                ) : (
                  /* No price published — say so rather than showing an unset 0
                     as if the programme were free. */
                  <p className="text-small font-semibold leading-relaxed text-foreground">
                    {t("package.priceOnRequest")}
                  </p>
                )}

                <Button asChild size="lg" fullWidth className="mt-5">
                  {bookLink}
                </Button>
                <p className="mt-3 text-caption leading-relaxed text-muted-foreground">
                  {t("bookingFlow.confirm.noPayment")}
                </p>
              </Surface>
            </div>
          </aside>
        </div>
      </Container>

      {/*
       * Closing invitation on a warm surface rather than a solid orange band.
       * The brand gradient stays on the button, where it marks the action.
       */}
      <Section space="sm" tone="sunken">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="text-h3 font-extrabold text-balance text-foreground">
            {t("package.ctaTitle")}
          </h2>
          <p className="text-body leading-relaxed text-muted-foreground">{t("package.ctaDesc")}</p>
          <Button asChild size="lg" className="mt-1 min-w-[14rem]">
            {bookLink}
          </Button>
        </div>
      </Section>

      {related.length > 0 && (
        <Container className="pb-20">
          <SectionHeading title={t("package.related")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        </Container>
      )}

      {/* Mobile booking bar. Genuinely floating, so it keeps its shadow. */}
      <div className="sticky bottom-0 z-40 border-t border-border-subtle bg-card/95 p-3 shadow-[0_-4px_16px_-8px_hsl(0_0%_0%/0.15)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {hasPrice ? (
              <>
                <p className="text-caption text-muted-foreground">{t("package.from")}</p>
                <p className="truncate text-h5 font-extrabold text-primary">{priceText}</p>
              </>
            ) : (
              <p className="truncate text-small font-semibold text-foreground">
                {t("package.priceOnRequest")}
              </p>
            )}
          </div>
          <Button asChild size="lg" className="shrink-0">
            {bookLink}
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
