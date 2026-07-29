import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Users, Tag, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Package } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Package Card — DS /components/03-cards.md § Package Card / Trip Card
 * media (scrim + price/offer badges) → content → feature row → footer (price + CTA)
 */
export function PackageCard({ pkg, className }: { pkg: Package; className?: string }) {
  const { t } = useTranslation();
  const discounted =
    pkg.discount && pkg.discount > 0 ? Number(pkg.price) * (1 - Number(pkg.discount) / 100) : null;

  return (
    <Link
      to="/packages/$slug"
      params={{ slug: pkg.slug }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-card shadow-sm",
        "transition-[box-shadow,transform] duration-[220ms] ease-standard",
        "hover:-translate-y-0.5 hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        {pkg.cover && (
          <img
            src={pkg.cover}
            alt={pkg.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-[480ms] ease-emphasized group-hover:scale-[1.03]"
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
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="line-clamp-2 text-card-title text-foreground">{pkg.title}</h3>
        {pkg.short_description && (
          <p className="line-clamp-2 text-card-desc text-muted-foreground">{pkg.short_description}</p>
        )}

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-caption text-muted-foreground">
          {pkg.duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {pkg.duration}
            </span>
          )}
          {typeof pkg.seats === "number" && pkg.seats > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> {pkg.seats}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border-subtle pt-4">
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
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-small font-semibold text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
            <Tag className="h-4 w-4" aria-hidden="true" /> {t("actions.bookNow")}
          </span>
        </div>
      </div>
    </Link>
  );
}
