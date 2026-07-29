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
          <img
            src={hero.image}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-green/80 via-brand-green/60 to-brand-green/90" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(255,255,255,0.15),transparent)]" />
      </div>

      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center gap-6 px-4 py-24 text-center text-on-dark md:px-6">
        <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
          {badges.map((b) => (
            <span key={b} className="rounded-full border border-on-dark/25 bg-on-dark/10 px-3 py-1 text-xs font-medium backdrop-blur">
              {b}
            </span>
          ))}
        </div>

        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl animate-fade-in">
          {hero?.title ?? t("brand.tagline")}
        </h1>
        {hero?.subtitle && (
          <p className="max-w-2xl text-lg text-on-dark/90 md:text-xl animate-fade-in">
            {hero.subtitle}
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-3 animate-fade-in">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
          >
            <Link to={hero?.cta_href ?? "/umrah"}>
              {hero?.cta_label ?? t("actions.bookNow")}
              <ArrowLeft className="ms-2 h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-on-dark/40 bg-on-dark/10 text-on-dark backdrop-blur hover:bg-on-dark/20"
          >
            <Link to="/about">
              <Play className="me-2 h-4 w-4" /> {t("actions.learnMore")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
