import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Users, Star, CalendarDays, Hotel, Plane, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Package } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Package Card — DS /components/03-cards.md § Package Card / Trip Card
 * media (scrim + badges) → content → highlights → footer (price + Book Now / Details)
 */
export function PackageCard({ pkg, className }: { pkg: Package; className?: string }) {
  const { t, i18n } = useTranslation();
  const discounted =
    pkg.discount && pkg.discount > 0 ? Number(pkg.price) * (1 - Number(pkg.discount) / 100) : null;

  const departure = pkg.departure_date
    ? new Date(pkg.departure_date).toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const highlights = [pkg.hotel, pkg.airline, pkg.transport].filter(Boolean).slice(0, 2) as string[];
  const soldOut = pkg.status === "sold_out" || (typeof pkg.seats === "number" && pkg.seats <= 0);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-card shadow-sm",
        "transition-[box-shadow,transform] duration-base ease-standard",
        "hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <Link
        to="/packages/$slug"
        params={{ slug: pkg.slug }}
        className="relative block aspect-[4/3] overflow-hidden bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {pkg.cover && (
          <img
            src={pkg.cover}
            alt={pkg.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-slow ease-emphasized group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-hero-scrim opacity-90" />

        <div className="absolute top-3 start-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-caption font-semibold text-primary-foreground">
            {t(`categories.${pkg.category}`)}
          </span>
          {pkg.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-caption font-semibold text-secondary-foreground">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            </span>
          )}
        </div>

        {pkg.discount && pkg.discount > 0 && (
          <div className="absolute top-3 end-3 rounded-full bg-destructive px-3 py-1 text-caption font-bold text-primary-foreground shadow-sm">
            -{Number(pkg.discount)}%
          </div>
        )}

        {pkg.destination && (
          <div className="absolute bottom-3 start-3 flex items-center gap-1.5 text-on-dark">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span className="text-small font-medium">{pkg.destination}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <Link
          to="/packages/$slug"
          params={{ slug: pkg.slug }}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <h3 className="line-clamp-2 text-card-title text-foreground">{pkg.title}</h3>
        </Link>
        {pkg.short_description && (
          <p className="line-clamp-2 text-card-desc text-muted-foreground">{pkg.short_description}</p>
        )}

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-caption text-muted-foreground">
          {departure && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {departure}
            </span>
          )}
          {pkg.duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {pkg.duration}
            </span>
          )}
          {typeof pkg.seats === "number" && pkg.seats > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> {pkg.seats} {t("package.seats")}
            </span>
          )}
        </div>

        {highlights.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {highlights.map((h, i) => (
              <li
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-caption font-medium text-primary"
              >
                {i === 0 ? (
                  <Hotel className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Plane className="h-3 w-3" aria-hidden="true" />
                )}
                <span className="line-clamp-1 max-w-[10rem]">{h}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto space-y-4 border-t border-border-subtle pt-4">
          <div>
            <p className="text-caption text-muted-foreground">{t("package.from")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-h4 text-primary">
                {(discounted ?? Number(pkg.price)).toLocaleString()} {pkg.currency}
              </span>
              {discounted !== null && (
                <span className="text-caption text-muted-foreground line-through">
                  {Number(pkg.price).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/booking"
              search={{ pkg: pkg.slug }}
              aria-disabled={soldOut}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-small font-semibold text-primary-foreground transition-colors duration-fast hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                soldOut && "pointer-events-none opacity-50",
              )}
            >
              {t("actions.bookNow")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/packages/$slug"
              params={{ slug: pkg.slug }}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-border px-4 text-small font-semibold text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t("actions.viewDetails")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
