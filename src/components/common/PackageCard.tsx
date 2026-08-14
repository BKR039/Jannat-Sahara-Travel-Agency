import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Users, Star, Hotel, Plane, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Package } from "@/lib/queries";
import { LazyImage } from "@/components/common/LazyImage";
import { cn } from "@/lib/utils";
import { useLocalized } from "@/lib/localize";

/**
 * Package Card — compact luxury listing card
 * Top: cover + badges + destination
 * Middle: title + short description
 * Bottom: hotel / airline / duration / seats + pricing + CTAs
 */
function PackageCardBase({ pkg, className }: { pkg: Package; className?: string }) {
  const { t } = useTranslation();
  const { L, price } = useLocalized();
  const discounted =
    pkg.discount && pkg.discount > 0 ? Number(pkg.price) * (1 - Number(pkg.discount) / 100) : null;

  const currentPrice = discounted ?? Number(pkg.price);
  const soldOut = pkg.status === "sold_out" || (typeof pkg.seats === "number" && pkg.seats <= 0);
  const hasDiscount = pkg.discount && pkg.discount > 0;

  const metaItems = useMemo(
    () =>
      [
        { key: "hotel", icon: Hotel, value: L(pkg, "hotel", "empty") },
        { key: "airline", icon: Plane, value: L(pkg, "airline", "empty") },
        { key: "duration", icon: Clock, value: L(pkg, "duration", "empty") },
        {
          key: "seats",
          icon: Users,
          value:
            typeof pkg.seats === "number" && pkg.seats > 0 ? `${pkg.seats} ${t("package.seats")}` : null,
        },
      ].filter((item) => Boolean(item.value)),
    [pkg, L, t],
  );

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-card shadow-sm",
        "transition-all duration-base ease-standard",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
    >
      {/* ---------- Top: cover + badges + destination ---------- */}
      <Link
        to="/packages/$slug"
        params={{ slug: pkg.slug }}
        className="relative block aspect-[16/10] overflow-hidden bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {pkg.cover ? (
          <LazyImage
            src={pkg.cover}
            alt={L(pkg, "title", "base")}
            wrapperClassName="h-full w-full"
            className="transition-transform duration-slow ease-emphasized group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <MapPin className="h-8 w-8 opacity-40" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-hero-scrim opacity-80" />

        <div className="absolute top-2.5 start-2.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary px-2.5 py-1 text-caption font-semibold text-primary-foreground shadow-sm">
            {t(`categories.${pkg.category}`)}
          </span>
          {pkg.featured && (
            <span
              className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-caption font-semibold text-secondary-foreground shadow-sm"
              aria-label={t("home.featuredPackages")}
            >
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            </span>
          )}
        </div>

        {hasDiscount && (
          <div className="absolute top-2.5 end-2.5 rounded-full bg-destructive px-2.5 py-1 text-caption font-bold text-primary-foreground shadow-sm">
            -{Number(pkg.discount)}%
          </div>
        )}

        {L(pkg, "destination", "empty") && (
          <div className="absolute bottom-2.5 start-2.5 flex items-center gap-1 text-on-dark">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1 max-w-[12rem] text-small font-medium">{L(pkg, "destination", "empty")}</span>
          </div>
        )}
      </Link>

      {/* ---------- Middle: title + description ---------- */}
      <div className="flex flex-1 flex-col p-4">
        <Link
          to="/packages/$slug"
          params={{ slug: pkg.slug }}
          className="rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <h3 className="line-clamp-1 text-card-title font-semibold text-foreground transition-colors duration-fast group-hover:text-primary">
            {L(pkg, "title", "base")}
          </h3>
        </Link>
        {L(pkg, "short_description", "empty") && (
          <p className="mt-1 line-clamp-2 text-card-desc text-muted-foreground">{L(pkg, "short_description", "empty")}</p>
        )}

        {/* ---------- Bottom: meta + price + CTAs ---------- */}
        <div className="mt-auto pt-3">
          {metaItems.length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-border-subtle pb-3">
              {metaItems.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden="true" />
                  <span className="line-clamp-1">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption text-muted-foreground">{t("package.from")}</p>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-h5 font-bold text-primary">
                  {price(currentPrice, pkg.currency ?? "TND")}
                </span>
                {discounted !== null && (
                  <span className="text-caption text-muted-foreground line-through">
                    {price(pkg.price, pkg.currency ?? "TND")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Link
              to="/booking"
              search={{ pkg: pkg.slug }}
              aria-disabled={soldOut}
              className={cn(
                "inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-[var(--radius-button)] bg-primary px-3 text-small font-semibold text-primary-foreground transition-colors duration-fast hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                soldOut && "pointer-events-none opacity-50",
              )}
            >
              {t("actions.bookNow")}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/packages/$slug"
              params={{ slug: pkg.slug }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-border px-3 text-small font-semibold text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t("actions.viewDetails")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export const PackageCard = memo(PackageCardBase);
