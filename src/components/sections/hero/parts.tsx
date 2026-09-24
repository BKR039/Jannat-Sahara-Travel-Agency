import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plane, Shield } from "lucide-react";
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
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1 text-caption sm:text-small font-medium text-white/90 backdrop-blur-md">
      <Shield className="h-3.5 w-3.5 shrink-0 text-secondary/90" aria-hidden="true" />
      <span>{label}</span>
    </div>
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
          <IconBadge
            name={b.icon}
            size="md"
            tone="surface"
            className="bg-surface shadow-xs shrink-0"
          />
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
    <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 w-full sm:w-auto">
      <Button
        asChild
        size="lg"
        className="group w-full sm:w-auto transition-all duration-base hover:-translate-y-0.5"
      >
        <Link to={primaryHref}>
          {primaryLabel}
          <ArrowRight
            className="ms-2 h-4.5 w-4.5 shrink-0 transition-transform duration-base ease-standard group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
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
        variant="glass"
        className="w-full sm:w-auto transition-all duration-base hover:-translate-y-0.5"
      >
        <Link to="/flights">
          <Plane className="me-2 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
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
 * Discreet floating editorial teaser over the photograph.
 *
 * Designed as a subtle, compact pill that directs to the gallery without
 * competing with the centered primary Hero message.
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
      className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/30 px-2.5 py-1 shadow-none backdrop-blur-md transition-all duration-base hover:bg-black/50 hover:border-white/25 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {image && (
        <span className="relative block h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-white/25">
          <img src={image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </span>
      )}
      <span className="text-[0.75rem] font-medium text-white/80 group-hover:text-white">
        <span className="text-secondary/90 font-medium me-1">{eyebrow}</span>
        <span>{title}</span>
      </span>
      <ArrowRight
        className="h-3 w-3 text-white/50 rtl:-scale-x-100 group-hover:text-white/85 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform duration-base shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}

/* ------------------------------------------------------------- wrapper */

/** Content column: keeps the editorial measure honest at every width. */
export function HeroCopy({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center text-center">
      {children}
    </div>
  );
}
