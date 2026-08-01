import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { articleBySlugQuery } from "@/lib/queries";

export function ArticleDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const { data: article, isLoading } = useQuery({ ...articleBySlugQuery(slug ?? ""), enabled: !!slug });

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
            <DialogHeader className="text-start">
              <div className="text-caption text-muted-foreground">
                {article.published_at && new Date(article.published_at).toLocaleDateString("ar-EG")}
                {article.author && ` · ${article.author}`}
              </div>
              <DialogTitle className="text-h3 font-extrabold text-foreground">{article.title}</DialogTitle>
              {article.excerpt && (
                <DialogDescription className="text-body text-muted-foreground">{article.excerpt}</DialogDescription>
              )}
            </DialogHeader>
            {article.cover && (
              <img
                src={article.cover}
                alt={article.title}
                className="aspect-[16/9] w-full rounded-lg object-cover"
              />
            )}
            {article.content && (
              <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">{article.content}</div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
