import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Moon } from "lucide-react";
import { packagesQuery } from "@/lib/queries";
import { ProgrammeCard } from "@/components/common/ProgrammeCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Section } from "@/components/common/Section";
import { SkeletonGrid } from "@/components/common/SkeletonGrid";

/** How many programmes the homepage previews before sending people to /umrah. */
const PREVIEW_COUNT = 6;

/**
 * Upcoming Umrah programmes — the homepage's primary commercial section.
 *
 * Reads the same `packagesQuery` the rest of the site uses (published rows
 * only, mirrored by RLS) so there is no second source of truth and no extra
 * request. Ordering is the agency's own `sort_order`, which is the season
 * order they entered: September through March.
 *
 * If the agency has published no Umrah programmes the section renders nothing
 * rather than an empty shell.
 */
function UmrahProgrammesBase() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(packagesQuery("umrah"));

  const programmes = useMemo(
    () => [...(data ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [data],
  );

  if (!isLoading && programmes.length === 0) return null;

  return (
    <Section id="programmes" tone="sunken">
      <SectionHeading
        eyebrow={t("home.programmesEyebrow")}
        icon={Moon}
        title={t("home.programmes")}
        description={t("home.programmesDesc")}
      />

      {isLoading ? (
        <SkeletonGrid count={PREVIEW_COUNT} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {programmes.slice(0, PREVIEW_COUNT).map((p, i) => (
            <div key={p.id} className="ds-reveal" style={{ animationDelay: `${i * 60}ms` }}>
              {/* First row is above the fold on a laptop; skip lazy-loading it. */}
              <ProgrammeCard pkg={p} priority={i < 3} />
            </div>
          ))}
        </div>
      )}

      {programmes.length > PREVIEW_COUNT && (
        <div className="mt-10 flex justify-center">
          <Link
            to="/umrah"
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-button)] border border-border px-6 text-small font-semibold text-foreground transition-colors duration-fast hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t("actions.viewAll")}
            <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Section>
  );
}

export const UmrahProgrammes = memo(UmrahProgrammesBase);
