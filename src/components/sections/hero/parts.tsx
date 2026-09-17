import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plane, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/common/IconBadge";

/**
 * Homepage hero — editorial pieces.
 *
 * Every string here comes from the CMS or the translation catalogue; nothing
 * in this file invents agency copy, a metric or a claim. Blocks whose content
 * is missing render nothing rather than showing a placeholder, which is why
 * each part returns `null` on empty input.
 */

/* ------------------------------------------------------------- eyebrow */

export function HeroEyebrow({ label }: { label: string }) {
  if (!label) return null;
  return (
    <p className="ds-reveal inline-flex items-center gap-2 rounded-badge border border-primary/20 bg-primary/[0.07] py-1.5 pe-4 ps-3 text-small font-semibold text-primary">
      <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </p>
  );
}

/* ------------------------------------------------------------ benefits */

export interface HeroBenefit {
  id: string;
  icon: string | null;
  title: string;
  description: string;
}

/**
 * Inline editorial features, not cards: an icon in a bordered container, a
 * strong line and a quiet one. Anything without a title in the active language
 * is dropped, so a partially translated CMS degrades to fewer items instead of
 * blank rows.
 */
export function HeroBenefits({ items }: { items: HeroBenefit[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="ds-reveal mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 sm:gap-4">
      {items.map((b) => (
        <li
          key={b.id}
          className="flex items-start gap-3 rounded-card bg-surface/40 p-2.5 sm:p-0 sm:bg-transparent border border-border/30 sm:border-0"
        >
          {/* Same badge as the features section below: one icon language for
              the page, rather than a circle here and a rounded square there. */}
          <IconBadge name={b.icon} size="md" tone="surface" className="bg-surface shadow-xs shrink-0" />
          <span className="min-w-0">
            <span className="block text-small font-bold leading-snug text-foreground">
              {b.title}
            </span>
            {b.description && (
              <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground line-clamp-2">
                {b.description}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- actions */

export function HeroActions({
  primaryLabel,
  primaryHref,
}: {
  primaryLabel: string;
  primaryHref: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="ds-reveal mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
      <Button asChild size="lg" className="group font-bold px-6 shadow-brand-glow hover:shadow-brand-glow-lg transition-all">
        <Link to={primaryHref}>
          {primaryLabel}
          <ArrowRight
            className="ms-2 h-5 w-5 shrink-0 transition-transform duration-base ease-standard group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </Button>
      {/*
       * Secondary is a real service route, not a decorative second button:
       * flight tickets are one of the agency's four public services.
       */}
      <Button
        asChild
        size="lg"
        variant="outline"
        className="border-border-strong bg-surface/80 text-foreground hover:border-primary hover:bg-surface hover:text-primary px-6 font-semibold backdrop-blur-xs transition-all"
      >
        <Link to="/flights">
          <Plane className="me-2 h-5 w-5 shrink-0" aria-hidden="true" />
          {t("nav.flights")}
        </Link>
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- trust */

export interface HeroStat {
  id: string;
  value: string;
  label: string;
}

/**
 * Real figures only.
 *
 * The branch count is counted from the `branches` table; anything else comes
 * from `site_stats`, which the agency fills in Admin. There is deliberately no
 * hard-coded "years of experience" or "happy customers" here — neither number
 * exists in the database, and inventing social proof is exactly what this
 * section must not do. With nothing to show, the row does not render.
 */
export function HeroTrust({ stats }: { stats: HeroStat[] }) {
  if (stats.length === 0) return null;
  return (
    <dl className="ds-reveal mt-9 flex flex-wrap items-center gap-x-8 gap-y-4 pt-6 border-t border-border/50">
      {stats.map((s) => (
        <div key={s.id} className="flex items-baseline gap-2.5">
          <dt className="sr-only">{s.label}</dt>
          <dd className="flex items-baseline gap-2">
            <span className="text-h3 font-extrabold leading-none text-primary" dir="ltr">
              {s.value}
            </span>
            <span className="max-w-[9.5rem] text-small font-medium leading-snug text-text-secondary">
              {s.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------- media card */

/**
 * Floating editorial teaser over the photograph.
 *
 * This is intentionally NOT a video player. The CMS holds no video URL of any
 * kind, and a play button that plays nothing is a fake control — so the card
 * points at the gallery, which is real content, and says so.
 */
export function HeroMediaCard({
  image,
  eyebrow,
  title,
  cta,
}: {
  image: string | null;
  eyebrow: string;
  title: string;
  cta: string;
}) {
  return (
    <Link
      to="/gallery"
      aria-label={`${title} — ${cta}`}
      className="group flex items-center gap-3 rounded-card border border-border-subtle bg-surface/90 p-2.5 shadow-lg backdrop-blur-md transition-transform duration-base ease-standard hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="relative block h-14 w-16 shrink-0 overflow-hidden rounded-input bg-surface-sunken">
        {image && (
          <img src={image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/25">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-primary">
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </span>
        </span>
      </span>
      <span className="min-w-0 pe-2">
        <span className="block text-caption font-semibold text-primary">{eyebrow}</span>
        <span className="mt-0.5 block text-small font-bold leading-snug text-foreground">
          {title}
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------- wrapper */

/** Content column: keeps the editorial measure honest at every width. */
export function HeroCopy({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-xl lg:max-w-2xl xl:max-w-[42rem]">{children}</div>;
}
