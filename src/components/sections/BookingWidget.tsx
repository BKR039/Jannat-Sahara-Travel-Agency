import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Compass, Plane, Sparkles, Stamp } from "lucide-react";

const SERVICES = [
  { key: "umrah", icon: Sparkles },
  { key: "trip", icon: Compass },
  { key: "flight", icon: Plane },
  { key: "visa", icon: Stamp },
] as const;

export function BookingWidget() {
  const { t } = useTranslation();

  return (
    <div className="relative -mt-16 z-10 mx-auto max-w-6xl px-4 md:px-6">
      <div className="rounded-xl border border-border-subtle bg-card/95 p-6 shadow-xl backdrop-blur md:p-8 ds-reveal">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
              {t("bookingFlow.eyebrow")}
            </p>
            <h2 className="mt-1 text-h4 font-extrabold">{t("bookingFlow.widget.title")}</h2>
            <p className="mt-1 text-small text-muted-foreground">
              {t("bookingFlow.widget.subtitle")}
            </p>
          </div>
          <Link
            to="/booking"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-semibold text-primary-foreground shadow-brand-glow transition-transform duration-base ease-standard hover:-translate-y-0.5"
          >
            {t("bookingFlow.widget.cta")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ key, icon: Icon }) => (
            <Link
              key={key}
              to="/booking"
              search={{ service: key }}
              className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-surface p-5 transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-base group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-body font-bold">{t(`categories.${key}`)}</span>
                <span className="block text-caption text-muted-foreground">
                  {t("bookingFlow.widget.step")}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
