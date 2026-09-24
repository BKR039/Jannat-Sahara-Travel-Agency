import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { transformSrcSet } from "@/lib/image-srcset";
import { contentQuery, galleryQuery } from "@/lib/queries";
import { pickLocalizedList, useLocalized } from "@/lib/localize";
import { HeroMedia } from "./hero/HeroMedia";
import { HeroActions, HeroCopy, HeroEyebrow, HeroMediaCard } from "./hero/parts";

/**
 * Homepage hero.
 *
 * Full-bleed cinematic layout: the existing photograph spans 100% of the viewport
 * width behind a layered, atmospheric contrast scrim. The central editorial group
 * (experience badge, display headline, supporting text, and primary CTAs) is
 * centered both horizontally and vertically, creating an emotionally resonant,
 * premium first impression without competing split panels or clutter.
 */
export function HeroSection() {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();

  const { data: hero } = useQuery(contentQuery("hero"));
  const { data: gallery } = useQuery(galleryQuery("umrah", 1));

  const heroTitle = L(hero, "title", "empty");
  const heroSubtitle = L(hero, "subtitle", "empty");
  const heroBody = L(hero, "body", "empty");
  const heroCta = L(hero, "cta_label", "empty");
  const badges = pickLocalizedList(hero?.data as Record<string, unknown> | null, "badges", lang);

  const cardImage = gallery?.[0]?.image ?? null;

  return (
    <section className="relative isolate overflow-hidden min-h-[600px] sm:min-h-[680px] lg:min-h-[740px] xl:min-h-[780px] flex items-center justify-center bg-[var(--hero-frame)] bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(217,119,6,0.18),rgba(18,12,8,0.98))]">
      {/*
       * Full-bleed photographic background with multi-layered cinematic overlay.
       * Spans the entire viewport width with zero split borders.
       */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <HeroMedia
          image={hero?.image ?? null}
          alt={t("home.hero.imageAlt")}
          objectPosition="center 38%"
        />
      </div>

      {/*
       * Centered editorial content:
       * Eyebrow badge, dominant H1 headline, short supporting description, and CTAs.
       * Rendered immediately at opacity: 1 on first paint — no artificial delay or hidden opacity.
       */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <HeroCopy>
          <HeroEyebrow label={badges[0] ?? ""} />

          <h1 className="mt-3.5 sm:mt-4 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-black leading-[1.28] sm:leading-[1.22] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {heroTitle || t("brand.tagline")}
          </h1>

          {(heroSubtitle || heroBody) && (
            <p className="mt-3 sm:mt-3.5 max-w-2xl text-body-lg sm:text-h5 font-medium leading-relaxed text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">
              {heroSubtitle || heroBody}
            </p>
          )}

          <HeroActions
            primaryLabel={heroCta || t("actions.bookNow")}
            primaryHref={hero?.cta_href ?? "/umrah"}
          />
        </HeroCopy>
      </div>

      {/*
       * Subtle floating media teaser pill:
       * Positioned discreetly in the bottom-start corner without competing with the centered message.
       */}
      <div className="absolute bottom-4 start-4 sm:bottom-5 sm:start-6 z-10 hidden sm:block opacity-85 hover:opacity-100 transition-opacity duration-base">
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
