import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { LazyImage } from "@/components/common/LazyImage";
import { useInView } from "@/hooks/useInView";
import { galleryQuery } from "@/lib/queries";


export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "المعرض — جنة الصحراء" },
      { name: "description", content: "لحظات من رحلاتنا وباقاتنا في معرض الصور." },
      { property: "og:title", content: "المعرض — جنة الصحراء" },
      { property: "og:description", content: "صور من رحلات العمرة والسياحة." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { t } = useTranslation();
  const [cat, setCat] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const { data, isLoading } = useQuery(galleryQuery());

  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((g) => g.category).filter(Boolean) as string[])),
    [data],
  );
  const filtered = useMemo(
    () => (cat ? (data ?? []).filter((g) => g.category === cat) : (data ?? [])),
    [data, cat],
  );

  /* Windowed rendering: only a page of tiles is mounted, more reveal on scroll. */
  const PAGE = 24;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [cat]);
  const { ref: sentinelRef, inView: sentinelInView } = useInView<HTMLDivElement>({ once: false });
  useEffect(() => {
    if (sentinelInView) setVisible((v) => Math.min(v + PAGE, filtered.length));
  }, [sentinelInView, filtered.length]);

  const chipClass = useCallback(
    (active: boolean) =>
      `rounded-full px-4 py-2 text-small font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`,
    [],
  );

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeading eyebrow="📷" title={t("home.gallery")} description={t("home.galleryDesc")} />

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-pressed={cat === null}
            onClick={() => setCat(null)}
            className={chipClass(cat === null)}
          >
            {t("categories.all")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
              className={chipClass(cat === c)}
            >
              {t(`categories.${c}`, { defaultValue: c })}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonGrid count={8} />
        ) : !filtered.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.slice(0, visible).map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setPreview({ src: g.image, alt: g.title ?? "" })}
                aria-label={g.title ?? t("home.gallery")}
                className="group relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-muted shadow-sm transition-shadow duration-base ease-standard hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ds-reveal"
                style={{ animationDelay: `${(i % 12) * 40}ms` }}
              >
                <LazyImage
                  src={g.image}
                  alt={g.title ?? ""}
                  wrapperClassName="h-full w-full"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="transition-transform duration-slow ease-emphasized group-hover:scale-110"
                />
                {g.title && (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <span className="text-small font-semibold text-on-dark">{g.title}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        {visible < filtered.length && <div ref={sentinelRef} className="h-10" aria-hidden="true" />}
      </section>
      <ImageLightbox src={preview?.src ?? null} alt={preview?.alt} onClose={() => setPreview(null)} />
    </SiteLayout>

  );
}
