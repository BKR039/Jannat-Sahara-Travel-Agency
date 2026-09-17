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
import { Container } from "@/components/common/Section";
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
    <section className="relative isolate overflow-hidden bg-hero-canvas">
      {/*
       * The photograph is the LCP element. The preload hint has to mirror the
       * img's srcSet/sizes exactly, otherwise the browser fetches the
       * full-width file and then a second, narrower one for the element.
       */}
      {hero?.image && (
        <link
          rel="preload"
          as="image"
          href={hero.image}
          imageSrcSet={transformSrcSet(hero.image)}
          imageSizes="100vw"
          fetchPriority="high"
        />
      )}

      <Container className="relative z-10">
        {/*
         * A tall first screen, but bounded: a flat 85vh pushes the CTAs off a
         * short laptop or a phone in landscape, so the viewport height only
         * applies between a floor and a ceiling. `lg:ml-auto` is physical, not
         * logical — the copy stays opposite the Kaaba in both directions.
         *
         * Anchored to the top rather than centred. Centring made the whole
         * composition depend on how much text a language happens to have: the
         * headline started 42px lower in English than in French and the trust
         * row moved 104px between Arabic and English, so the three heroes did
         * not read as the same design. A fixed top offset puts the badge and
         * the headline on the same line in every language, and the block grows
         * downwards into space the layout already reserves.
         */}
        <div className="flex min-h-[24rem] flex-col justify-start pb-10 pt-12 lg:min-h-[clamp(38rem,84vh,50rem)] lg:pb-12 lg:pt-24">
          <div className="lg:ml-auto lg:w-[46%] xl:w-[44%]">
            <HeroCopy>
              <HeroEyebrow label={badges[0] ?? ""} />

              <h1 className="ds-reveal mt-6 text-display text-balance text-foreground">
                {heroTitle || t("brand.tagline")}
              </h1>

              {(heroBody || heroSubtitle) && (
                <p className="ds-reveal mt-6 text-body-lg leading-relaxed text-text-secondary">
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
      </Container>

      {/*
       * Below lg this wrapper gives the photograph the page gutters and places
       * it after the copy; from lg up it stops generating a box entirely so the
       * media can position itself against the section and bleed full width.
       */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:contents">
        <HeroMedia
          image={hero?.image ?? null}
          alt={t("home.hero.imageAlt")}
          objectPosition="22% 62%"
        />
      </div>

      {/*
       * Floats over the open courtyard on the left, opposite the copy and clear
       * of the Kaaba, in both directions. Physical `left` on purpose — the card
       * follows the photograph, not the text direction. Last in the section so
       * it stays clickable above the container that shares its area.
       */}
      <div className="absolute bottom-6 left-4 z-20 max-w-[18rem] sm:left-6 lg:bottom-10 lg:left-8">
        <HeroMediaCard
          image={cardImage}
          eyebrow={t("home.hero.mediaEyebrow")}
          title={t("home.hero.mediaTitle")}
          cta={t("home.hero.mediaCta")}
        />
      </div>
    </section>
  );
}
