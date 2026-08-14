import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localize";
import { servicesQuery, featuresQuery, testimonialsQuery, galleryQuery, articlesQuery } from "@/lib/queries";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { LazyImage } from "@/components/common/LazyImage";
import { ArticleDialog } from "@/components/common/ArticleDialog";
import { Link } from "@tanstack/react-router";
import { Star, ArrowLeft } from "lucide-react";


function ServicesSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(servicesQuery());
  if (!data?.length) return null;
  return (
    <section className="bg-surface-sunken/50 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          eyebrow={t("home.services")}
          title={t("home.services")}
          description={t("home.servicesDesc")}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((s, i) => (
            <Link
              key={s.id}
              to={`/${s.slug}` as string}
              className="group flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-card p-6 shadow-sm transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ds-reveal"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
                <DynamicIcon name={s.icon} className="h-7 w-7" />
              </div>
              <h3 className="text-card-title text-foreground">{L(s, "title", "base")}</h3>
              {L(s, "description", "empty") && (
                <p className="text-small text-muted-foreground">{L(s, "description", "empty")}</p>
              )}
              <span className="mt-auto inline-flex items-center gap-1 text-caption font-semibold text-primary">
                {t("actions.learnMore")} <ArrowLeft className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSectionBase() {
  const { t } = useTranslation();
  const { data } = useQuery(featuresQuery());
  if (!data?.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <SectionHeading eyebrow="✦" title={t("home.whyUs")} description={t("home.whyUsDesc")} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((f, i) => (
          <div
            key={f.id}
            className="group flex gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-card p-6 shadow-sm transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ds-reveal"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <DynamicIcon name={f.icon} className="h-6 w-6" />
            </div>
            <div>
              <h3 className="mb-1 font-bold text-foreground">{f.title}</h3>
              {f.description && <p className="text-small text-muted-foreground">{f.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(testimonialsQuery());
  if (!data?.length) return null;
  return (
    <section className="bg-brand-green py-20 text-brand-green-foreground">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          eyebrow="★★★★★"
          title={t("home.testimonials")}
          description={t("home.testimonialsDesc")}
          className="[&_h2]:text-on-dark [&_p]:text-on-dark/80 [&_span]:border-on-dark/30 [&_span]:bg-on-dark/10 [&_span]:text-on-dark"
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {data.map((tst, i) => (
            <figure
              key={tst.id}
              className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-on-dark/10 p-6 shadow-sm backdrop-blur ds-reveal"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: tst.rating }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="text-small leading-relaxed opacity-95">"{L(tst, "content", "base")}"</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-white/15 pt-4">
                {tst.avatar && (
                  <LazyImage
                    src={tst.avatar}
                    alt={tst.name}
                    wrapperClassName="h-10 w-10 shrink-0 rounded-full"
                    sizes="40px"
                  />
                )}
                <div>
                  <div className="text-small font-bold">{tst.name}</div>
                  {L(tst, "role", "empty") && (
                    <div className="text-caption opacity-75">{L(tst, "role", "empty")}</div>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryPreviewSectionBase() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(galleryQuery());
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  if (!data?.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <SectionHeading eyebrow="📷" title={t("home.gallery")} description={t("home.galleryDesc")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.slice(0, 8).map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setPreview({ src: g.image, alt: L(g, "title", "base") })}
            aria-label={L(g, "title", "base") || t("home.gallery")}
            className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-muted shadow-sm transition-shadow duration-base ease-standard hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ds-reveal ${
              i === 0 || i === 5 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <LazyImage
              src={g.image}
              alt={L(g, "title", "base")}
              wrapperClassName="h-full w-full"
              sizes="(max-width: 768px) 50vw, 25vw"
              className="transition-transform duration-slow ease-emphasized group-hover:scale-110"
            />
            {L(g, "title", "base") && (
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                <span className="text-small font-semibold text-on-dark">{L(g, "title", "base")}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link to="/gallery" className="inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline">
          {t("actions.viewAll")} <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" />
        </Link>
      </div>
      <ImageLightbox src={preview?.src ?? null} alt={preview?.alt} onClose={() => setPreview(null)} />
    </section>
  );
}

function LatestArticlesSectionBase() {
  const { t } = useTranslation();
  const { L, date } = useLocalized();
  const { data } = useQuery(articlesQuery(3));
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  if (!data?.length) return null;
  return (
    <section className="bg-surface-sunken/50 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading eyebrow="📰" title={t("home.latestArticles")} description={t("home.latestArticlesDesc")} />
        <div className="grid gap-6 md:grid-cols-3">
          {data.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpenSlug(a.slug)}
              className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-card text-start shadow-sm transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ds-reveal"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {a.cover && (
                <LazyImage
                  src={a.cover}
                  alt={L(a, "title", "base")}
                  wrapperClassName="aspect-[16/10] w-full"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="transition-transform duration-slow ease-emphasized group-hover:scale-110"
                />
              )}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="text-caption text-muted-foreground">
                  {date(a.published_at)}
                </div>
                <h3 className="line-clamp-2 text-card-title text-foreground group-hover:text-primary">
                  {L(a, "title", "base")}
                </h3>
                {L(a, "excerpt", "empty") && (
                  <p className="line-clamp-3 text-small text-muted-foreground">{L(a, "excerpt", "empty")}</p>
                )}
                <span className="mt-auto inline-flex items-center gap-1 text-caption font-semibold text-primary">
                  {t("actions.readMore")} <ArrowLeft className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <ArticleDialog slug={openSlug} onClose={() => setOpenSlug(null)} />
    </section>
  );

}

function CtaSectionBase() {
  const { t } = useTranslation();
  return (
    <section className="relative isolate overflow-hidden py-14 md:py-20">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary to-primary/80" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(255,255,255,0.2),transparent)]" />
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center text-primary-foreground md:px-6">
        <h2 className="text-h2 font-extrabold ">{t("home.featuredPackages")}</h2>
        <p className="max-w-2xl text-body-lg opacity-95">{t("brand.tagline")}</p>
        <Link
          to="/contact"
          className="rounded-full bg-surface px-8 py-3 text-small font-bold text-primary shadow-lg transition-all duration-base ease-standard hover:scale-105 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
        >
          {t("contact.title")}
        </Link>
      </div>
    </section>
  );
}

export const ServicesSection = memo(ServicesSectionBase);
export const FeaturesSection = memo(FeaturesSectionBase);
export const TestimonialsSection = memo(TestimonialsSectionBase);
export const GalleryPreviewSection = memo(GalleryPreviewSectionBase);
export const LatestArticlesSection = memo(LatestArticlesSectionBase);
export const CtaSection = memo(CtaSectionBase);
