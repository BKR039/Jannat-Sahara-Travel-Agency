import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { transformSrcSet } from "@/lib/image-srcset";
import {
  branchesQuery,
  contentQuery,
  featuresQuery,
  galleryQuery,
  statsQuery,
} from "@/lib/queries";
import { pickLocalizedList, useLocalized } from "@/lib/localize";
import { HeroMedia } from "./hero/HeroMedia";
import {
  HeroActions,
  HeroBenefits,
  HeroCopy,
  HeroEyebrow,
  HeroMediaCard,
  HeroTrust,
  type HeroBenefit,
  type HeroStat,
} from "./hero/parts";

/**
 * Homepage hero.
 *
 * The photograph is the first impression, so it spans the whole section rather
 * than sitting in a column beside the copy, and the copy takes the start edge
 * over a warm directional wash — ivory where the words are, untouched
 * photography everywhere else. The previous treatment darkened the entire
 * frame to buy contrast, which flattened the Haram into a grey field and left
 * a hard seam under the light navbar; here the wash reaches the navbar as the
 * same ivory, so header and hero read as one surface.
 *
 * Content ownership: headline, paragraph, CTA label, CTA target, the eyebrow
 * badge and the photograph are CMS fields; the three value points are the
 * `features` rows the agency maintains; the only figure in the trust row is
 * the branch count, which is counted from `branches`. Nothing here is invented
 * in code — see HeroTrust.
 */
export function HeroSection() {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();

  const { data: hero } = useQuery(contentQuery("hero"));
  const { data: features } = useQuery(featuresQuery());
  const { data: branches } = useQuery(branchesQuery());
  const { data: stats } = useQuery(statsQuery());
  const { data: gallery } = useQuery(galleryQuery("umrah"));

  const heroTitle = L(hero, "title", "empty");
  const heroSubtitle = L(hero, "subtitle", "empty");
  const heroBody = L(hero, "body", "empty");
  const heroCta = L(hero, "cta_label", "empty");
  const badges = pickLocalizedList(hero?.data as Record<string, unknown> | null, "badges", lang);

  /* Three at most: the hero is a summary, the full list has its own section. */
  const benefits: HeroBenefit[] = useMemo(
    () =>
      (features ?? [])
        .map((f) => ({
          id: f.id,
          icon: f.icon,
          title: L(f, "title", "empty"),
          description: L(f, "description", "empty"),
        }))
        .filter((f) => f.title.length > 0)
        .slice(0, 3),
    [features, L],
  );

  /*
   * Real figures only. `site_stats` is whatever the agency published; the
   * branch count is a fact we can count. A metric that does not exist is
   * omitted, never estimated.
   */
  const trust: HeroStat[] = useMemo(() => {
    const published = (stats ?? [])
      .map((s) => ({ id: s.id, value: s.value, label: L(s, "label", "empty") }))
      .filter((s) => s.value && s.label);
    const branchCount = (branches ?? []).length;
    if (branchCount > 0) {
      published.push({
        id: "branches",
        value: String(branchCount),
        label: t("home.hero.branchesLabel"),
      });
    }
    return published;
  }, [stats, branches, L, t]);

  const cardImage = gallery?.[0]?.image ?? null;

  return (
    <section className="relative isolate overflow-hidden bg-hero-canvas min-h-[36rem] lg:min-h-[clamp(42rem,85vh,52rem)] flex flex-col justify-center">
      {/*
       * The photograph is the LCP element. The preload hint has to mirror the
       * img's srcSet/sizes exactly.
       */}
      {hero?.image && (
        <link
          rel="preload"
          as="image"
          href={hero.image}
          imageSrcSet={transformSrcSet(hero.image)}
          imageSizes="(min-width: 1024px) 55vw, 100vw"
          fetchPriority="high"
        />
      )}

      {/*
       * Full-width intelligent composition:
       * In RTL (Arabic-first):
       * - Right side: Hero copy (45-48% width), naturally anchored on the right.
       * - Left side: Existing Kaaba image (52-55% width), anchored on the left edge.
       * - Seamless transition connects them into one premium composition.
       */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:pe-12 xl:pe-16 2xl:pe-24 lg:ps-10 xl:ps-14">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          {/* Content column: naturally on the right in RTL, and explicitly pinned right in LTR */}
          <div className="w-full py-10 lg:py-16 xl:py-20 lg:w-[48%] xl:w-[46%] 2xl:w-[44%] text-start [dir=ltr]:lg:ml-auto">
            <HeroCopy>
              <HeroEyebrow label={badges[0] ?? ""} />

              <h1 className="ds-reveal mt-5 font-display text-[clamp(2.15rem,1.75rem+2vw,3.75rem)] font-black leading-[1.28] sm:leading-[1.32] text-foreground">
                {heroTitle || t("brand.tagline")}
              </h1>

              {(heroBody || heroSubtitle) && (
                <p className="ds-reveal mt-5 text-body-lg leading-relaxed text-text-secondary max-w-xl">
                  {heroBody || heroSubtitle}
                </p>
              )}

              <HeroBenefits items={benefits} />

              <HeroActions
                primaryLabel={heroCta || t("actions.bookNow")}
                primaryHref={hero?.cta_href ?? "/umrah"}
              />

              <HeroTrust stats={trust} />
            </HeroCopy>
          </div>
        </div>
      </div>

      {/*
       * Left side in RTL (Media column):
       * Anchored to the left edge on desktop, occupying 52-55% of the viewport.
       * Below lg, it stacks cleanly below the copy with comfortable page margins.
       */}
      <div className="w-full px-4 sm:px-6 pb-10 lg:p-0 lg:absolute lg:inset-y-0 lg:left-0 lg:w-[52%] xl:w-[54%] 2xl:w-[55%] lg:h-full z-0">
        <div className="relative h-[20rem] sm:h-[26rem] lg:h-full w-full overflow-hidden rounded-card-lg lg:rounded-none shadow-sm lg:shadow-none">
          <HeroMedia
            image={hero?.image ?? null}
            alt={t("home.hero.imageAlt")}
            objectPosition="26% 50%"
          />

          {/*
           * Teaser card: floats over the open courtyard on the left, clear of the Kaaba.
           * Stays clickable above the photo in both desktop and mobile viewports.
           */}
          <div className="absolute bottom-4 left-4 z-20 max-w-[17rem] sm:bottom-6 sm:left-6 lg:bottom-10 lg:left-10 sm:max-w-[19rem]">
            <HeroMediaCard
              image={cardImage}
              eyebrow={t("home.hero.mediaEyebrow")}
              title={t("home.hero.mediaTitle")}
              cta={t("home.hero.mediaCta")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
