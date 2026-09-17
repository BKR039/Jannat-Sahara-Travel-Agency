import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarRange, Clock, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Package } from "@/lib/queries";
import { LazyImage } from "@/components/common/LazyImage";
import { useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";

/**
 * Umrah programme card — the landing page's main commercial object.
 *
 * Deliberately not `PackageCard`: that one leads on price and fills its meta
 * row with hotel / airline / seats. The agency has published none of those for
 * the real programmes, so it renders nearly empty. What the agency *has*
 * published is the name, the departure→return range and the duration, so those
 * carry the card, with the date range promoted to its own band instead of
 * sitting in the description line.
 *
 * Every field is optional in the model, so each one is only rendered when the
 * agency has actually filled it in — nothing is invented to fill the layout.
 */
function ProgrammeCardBase({
  pkg,
  priority = false,
  className,
}: {
  pkg: Package;
  priority?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { L, price } = useLocalized();

  const title = L(pkg, "title", "base");
  const dates = L(pkg, "short_description", "empty");
  const duration = L(pkg, "duration", "empty");
  const destination = L(pkg, "destination", "empty");
  const hasPrice = Number(pkg.price) > 0;
  const soldOut = pkg.status === "sold_out" || (typeof pkg.seats === "number" && pkg.seats <= 0);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-card",
        "transition-[transform,border-color,box-shadow] duration-base ease-standard",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm motion-reduce:transform-none",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
        <LazyImage
          src={pkg.cover}
          alt={title}
          priority={priority}
          wrapperClassName="h-full w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="transition-transform duration-slow ease-emphasized group-hover:scale-[1.03]"
        />
        {/* Scrim only behind the date band, so the photograph stays readable. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

        {destination && (
          <p className="absolute inset-x-4 bottom-3 flex items-center gap-1.5 text-caption font-medium text-on-dark">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{destination}</span>
          </p>
        )}

        {soldOut && (
          <span className="absolute top-3 end-3 rounded-full bg-foreground/85 px-2.5 py-1 text-caption font-bold text-background backdrop-blur">
            {t("package.soldOut")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-card-title font-bold leading-snug text-foreground [overflow-wrap:anywhere] [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
          <Link
            to="/packages/$slug"
            params={{ slug: pkg.slug }}
            className="rounded-xs outline-none transition-colors duration-fast after:absolute after:inset-0 group-hover:text-primary"
          >
            {title}
          </Link>
        </h3>

        {/* Departure → return: the strongest signal the agency has published. */}
        {dates && (
          <p className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-small font-semibold text-primary">
            <CalendarRange className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{dates}</span>
          </p>
        )}

        {duration && (
          <p className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-primary/80" aria-hidden="true" />
            {duration}
          </p>
        )}

        {/*
         * Price, then the actions. It sits on its own line rather than sharing
         * a row with the duration: on a catalogue card it is the number the
         * visitor is looking for, and it was previously the same size as the
         * metadata beside it.
         */}
        <div className="mt-auto border-t border-border-subtle pt-3">
          {hasPrice && (
            <div className="mb-3">
              <p className="text-caption text-muted-foreground">{t("package.from")}</p>
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-h4 font-extrabold text-primary">
                  {price(Number(pkg.price), pkg.currency ?? "TND")}
                </span>
                <span className="text-caption text-muted-foreground">{t("package.perPerson")}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/*
             * Book is the primary action. `relative z-10` keeps both buttons
             * above the card-wide overlay link on the title, so each one still
             * goes where its label says.
             */}
            <Link
              to="/booking"
              search={{ pkg: pkg.slug }}
              aria-disabled={soldOut}
              className={cn(
                "relative z-10 inline-flex h-11 flex-1 items-center justify-center rounded-button bg-gradient-sunrise px-3 text-small font-semibold text-primary-foreground transition-[filter,box-shadow] duration-fast hover:brightness-[1.04] hover:shadow-brand-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                soldOut && "pointer-events-none opacity-50",
              )}
            >
              {t("actions.bookNow")}
            </Link>
            <Link
              to="/packages/$slug"
              params={{ slug: pkg.slug }}
              className="relative z-10 inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-button border border-border px-3 text-small font-semibold text-foreground transition-colors duration-fast hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t("actions.viewDetails")}
              <ArrowRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export const ProgrammeCard = memo(ProgrammeCardBase);
