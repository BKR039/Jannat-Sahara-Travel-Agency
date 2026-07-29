import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { articlesQuery } from "@/lib/queries";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "المدونة — جنة الصحراء" },
      { name: "description", content: "مقالات وأخبار ونصائح للسفر والعمرة." },
      { property: "og:title", content: "المدونة — جنة الصحراء" },
      { property: "og:description", content: "نصائح للسفر ودليل العمرة والوجهات السياحية." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(articlesQuery());

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeading eyebrow="📰" title={t("nav.blog")} description={t("home.latestArticlesDesc")} />
        {isLoading ? (
          <SkeletonGrid count={6} aspect="aspect-[16/10]" />
        ) : !data?.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((a, i) => (
              <Link
                key={a.id}
                to="/blog/$slug"
                params={{ slug: a.slug }}
                className="group flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-card shadow-sm transition-all duration-[220ms] ease-standard hover:-translate-y-1 hover:shadow-lg ds-reveal"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {a.cover && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={a.cover} alt={a.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="text-caption text-muted-foreground">
                    {a.published_at && new Date(a.published_at).toLocaleDateString("ar-EG")}
                    {a.author && ` · ${a.author}`}
                  </div>
                  <h3 className="line-clamp-2 text-card-title text-foreground group-hover:text-primary">
                    {a.title}
                  </h3>
                  {a.excerpt && <p className="line-clamp-3 text-small text-muted-foreground">{a.excerpt}</p>}
                  <span className="mt-auto inline-flex items-center gap-1 text-caption font-semibold text-primary">
                    {t("actions.readMore")} <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
