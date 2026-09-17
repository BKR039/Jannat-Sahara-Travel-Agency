import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { transformSrcSet } from "@/lib/image-srcset";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { PackageCard } from "@/components/common/PackageCard";
import { ProgrammeCard } from "@/components/common/ProgrammeCard";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { Section } from "@/components/common/Section";
import { contentQuery, packagesQuery, type PackageCategory } from "@/lib/queries";

/**
 * Category landing page.
 *
 * The hero image is agency-managed: it comes from the `site_content` row whose
 * key is `heroContentKey` (editable under Settings → Website content, same as
 * the homepage hero). When no image is set the branded gradient stands alone —
 * the same fallback `HeroSection` uses — so no stock photography is bundled.
 */
export function PackagesPage({
  category,
  title,
  description,
  heroContentKey,
  banner,
}: {
  category: PackageCategory;
  title: string;
  description: string;
  heroContentKey: string;
  banner?: ReactNode;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(packagesQuery(category));
  const { data: hero } = useQuery(contentQuery(heroContentKey));
  const cover = hero?.image ?? null;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {cover && (
            <img
              src={cover}
              srcSet={transformSrcSet(cover)}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              sizes="100vw"
              className="h-full w-full object-cover"
            />
          )}
          {/* One veil, not two. The previous stack (teal-to-navy at 85% plus a
              navy scrim) left the photograph unreadable and put a second
              colour world on top of the warm page. */}
          <div className="absolute inset-0 bg-gradient-hero-veil" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center text-on-dark md:px-6">
          <span className="rounded-full border border-on-dark/30 bg-on-dark/10 px-4 py-1 text-caption font-semibold backdrop-blur">
            {t(`categories.${category}`)}
          </span>
          <h1 className="text-h1 ds-reveal">{title}</h1>
          <p className="max-w-2xl text-body-lg text-on-dark/90">{description}</p>
        </div>
      </section>

      {banner ? <div className="mx-auto max-w-7xl px-4 pt-12 md:px-6">{banner}</div> : null}

      <Section space="md">
        {isLoading ? (
          <SkeletonGrid count={8} />
        ) : !data?.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {data.map((p, i) => (
              <div key={p.id} className="ds-reveal" style={{ animationDelay: `${i * 60}ms` }}>
                {/*
                 * Umrah is the agency's product, so its catalogue uses the
                 * programme card: dates and price lead, and both actions are
                 * on the card. Other categories keep `PackageCard`, which
                 * leads on the hotel/airline metadata they actually carry.
                 */}
                {category === "umrah" ? (
                  <ProgrammeCard pkg={p} priority={i < 3} />
                ) : (
                  <PackageCard pkg={p} />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </SiteLayout>
  );
}
