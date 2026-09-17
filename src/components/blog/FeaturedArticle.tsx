import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import type { Article } from "@/lib/queries";
import { articleCategory, readingMinutes } from "@/lib/blog";
import { ArticleMeta, CategoryBadge } from "./ArticleMeta";
import { useLocalized } from "@/lib/localize";

/**
 * The lead article.
 *
 * The listing was a uniform three-column grid in which the newest piece and
 * the twentieth carried identical weight, so nothing on the page said "start
 * here". This gives the first article the size an editor would give it — a
 * wide image beside a full-length excerpt — while every other article keeps
 * the standard card. It is the same data and the same reader; only the
 * emphasis differs.
 */
export function FeaturedArticle({
  article,
  onOpen,
}: {
  article: Article;
  onOpen: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();
  const category = articleCategory(article, lang);
  const title = L(article, "title");
  const excerpt = L(article, "excerpt", "empty");

  return (
    <article className="ds-reveal group overflow-hidden rounded-card-lg border border-border-subtle bg-card">
      <div className="grid md:grid-cols-2">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted md:aspect-auto md:min-h-[22rem]">
          {article.cover ? (
            <img
              src={article.cover}
              alt={title}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-standard group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/15 to-accent/10" />
          )}
          {category && (
            <div className="absolute top-4 start-4">
              <CategoryBadge
                category={category}
                className="bg-card/95 ring-transparent backdrop-blur"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <span className="inline-flex w-fit items-center rounded-badge bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
            {t("blog.featured")}
          </span>
          <h2 className="text-h3 font-bold leading-tight text-foreground transition-colors duration-base group-hover:text-primary [overflow-wrap:anywhere]">
            {title}
          </h2>
          {excerpt && (
            <p className="line-clamp-4 text-body leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <ArticleMeta article={article} />
            <span className="text-caption text-muted-foreground">
              {t("common.minutesShort", { count: readingMinutes(article) })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpen(article.slug)}
            className="mt-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-button bg-gradient-sunrise px-6 text-small font-bold text-primary-foreground transition-[filter,transform] duration-base ease-standard hover:-translate-y-0.5 hover:brightness-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
          >
            {t("blog.readMore")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
