import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localize";
import {
  servicesQuery,
  featuresQuery,
  testimonialsQuery,
  galleryQuery,
  articlesQuery,
} from "@/lib/queries";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Section } from "@/components/common/Section";
import { IconBadge } from "@/components/common/IconBadge";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { LazyImage } from "@/components/common/LazyImage";
import { ArticleDialog } from "@/components/common/ArticleDialog";
import { Link } from "@tanstack/react-router";
import { Star, ArrowRight, Sparkles, LayoutGrid, Camera, Newspaper, Phone } from "lucide-react";
import { serviceHref } from "@/lib/admin/content-rows";
import { cn } from "@/lib/utils";

/**
 * How many columns the service row uses, and how wide the row is allowed to
 * grow, for a given number of published services.
 *
 * The reported problem was a group of cards sitting off to one side. The cause
 * was a fixed `lg:grid-cols-4` holding three services: the fourth track stayed
 * empty, so the three cards packed against the start edge with a card-sized
 * hole beside them. Capping both the track count and the row width at the
 * number of cards actually published keeps the group centred (`mx-auto`) at
 * any count instead of only at four.
 */
const SERVICE_ROW = [
  "",
  "lg:max-w-sm lg:grid-cols-1",
  "lg:max-w-3xl lg:grid-cols-2",
  "lg:max-w-5xl lg:grid-cols-3",
  "lg:grid-cols-4",
] as const;

function ServicesSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(servicesQuery());
  if (!data?.length) return null;
  const row = SERVICE_ROW[Math.min(data.length, 4)];
  return (
    <Section>
      {/* Eyebrow and title used to be the same string, printed twice. */}
      <SectionHeading
        eyebrow={t("home.servicesEyebrow")}
        icon={LayoutGrid}
        title={t("home.services")}
        description={t("home.servicesDesc")}
      />
      <div className={cn("mx-auto grid gap-5 sm:grid-cols-2 lg:gap-6", row)}>
        {data.map((s, i) => (
          <Link
            key={s.id}
            to={serviceHref(s.slug)}
            className="group flex flex-col gap-[var(--space-4)] rounded-card border border-border-subtle bg-surface p-[var(--space-6)] transition-[transform,border-color,box-shadow] duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none ds-reveal"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <IconBadge name={s.icon} size="lg" interactive />
            <h3 className="text-card-title text-foreground">{L(s, "title", "base")}</h3>
            {L(s, "description", "empty") && (
              <p className="text-small leading-relaxed text-muted-foreground">
                {L(s, "description", "empty")}
              </p>
            )}
            <span className="mt-auto inline-flex items-center gap-1.5 text-caption font-semibold text-primary">
              {t("actions.learnMore")}
              <ArrowRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function FeaturesSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(featuresQuery());
  if (!data?.length) return null;
  return (
    <Section tone="sunken">
      <SectionHeading
        eyebrow={t("home.whyUsEyebrow")}
        icon={Sparkles}
        title={t("home.whyUs")}
        description={t("home.whyUsDesc")}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {data.map((f, i) => (
          <div
            key={f.id}
            className="flex gap-[var(--space-4)] rounded-card border border-border-subtle bg-surface p-[var(--space-6)] transition-[transform,border-color,box-shadow] duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm motion-reduce:transform-none ds-reveal"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <IconBadge name={f.icon} size="md" />
            <div className="min-w-0">
              <h3 className="mb-1 font-bold text-foreground">{L(f, "title")}</h3>
              {L(f, "description", "empty") && (
                <p className="text-small leading-relaxed text-muted-foreground">
                  {L(f, "description", "empty")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TestimonialsSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(testimonialsQuery());
  if (!data?.length) return null;
  return (
    <Section tone="dark">
      <SectionHeading
        eyebrow={t("home.testimonials")}
        icon={Star}
        title={t("home.testimonials")}
        description={t("home.testimonialsDesc")}
        className="[&_h2]:text-on-dark [&_p]:text-on-dark/80 [&_span]:border-on-dark/30 [&_span]:bg-on-dark/10 [&_span]:text-on-dark"
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {data.map((tst, i) => (
          <figure
            key={tst.id}
            className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-on-dark/10 p-6 shadow-sm backdrop-blur ds-reveal"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex gap-0.5 text-primary" aria-hidden="true">
              {Array.from({ length: tst.rating }).map((_, k) => (
                <Star key={k} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="text-small leading-relaxed opacity-95">
              {L(tst, "content", "base")}
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3 border-t border-on-dark/15 pt-4">
              {tst.avatar && (
                <LazyImage
                  src={tst.avatar}
                  alt=""
                  wrapperClassName="h-10 w-10 shrink-0 rounded-full"
                  sizes="40px"
                />
              )}
              <div className="min-w-0">
                <div className="text-small font-bold">{L(tst, "name", "base")}</div>
                {L(tst, "role", "empty") && (
                  <div className="text-caption opacity-75">{L(tst, "role", "empty")}</div>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/**
 * Editorial gallery.
 *
 * The old grid hard-coded "items 0 and 5 span two columns and two rows". With
 * `grid-cols-2` on mobile that made the feature tile the full viewport width,
 * and whenever the active row count was not exactly 8 the `row-span-2` left an
 * empty cell — the blank blocks in the reported screenshots.
 *
 * Every tile is square, including the feature: because the columns are equal
 * width, a 2x2 span is exactly as tall as two rows plus the gap between them,
 * so the four tiles beside it fill their cells with nothing left over. Letting
 * the feature size itself (`aspect-auto`) is what reopened the hole — it grew
 * past its two rows and the square tiles could not reach the bottom.
 *
 * The feature only appears from `sm` up and only with enough items to pack the
 * first two rows; below that the grid is uniformly square, which cannot gap.
 */
function GalleryPreviewSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(galleryQuery());
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

  // Rows with no usable image are dropped rather than rendered as empty boxes.
  const usable = (data ?? []).filter((g) => Boolean(g.image));
  if (usable.length === 0) return null;

  /*
   * Six tiles, because six is the count that leaves no hole at either
   * breakpoint: two columns on mobile is three exact rows, and three columns
   * with a 2x2 feature is nine cells for 4 + 5 — also exact. Any other count
   * ends the grid mid-row, which is what the trailing blank cells were.
   * Everything else is one tap away behind "view all".
   */
  const items = usable.slice(0, 6);
  const feature = items.length === 6;

  return (
    <Section>
      <SectionHeading
        eyebrow={t("home.galleryEyebrow")}
        icon={Camera}
        title={t("home.gallery")}
        description={t("home.galleryDesc")}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setPreview({ src: g.image, alt: L(g, "title", "base") })}
            aria-label={L(g, "title", "base") || t("home.gallery")}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-card border border-border-subtle bg-surface-sunken transition-shadow duration-base ease-standard hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ds-reveal",
              feature && i === 0 && "sm:col-span-2 sm:row-span-2",
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <LazyImage
              src={g.image}
              alt={L(g, "title", "base")}
              wrapperClassName="h-full w-full"
              sizes={
                feature && i === 0
                  ? "(max-width: 640px) 50vw, 50vw"
                  : "(max-width: 640px) 50vw, 25vw"
              }
              className="transition-transform duration-slow ease-emphasized group-hover:scale-[1.04]"
            />
            {L(g, "title", "base") && (
              <span className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/75 to-transparent p-3 text-small font-semibold text-on-dark opacity-0 transition-opacity duration-base group-hover:opacity-100">
                {L(g, "title", "base")}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline"
        >
          {t("actions.viewAll")}
          <ArrowRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
      <ImageLightbox
        src={preview?.src ?? null}
        alt={preview?.alt}
        onClose={() => setPreview(null)}
      />
    </Section>
  );
}

function LatestArticlesSectionBase() {
  const { t } = useTranslation();
  const { L, date } = useLocalized();
  const { data } = useQuery(articlesQuery(3));
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  if (!data?.length) return null;
  return (
    <Section tone="sunken">
      <SectionHeading
        eyebrow={t("home.articlesEyebrow")}
        icon={Newspaper}
        title={t("home.latestArticles")}
        description={t("home.latestArticlesDesc")}
      />
      <div className="grid gap-5 md:grid-cols-3 lg:gap-6">
        {data.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setOpenSlug(a.slug)}
            className="group flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface text-start transition-[transform,border-color,box-shadow] duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none ds-reveal"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {a.cover && (
              <LazyImage
                src={a.cover}
                alt=""
                wrapperClassName="aspect-[16/10] w-full"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="transition-transform duration-slow ease-emphasized group-hover:scale-[1.04]"
              />
            )}
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="text-caption text-muted-foreground">{date(a.published_at)}</div>
              <h3 className="line-clamp-2 text-card-title text-foreground group-hover:text-primary">
                {L(a, "title", "base")}
              </h3>
              {L(a, "excerpt", "empty") && (
                <p className="line-clamp-3 text-small leading-relaxed text-muted-foreground">
                  {L(a, "excerpt", "empty")}
                </p>
              )}
              <span className="mt-auto inline-flex items-center gap-1.5 text-caption font-semibold text-primary">
                {t("actions.readMore")}
                <ArrowRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </span>
            </div>
          </button>
        ))}
      </div>
      <ArticleDialog slug={openSlug} onClose={() => setOpenSlug(null)} />
    </Section>
  );
}

/**
 * Closing call to action.
 *
 * This component existed but was never mounted, and its copy did not match its
 * job: the heading read "featured packages", the body was the brand tagline and
 * the button was labelled "contact". It now says one thing and does it.
 */
function CtaSectionBase() {
  const { t } = useTranslation();
  return (
    <Section
      space="sm"
      className="relative isolate overflow-hidden bg-primary text-primary-foreground"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_15%,rgba(255,255,255,0.18),transparent)]"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <h2 className="text-h2 font-extrabold text-balance">{t("home.finalCtaTitle")}</h2>
        <p className="text-body-lg leading-relaxed opacity-95">{t("home.finalCtaDesc")}</p>
        <Link
          to="/contact"
          className="inline-flex h-12 items-center gap-2 rounded-button bg-surface px-8 text-small font-bold text-primary transition-[transform,box-shadow] duration-base ease-standard hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark motion-reduce:transform-none"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("contact.title")}
        </Link>
      </div>
    </Section>
  );
}

export const ServicesSection = memo(ServicesSectionBase);
export const FeaturesSection = memo(FeaturesSectionBase);
export const TestimonialsSection = memo(TestimonialsSectionBase);
export const GalleryPreviewSection = memo(GalleryPreviewSectionBase);
export const LatestArticlesSection = memo(LatestArticlesSectionBase);
export const CtaSection = memo(CtaSectionBase);
