import { CalendarDays, Clock, UserRound } from "lucide-react";
import type { Article } from "@/lib/queries";
import { formatArticleDate, readingMinutes } from "@/lib/blog";

export function ArticleMeta({
  article,
  className = "",
}: {
  article: Pick<Article, "author" | "published_at" | "content" | "excerpt">;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-muted-foreground ${className}`}>
      {article.published_at && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          <time dateTime={article.published_at}>{formatArticleDate(article.published_at)}</time>
        </span>
      )}
      {article.author && (
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {article.author}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {readingMinutes(article)} دقائق قراءة
      </span>
    </div>
  );
}

export function CategoryBadge({ category, className = "" }: { category: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold text-primary ring-1 ring-inset ring-primary/20 ${className}`}
    >
      {category}
    </span>
  );
}
