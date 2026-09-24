import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, ChevronLeft, Home } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { articleBySlugQuery, articlesQuery } from "@/lib/queries";
import { articleCategory, articleTags, readingMinutes, formatArticleDate } from "@/lib/blog";
import { ArticleMeta, CategoryBadge } from "@/components/blog/ArticleMeta";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { TableOfContents } from "@/components/blog/editorial/TableOfContents";
import { UmrahCtaBanner } from "@/components/blog/editorial/UmrahCtaBanner";
import { pickLocalized, useLocalized } from "@/lib/localize";
import { absoluteUrl, canonical, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ context, params }) => {
    const [article] = await Promise.all([
      context.queryClient.ensureQueryData(articleBySlugQuery(params.slug)),
      context.queryClient.ensureQueryData(articlesQuery()).catch(() => []),
    ]);
    if (!article) throw notFound();
    return article;
  },
  head: ({ params, loaderData }) => {
    const row = (loaderData ?? {}) as unknown as Record<string, unknown>;
    const lang = i18n.language;
    const localizedTitle = pickLocalized(row, "title", lang);
    const localizedExcerpt = pickLocalized(row, "excerpt", lang);

    const title = localizedTitle
      ? `${localizedTitle}${i18n.t("seo.blogArticle.titleSuffix")}`
      : i18n.t("seo.blogArticle.defaultTitle");
    const description = localizedExcerpt ?? i18n.t("seo.blogArticle.defaultDescription");
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: absoluteUrl(`/blog/${params.slug}`) },
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
      links: [canonical(`/blog/${params.slug}`)],
      scripts: [
        {
          type: "application/ld+json",
          children: jsonLd({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: localizedTitle ?? i18n.t("seo.blogArticle.defaultHeadline"),
            description,
            datePublished: loaderData?.published_at ?? undefined,
            dateModified: loaderData?.updated_at ?? undefined,
            author: {
              "@type": "Person",
              name: loaderData?.author ?? i18n.t("seo.blogArticle.authorFallback"),
            },
            publisher: { "@type": "Organization", name: i18n.t("seo.blogArticle.publisherName") },
            mainEntityOfPage: absoluteUrl(`/blog/${params.slug}`),
          }),
        },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();
  const { slug } = Route.useParams();
  const { data: article, isLoading } = useQuery(articleBySlugQuery(slug));
  const { data: all } = useQuery(articlesQuery());

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 py-16">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-12 w-3/4 rounded bg-muted" />
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="aspect-[16/9] w-full rounded-2xl bg-muted" />
          <div className="space-y-3 pt-4">
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-4/6 rounded bg-muted" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!article) throw notFound();

  const category = articleCategory(article, lang);
  const tags = articleTags(article, lang);
  const title = L(article, "title");
  const excerpt = L(article, "excerpt", "empty");
  const content = L(article, "content", "empty");

  const isUmrahRelated =
    tags.some((t) => t.includes("عمرة") || t.toLowerCase().includes("umrah")) ||
    category?.includes("عمرة") ||
    slug.includes("omrah") ||
    slug.includes("umrah");

  // Related articles: prioritize matching tags/category, fallback to other latest articles
  const publishedList = all ?? [];
  const otherArticles = publishedList.filter((a) => a.slug !== slug);
  const tagMatched = otherArticles.filter(
    (a) => tags.length && articleTags(a, lang).some((tag) => tags.includes(tag)),
  );
  const fallbacks = otherArticles.filter((a) => !tagMatched.some((m) => m.slug === a.slug));
  const related = [...tagMatched, ...fallbacks].slice(0, 3);

  // Previous & Next navigation
  const currentIndex = publishedList.findIndex((a) => a.slug === slug);
  const prevArticle = currentIndex > 0 ? publishedList[currentIndex - 1] : null;
  const nextArticle =
    currentIndex >= 0 && currentIndex < publishedList.length - 1
      ? publishedList[currentIndex + 1]
      : null;

  return (
    <SiteLayout>
      <ReadingProgress />

      <article className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-14">
        {/* Subtle Editorial Breadcrumbs */}
        <nav
          aria-label="مسار التنقل"
          className="mx-auto max-w-[800px] mb-6 flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            aria-label="الصفحة الرئيسية"
          >
            <Home className="h-3.5 w-3.5" />
            <span>الرئيسية</span>
          </Link>

          <ChevronLeft
            className="h-3 w-3 text-muted-foreground/40 rtl:rotate-0 rotate-180"
            aria-hidden
          />

          <Link to="/blog" className="transition-colors hover:text-primary">
            المدونة
          </Link>

          {category && (
            <>
              <ChevronLeft
                className="h-3 w-3 text-muted-foreground/40 rtl:rotate-0 rotate-180"
                aria-hidden
              />
              <span className="font-medium text-foreground/80">{category}</span>
            </>
          )}
        </nav>

        {/* Editorial Header */}
        <header className="mx-auto max-w-[800px] text-start">
          {category && (
            <div className="mb-4">
              <CategoryBadge category={category} variant="editorial" />
            </div>
          )}

          <h1 className="text-[clamp(1.95rem,1.4rem+2.2vw,3.4rem)] font-extrabold leading-[1.3] text-foreground tracking-normal mb-6 break-words font-display">
            {title}
          </h1>

          <ArticleMeta article={article} variant="editorial" className="mb-8" />
        </header>

        {/* Cinematic Hero Image */}
        {article.cover && (
          <figure className="mx-auto max-w-[980px] my-6 md:my-10">
            <div className="aspect-[16/9] md:aspect-[21/10] w-full overflow-hidden rounded-2xl md:rounded-card border border-border-subtle bg-muted shadow-sm">
              <img
                src={article.cover}
                alt={title}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </figure>
        )}

        {/* Two Column Layout on ultra-wide / desktop (Reading column + Sticky TOC Rail) */}
        <div className="mx-auto max-w-6xl xl:grid xl:grid-cols-[minmax(0,1fr)_260px] xl:gap-12 items-start">
          {/* Main Editorial Reading Column: max-width 780px */}
          <div className="mx-auto w-full max-w-[780px]">
            {/* Editorial Lead / Excerpt */}
            {excerpt && (
              <div className="mt-2 mb-8 pb-6 border-b border-border-subtle/70">
                <p className="text-[1.1875rem] md:text-[1.275rem] font-medium leading-[1.9] md:leading-[2.0] text-foreground/85">
                  {excerpt}
                </p>
              </div>
            )}

            {/* Collapsible Table of Contents for Mobile and Tablets */}
            <div className="xl:hidden">
              <TableOfContents variant="inline" />
            </div>

            {/* Body Content with generous line-height and semantic components */}
            {content && <ArticleContent content={content} className="mt-6" />}

            {/* Umrah Call-to-Action for pilgrims */}
            {isUmrahRelated && <UmrahCtaBanner />}

            {/* Article Footer: Tags & Share */}
            <footer className="mt-12 pt-6 border-t border-border-subtle space-y-6">
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption font-semibold text-muted-foreground me-1">
                    {t("blog.tags", { defaultValue: "الوسوم:" })}
                  </span>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-badge bg-surface-raised border border-border-subtle px-3 py-1 text-caption font-medium text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <section aria-label={t("blog.shareArticle")}>
                <ShareButtons slug={article.slug} title={title} variant="editorial" />
              </section>
            </footer>

            {/* Previous / Next Article Navigation */}
            {(prevArticle || nextArticle) && (
              <nav
                className="mt-10 grid gap-4 sm:grid-cols-2 pt-8 border-t border-border-subtle"
                aria-label={t("blog.continueReading")}
              >
                {prevArticle ? (
                  <Link
                    to="/blog/$slug"
                    params={{ slug: prevArticle.slug }}
                    className="group flex flex-col gap-1.5 rounded-card border border-border-subtle bg-card p-4 transition-all duration-base ease-standard hover:border-primary/40 hover:-translate-y-0.5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted-foreground group-hover:text-primary">
                      <ArrowRight
                        className="h-3.5 w-3.5 rtl:rotate-0 rotate-180"
                        aria-hidden="true"
                      />
                      {t("blog.previousArticle")}
                    </span>
                    <p className="line-clamp-2 text-small font-bold text-foreground group-hover:text-primary">
                      {L(prevArticle, "title")}
                    </p>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {nextArticle ? (
                  <Link
                    to="/blog/$slug"
                    params={{ slug: nextArticle.slug }}
                    className="group flex flex-col items-end text-end gap-1.5 rounded-card border border-border-subtle bg-card p-4 transition-all duration-base ease-standard hover:border-primary/40 hover:-translate-y-0.5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted-foreground group-hover:text-primary">
                      {t("blog.nextArticle")}
                      <ArrowLeft
                        className="h-3.5 w-3.5 rtl:rotate-0 rotate-180"
                        aria-hidden="true"
                      />
                    </span>
                    <p className="line-clamp-2 text-small font-bold text-foreground group-hover:text-primary">
                      {L(nextArticle, "title")}
                    </p>
                  </Link>
                ) : null}
              </nav>
            )}
          </div>

          {/* Desktop Sticky Rail (Table of Contents) */}
          <aside className="hidden xl:block">
            <TableOfContents variant="sticky" />
          </aside>
        </div>

        {/* Related Articles Section */}
        {related.length > 0 && (
          <section className="mx-auto max-w-5xl mt-16 pt-12 border-t border-border-subtle">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-h3 font-bold text-foreground">{t("blog.relatedArticles")}</h2>
              <Link
                to="/blog"
                className="text-small font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>{t("blog.all")}</span>
                <ArrowLeft className="h-4 w-4 rtl:rotate-0 rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {related.map((r) => {
                const rCategory = articleCategory(r, lang);
                const rTitle = L(r, "title");
                return (
                  <Link
                    key={r.id}
                    to="/blog/$slug"
                    params={{ slug: r.slug }}
                    className="group flex flex-col overflow-hidden rounded-card border border-border-subtle bg-card transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {r.cover ? (
                        <img
                          src={r.cover}
                          alt={rTitle}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 ease-standard group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/15 to-accent/10" />
                      )}
                      {rCategory && (
                        <span className="absolute top-2.5 start-2.5 rounded-full bg-card/90 px-2.5 py-0.5 text-[0.7rem] font-bold text-primary backdrop-blur">
                          {rCategory}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4 gap-2">
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        {r.published_at && (
                          <time dateTime={r.published_at}>
                            {formatArticleDate(r.published_at, lang)}
                          </time>
                        )}
                        {r.published_at && <span aria-hidden>·</span>}
                        <span>{t("common.minutesShort", { count: readingMinutes(r) })}</span>
                      </div>

                      <h3 className="line-clamp-2 text-small font-bold leading-snug text-foreground transition-colors duration-base group-hover:text-primary">
                        {rTitle}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}
