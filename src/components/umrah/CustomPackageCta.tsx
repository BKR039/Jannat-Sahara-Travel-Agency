import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Entry point to the Umrah package builder.
 *
 * This used to be a dark teal-to-navy panel sitting on an ivory page, which
 * gave the Umrah route three unrelated colour worlds — navy hero, teal banner,
 * warm page. It now reads as one: a warm bordered surface in the same family
 * as every other card, with the sunrise gradient appearing only where it
 * belongs, on the action itself.
 *
 * Border-defined rather than shadowed, following the reference: the surface
 * step and the hairline do the separating, not elevation.
 */
export function CustomPackageCta() {
  const { t } = useTranslation();

  return (
    <div className="relative isolate overflow-hidden rounded-card-lg border border-border-subtle bg-surface-sunken/60 p-[var(--space-6)] md:p-[var(--space-7)]">
      {/* A single warm bloom, keyed to the brand rather than to gold. */}
      <div
        className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      {/*
       * `min-w-0` on the row and the text column: flex children default to
       * `min-width: auto` and cannot otherwise shrink below their longest
       * word, which is how a long French or English heading would escape the
       * card. Defensive — the card's own `scrollWidth` overhang comes from the
       * decorative bloom above, which is offset 64px past the end edge on
       * purpose and clipped by `overflow-hidden`.
       */}
      <div className="relative flex min-w-0 flex-col gap-[var(--space-5)] md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-[var(--space-2)]">
          <span className="inline-flex w-fit items-center gap-2 rounded-badge bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("umrahBuilder.cta.badge")}
          </span>
          <h2 className="text-h3 text-foreground [overflow-wrap:anywhere]">
            {t("umrahBuilder.cta.title")}
          </h2>
          <p className="max-w-2xl text-body text-muted-foreground">
            {t("umrahBuilder.cta.description")}
          </p>
        </div>

        <Button asChild size="lg" className="shrink-0">
          <Link to="/umrah/builder">
            {t("umrahBuilder.cta.action")}
            {/* Directional: follows the writing direction. */}
            <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
