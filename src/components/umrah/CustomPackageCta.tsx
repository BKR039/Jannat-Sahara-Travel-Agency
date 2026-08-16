import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Premium entry point to the Umrah package builder. */
export function CustomPackageCta() {
  const { t } = useTranslation();

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-brand-gold/30 bg-gradient-oasis-night p-6 text-on-dark shadow-lg md:p-8">
      <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-brand-gold/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-on-dark/10 px-3 py-1 text-caption font-semibold">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("umrahBuilder.cta.badge")}
          </span>
          <h2 className="text-h3">{t("umrahBuilder.cta.title")}</h2>
          <p className="max-w-2xl text-body text-on-dark/85">{t("umrahBuilder.cta.description")}</p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/umrah/builder">
            {t("umrahBuilder.cta.action")}
            <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
