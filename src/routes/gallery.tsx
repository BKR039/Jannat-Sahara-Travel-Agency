import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
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
  const { data, isLoading } = useQuery(galleryQuery());
  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((g) => g.category).filter(Boolean) as string[])),
    [data],
  );
  const filtered = cat ? data?.filter((g) => g.category === cat) : data;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeading eyebrow="📷" title={t("home.gallery")} description={t("home.galleryDesc")} />

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setCat(null)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              cat === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("categories.all")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`categories.${c}`, { defaultValue: c })}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonGrid count={8} />
        ) : !filtered?.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((g, i) => (
              <div
                key={g.id}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-muted animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <img
                  src={g.image}
                  alt={g.title ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                {g.title && (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <span className="text-sm font-semibold text-on-dark">{g.title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
