import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import type { Article } from "@/lib/queries";
import { articleCategory, readingMinutes } from "@/lib/blog";
import { ArticleMeta, CategoryBadge } from "./ArticleMeta";
import { useLocalized } from "@/lib/localize";

export function ArticleCard({
  article,
  onOpen,
  index = 0,
}: {
  article: Article;
  onOpen: (slug: string) => void;
  index?: number;
}) {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();
  const category = articleCategory(article, lang);
  const title = L(article, "title");
  const excerpt = L(article, "excerpt", "empty");

  return (
    <article
      /* Border-first: no resting shadow, and the hover reads as a change of
         border and tint rather than the card lifting off the page. */
      className="ds-reveal group flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-card transition-[border-color,transform] duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:transform-none"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {article.cover ? (
          <img
            src={article.cover}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-standard group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/15 to-accent/10" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/50 to-transparent" />
        {category && (
          <div className="absolute top-3 start-3">
            <CategoryBadge
              category={category}
              className="bg-card/95 ring-transparent backdrop-blur"
            />
          </div>
        )}
        <span className="absolute bottom-3 end-3 rounded-full bg-card/90 px-2.5 py-1 text-caption font-semibold text-foreground backdrop-blur">
          {t("common.minutesShort", { count: readingMinutes(article) })}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <ArticleMeta article={article} />
        <h3 className="line-clamp-2 text-card-title font-bold leading-snug text-foreground transition-colors duration-base group-hover:text-primary">
          {title}
        </h3>
        {excerpt && (
          <p className="line-clamp-3 text-small leading-relaxed text-muted-foreground">{excerpt}</p>
        )}
        <button
          type="button"
          onClick={() => onOpen(article.slug)}
          className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start text-caption font-semibold text-primary transition-transform duration-base hover:gap-2.5"
        >
          {t("blog.readMore")}
          {/* `ArrowLeft` here pointed backwards in both directions: left in
              LTR, and right once the RTL rotation flipped it. Forward is
              rightward in LTR and leftward in RTL, which is what this is. */}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
    </article>
  );
}
