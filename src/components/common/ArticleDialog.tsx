import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { articleBySlugQuery, articlesQuery } from "@/lib/queries";
import { articleCategory, articleTags, formatArticleDate, readingMinutes } from "@/lib/blog";
import { ArticleMeta, CategoryBadge } from "@/components/blog/ArticleMeta";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { useLocalized } from "@/lib/localize";

export function ArticleDialog({
  slug,
  onClose,
  onOpenArticle,
}: {
  slug: string | null;
  onClose: () => void;
  onOpenArticle?: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();
  const { data: article, isLoading } = useQuery({
    ...articleBySlugQuery(slug ?? ""),
    enabled: !!slug,
  });
  const { data: all } = useQuery({ ...articlesQuery(), enabled: !!slug });

  const category = article ? articleCategory(article, lang) : null;
  const tags = article ? articleTags(article, lang) : [];
  const title = L(article, "title");
  const excerpt = L(article, "excerpt", "empty");
  const content = L(article, "content", "empty");

  const publishedList = all ?? [];
  const otherArticles = publishedList.filter((a) => a.slug !== slug);
  const tagMatched = otherArticles.filter(
    (a) => tags.length && articleTags(a, lang).some((tag) => tags.includes(tag)),
  );
  const fallbacks = otherArticles.filter((a) => !tagMatched.some((m) => m.slug === a.slug));
  const related = [...tagMatched, ...fallbacks].slice(0, 3);

  return (
    <Dialog open={!!slug} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-[760px] overflow-y-auto p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-card-lg border-border-subtle shadow-xl">
        {isLoading || !article ? (
          <div className="animate-pulse space-y-4 py-4">
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="aspect-[16/9] rounded-2xl bg-muted" />
            <div className="space-y-2 pt-2">
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
            </div>
          </div>
        ) : (
          <article className="space-y-6 text-start">
            {/* Header Affordance: Category + Open full page link */}
            <div className="flex items-center justify-between gap-4">
              {category && <CategoryBadge category={category} variant="editorial" />}
              <Link
                to="/blog/$slug"
                params={{ slug: article.slug }}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline"
              >
                <span>{t("blog.openFullPage")}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* Dominant Title & Metadata */}
            <DialogHeader className="p-0 text-start space-y-3">
              <DialogTitle className="text-h2 font-extrabold leading-[1.3] text-foreground tracking-normal">
                {title}
              </DialogTitle>
              <ArticleMeta article={article} variant="editorial" />
              <DialogDescription className="sr-only">{excerpt || title}</DialogDescription>
            </DialogHeader>

            {/* Controlled Hero Image */}
            {article.cover && (
              <figure className="my-6">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border-subtle bg-muted shadow-xs">
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

            {/* Editorial Intro / Lead */}
            {excerpt && (
              <div className="pb-5 mb-5 border-b border-border-subtle/80">
                <p className="text-[1.125rem] md:text-[1.2rem] font-medium leading-[1.8] text-foreground/85">
                  {excerpt}
                </p>
              </div>
            )}

            {/* Content with comfortable typography */}
            {content && <ArticleContent content={content} className="mt-4" />}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle/70 pt-5 mt-6">
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

            {/* Share Row: placed AFTER body */}
            <div className="border-t border-border-subtle pt-4 mt-6">
              <ShareButtons slug={article.slug} title={title} variant="editorial" />
            </div>

            {/* Related Articles: placed at the very end */}
            {related.length > 0 && (
              <section className="border-t border-border-subtle pt-6 mt-8">
                <h3 className="mb-4 text-small font-bold text-foreground">
                  {t("blog.relatedArticles")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onOpenArticle?.(r.slug)}
                      className="group overflow-hidden rounded-card border border-border-subtle bg-card text-start transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                        {r.cover ? (
                          <img
                            src={r.cover}
                            alt={L(r, "title")}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-primary/15 to-accent/10" />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-[0.7rem] text-muted-foreground mb-1">
                          {formatArticleDate(r.published_at, lang)}
                        </div>
                        <p className="line-clamp-2 text-caption font-bold leading-snug text-foreground group-hover:text-primary">
                          {L(r, "title")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </DialogContent>
    </Dialog>
  );
}
