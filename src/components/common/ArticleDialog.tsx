import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { articleBySlugQuery, articlesQuery } from "@/lib/queries";
import { articleCategory, articleTags } from "@/lib/blog";
import { ArticleMeta, CategoryBadge } from "@/components/blog/ArticleMeta";
import { ShareButtons } from "@/components/blog/ShareButtons";

export function ArticleDialog({
  slug,
  onClose,
  onOpenArticle,
}: {
  slug: string | null;
  onClose: () => void;
  onOpenArticle?: (slug: string) => void;
}) {
  const { data: article, isLoading } = useQuery({ ...articleBySlugQuery(slug ?? ""), enabled: !!slug });
  const { data: all } = useQuery({ ...articlesQuery(), enabled: !!slug });

  const category = article ? articleCategory(article) : null;
  const tags = article ? articleTags(article) : [];
  const related = (all ?? [])
    .filter((a) => a.slug !== slug && (!tags.length || articleTags(a).some((tag) => tags.includes(tag))))
    .slice(0, 3);

  return (
    <Dialog open={!!slug} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {isLoading || !article ? (
          <div className="animate-pulse space-y-4 py-4">
            <div className="h-7 w-3/4 rounded bg-muted" />
            <div className="aspect-[16/9] rounded-lg bg-muted" />
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-3 text-start">
              {category && <CategoryBadge category={category} className="w-fit" />}
              <DialogTitle className="text-h3 font-extrabold leading-tight text-foreground">
                {article.title}
              </DialogTitle>
              <ArticleMeta article={article} />
              {article.excerpt && (
                <DialogDescription className="text-body leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </DialogDescription>
              )}
            </DialogHeader>

            {article.cover && (
              <img
                src={article.cover}
                alt={article.title}
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full rounded-xl object-cover"
              />
            )}

            {article.content && (
              <div className="whitespace-pre-wrap text-body leading-loose tracking-normal text-foreground/90 [word-spacing:0.05em]">
                {article.content}
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-3 py-1 text-caption font-medium text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <ShareButtons slug={article.slug} title={article.title} className="border-t border-border-subtle pt-4" />

            {related.length > 0 && (
              <div className="border-t border-border-subtle pt-4">
                <h4 className="mb-3 text-card-title font-bold text-foreground">{t("blog.relatedArticles")}</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onOpenArticle?.(r.slug)}
                      className="group overflow-hidden rounded-lg border border-border-subtle bg-card text-start transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
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
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
