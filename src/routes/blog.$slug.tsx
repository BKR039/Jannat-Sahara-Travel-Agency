import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { articleBySlugQuery, articlesQuery } from "@/lib/queries";
import { articleCategory, articleTags, readingMinutes } from "@/lib/blog";
import { ArticleMeta, CategoryBadge } from "@/components/blog/ArticleMeta";
import { ShareButtons } from "@/components/blog/ShareButtons";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(articleBySlugQuery(params.slug)),
  head: ({ params, loaderData }) => {
    const title = loaderData?.title ? `${loaderData.title}${i18n.t("seo.blogArticle.titleSuffix")}` : i18n.t("seo.blogArticle.defaultTitle");
    const description = loaderData?.excerpt ?? i18n.t("seo.blogArticle.defaultDescription");
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/blog/${params.slug}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (loaderData?.cover?.startsWith("https://")) {
      meta.push({ property: "og:image", content: loaderData.cover });
      meta.push({ name: "twitter:image", content: loaderData.cover });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: loaderData?.title ?? i18n.t("seo.blogArticle.defaultHeadline"),
            description,
            datePublished: loaderData?.published_at ?? undefined,
            dateModified: loaderData?.updated_at ?? undefined,
            author: { "@type": "Person", name: loaderData?.author ?? i18n.t("seo.blogArticle.authorFallback") },
            publisher: { "@type": "Organization", name: i18n.t("seo.blogArticle.publisherName") },
            mainEntityOfPage: `/blog/${params.slug}`,
          }),
        },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { t } = useTranslation();
  const { slug } = Route.useParams();
  const { data: article, isLoading } = useQuery(articleBySlugQuery(slug));
  const { data: all } = useQuery(articlesQuery());

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 py-16">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="aspect-[16/9] rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!article) throw notFound();

  const category = articleCategory(article);
  const tags = articleTags(article);
  const related = (all ?? [])
    .filter((a) => a.slug !== slug && (!tags.length || articleTags(a).some((tag) => tags.includes(tag))))
    .slice(0, 3);

  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("blog.backToBlog")}
        </Link>

        {category && <CategoryBadge category={category} className="mb-3" />}
        <h1 className="text-h2 font-extrabold leading-tight text-foreground">{article.title}</h1>
        <ArticleMeta article={article} className="mt-4" />
        {article.excerpt && (
          <p className="mt-4 text-body-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}

        {article.cover && (
          <img
            src={article.cover}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="mt-8 aspect-[16/9] w-full rounded-xl object-cover shadow-sm"
          />
        )}

        {article.content && (
          <div className="mt-8 max-w-[68ch] whitespace-pre-wrap text-body-lg leading-loose text-foreground/90">
            {article.content}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-3 py-1 text-caption font-medium text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-6">
          <span className="text-caption text-muted-foreground">{t("common.minutesRead", { count: readingMinutes(article) })}</span>
          <ShareButtons slug={article.slug} title={article.title} />
        </div>

        {related.length > 0 && (
          <section className="mt-12 border-t border-border-subtle pt-8">
            <h2 className="mb-4 text-h4 font-bold text-foreground">{t("blog.relatedArticles")}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to="/blog/$slug"
                  params={{ slug: r.slug }}
                  className="group overflow-hidden rounded-lg border border-border-subtle bg-card transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                >
                  {r.cover && (
                    <img
                      src={r.cover}
                      alt={r.title}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <p className="line-clamp-2 p-3 text-caption font-semibold leading-snug text-foreground group-hover:text-primary">
                    {r.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}
