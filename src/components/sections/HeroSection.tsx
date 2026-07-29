import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Play } from "lucide-react";
import { contentQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { t } = useTranslation();
  const { data: hero } = useQuery(contentQuery("hero"));
  const badges = ((hero?.data as { badges?: string[] } | null)?.badges) ?? [];

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {hero?.image && (
          <img src={hero.image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        )}
        {/* DS: --gradient-oasis-night base + --gradient-hero-scrim for legibility */}
        <div className="absolute inset-0 bg-gradient-oasis-night opacity-80" />
        <div className="absolute inset-0 bg-gradient-hero-scrim" />
      </div>

      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center gap-6 px-4 py-24 text-center text-on-dark md:px-6">
        <div className="flex flex-wrap justify-center gap-2 ds-reveal">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded-full border border-on-dark/25 bg-on-dark/10 px-3 py-1 text-caption backdrop-blur"
            >
              {b}
            </span>
          ))}
        </div>

        <h1 className="max-w-4xl text-display ds-reveal">{hero?.title ?? t("brand.tagline")}</h1>
        {hero?.subtitle && (
          <p className="max-w-2xl text-body-lg text-on-dark/90 ds-reveal">{hero.subtitle}</p>
        )}


        <div className="mt-4 flex flex-wrap justify-center gap-3 ds-reveal">
          <Button asChild size="lg" className="shadow-brand-glow">
            <Link to={hero?.cta_href ?? "/umrah"}>
              {hero?.cta_label ?? t("actions.bookNow")}
              <ArrowLeft className="ms-2 h-5 w-5 rtl:rotate-180" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="dark" className="bg-on-dark/10 backdrop-blur hover:bg-on-dark/20">
            <Link to="/about">
              <Play className="me-2 h-5 w-5" /> {t("actions.learnMore")}
            </Link>
          </Button>
        </div>
        </div>
      </div>
    </section>
  );
}
