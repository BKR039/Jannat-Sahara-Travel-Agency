import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { ArticleDialog } from "@/components/common/ArticleDialog";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { articlesQuery } from "@/lib/queries";
import { articleTags } from "@/lib/blog";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "المدونة — نصائح السفر والعمرة | جنة الصحراء" },
      { name: "description", content: "مقالات وأخبار ونصائح للسفر والعمرة من فريق جنة الصحراء للسفر." },
      { property: "og:title", content: "المدونة — نصائح السفر والعمرة | جنة الصحراء" },
      { property: "og:description", content: "نصائح للسفر ودليل العمرة والوجهات السياحية." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "المدونة — نصائح السفر والعمرة | جنة الصحراء" },
      { name: "twitter:description", content: "نصائح للسفر ودليل العمرة والوجهات السياحية." },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "مدونة جنة الصحراء",
          description: "مقالات وأخبار ونصائح للسفر والعمرة.",
          url: "/blog",
        }),
      },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(articlesQuery());
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    data?.forEach((a) => articleTags(a).forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      const matchesCategory = !category || articleTags(a).includes(category);
      const haystack = `${a.title} ${a.excerpt ?? ""} ${a.author ?? ""}`.toLowerCase();
      return matchesCategory && (!q || haystack.includes(q));
    });
  }, [data, search, category]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeading eyebrow="📰" title={t("nav.blog")} description={t("home.latestArticlesDesc")} />

        <div className="mb-8 flex flex-col gap-4">
          <div className="relative mx-auto w-full max-w-xl">
            <Search
              className="pointer-events-none absolute top-1/2 start-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في المقالات..."
              aria-label="البحث في المقالات"
              className="h-12 w-full rounded-full border border-border-subtle bg-card ps-11 pe-11 text-small text-foreground shadow-sm outline-none transition-all duration-base ease-standard placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="مسح البحث"
                className="absolute top-1/2 end-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <CategoryChip active={!category} onClick={() => setCategory(null)}>
                الكل
              </CategoryChip>
              {categories.map((c) => (
                <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </CategoryChip>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <SkeletonGrid count={6} aspect="aspect-[16/10]" />
        ) : !filtered.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, i) => (
              <ArticleCard key={a.id} article={a} index={i} onOpen={setOpenSlug} />
            ))}
          </div>
        )}
      </section>
      <ArticleDialog slug={openSlug} onClose={() => setOpenSlug(null)} onOpenArticle={setOpenSlug} />
    </SiteLayout>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-caption font-semibold transition-all duration-base ease-standard ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border-subtle bg-card text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
