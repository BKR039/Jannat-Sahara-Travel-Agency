import { useTranslation } from "react-i18next";
import { CalendarDays, Clock, UserRound } from "lucide-react";
import type { Article } from "@/lib/queries";
import { formatArticleDate, readingMinutes } from "@/lib/blog";
import { useLocalized } from "@/lib/localize";

export function ArticleMeta({
  article,
  className = "",
  variant = "card",
}: {
  article: Pick<Article, "author" | "published_at" | "content" | "excerpt">;
  className?: string;
  variant?: "card" | "editorial";
}) {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();
  const author = L(article as unknown as Record<string, unknown>, "author", "base");

  if (variant === "editorial") {
    return (
      <div
        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small text-muted-foreground ${className}`}
      >
        {article.published_at && (
          <time dateTime={article.published_at} className="font-medium text-foreground/80">
            {formatArticleDate(article.published_at, lang)}
          </time>
        )}
        {article.published_at && (
          <span className="text-muted-foreground/40 select-none" aria-hidden>
            ·
          </span>
        )}
        <span className="font-normal text-muted-foreground">
          {t("common.minutesRead", { count: readingMinutes(article) })}
        </span>
        {author && (
          <>
            <span className="text-muted-foreground/40 select-none" aria-hidden>
              ·
            </span>
            <span className="font-medium text-foreground/80">{t("blog.byAuthor", { author })}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-muted-foreground ${className}`}
    >
      {article.published_at && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden />
          <time dateTime={article.published_at}>
            {formatArticleDate(article.published_at, lang)}
          </time>
        </span>
      )}
      {author && (
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-4 w-4" aria-hidden />
          {author}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-4 w-4" aria-hidden />
        {t("common.minutesRead", { count: readingMinutes(article) })}
      </span>
    </div>
  );
}

export function CategoryBadge({
  category,
  className = "",
  variant = "badge",
}: {
  category: string;
  className?: string;
  variant?: "badge" | "editorial";
}) {
  if (variant === "editorial") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        {category}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold text-primary ring-1 ring-inset ring-primary/20 ${className}`}
    >
      {category}
    </span>
  );
}
