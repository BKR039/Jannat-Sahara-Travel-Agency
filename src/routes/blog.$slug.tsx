import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { articleBySlugQuery } from "@/lib/queries";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "مقال — جنة الصحراء" },
      { name: "description", content: "قراءة مقال من مدونة جنة الصحراء." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article, isLoading } = useQuery(articleBySlugQuery(slug));

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

  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <Link to="/blog" className="mb-6 inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline">
          <ArrowRight className="h-4 w-4 rtl:rotate-180" /> العودة إلى المدونة
        </Link>
        <div className="mb-3 text-caption text-muted-foreground">
          {article.published_at && new Date(article.published_at).toLocaleDateString("ar-EG")}
          {article.author && ` · ${article.author}`}
        </div>
        <h1 className="text-h2 font-extrabold text-foreground ">{article.title}</h1>
        {article.excerpt && <p className="mt-4 text-body-lg text-muted-foreground">{article.excerpt}</p>}
        {article.cover && (
          <img src={article.cover} alt={article.title} className="mt-8 aspect-[16/9] w-full rounded-lg object-cover" />
        )}
        {article.content && (
          <div className="prose prose-lg mt-8 max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {article.content}
          </div>
        )}
      </article>
    </SiteLayout>
  );
}
