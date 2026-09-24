import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Newspaper,
  Upload,
  Calendar,
  User,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  EmptyState,
  ErrorState,
  FilterTabs,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  StatusSwitch,
  useDebounced,
  shortDate,
} from "@/components/admin/kit";
import { LocalizedField } from "@/components/admin/LocalizedField";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/blog")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("blog") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: BlogAdminPage,
});

type Article = Database["public"]["Tables"]["articles"]["Row"];

interface ArticleDraft {
  id: string | null;
  title: string;
  title_fr: string;
  title_en: string;
  slug: string;
  excerpt: string;
  excerpt_fr: string;
  excerpt_en: string;
  content: string;
  content_fr: string;
  content_en: string;
  cover: string;
  author: string;
  tags: string;
  published: boolean;
  published_at: string | null;
}

const EMPTY_ARTICLE: ArticleDraft = {
  id: null,
  title: "",
  title_fr: "",
  title_en: "",
  slug: "",
  excerpt: "",
  excerpt_fr: "",
  excerpt_en: "",
  content: "",
  content_fr: "",
  content_en: "",
  cover: "",
  author: "فريق جنة الصحراء",
  tags: "",
  published: true,
  published_at: null,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function BlogAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();

  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Article | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const debounced = useDebounced(search);

  const list = useQuery({
    queryKey: ["admin-articles"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
    staleTime: 30_000,
  });

  const articles = useMemo(() => list.data ?? [], [list.data]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["article"] });
  }

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("articles")
        .update({
          published,
          published_at: published ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(v.published ? "تم نشر المقال بنجاح" : "تم تحويل المقال إلى مسودة");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "فشل تحديث حالة نشر المقال"),
    onSettled: () => setPendingArticleId(null),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("content.common.deleted"));
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setConfirmDelete(null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (d: ArticleDraft) => {
      const cleanSlug = slugify(d.slug || d.title);
      const payload = {
        title: d.title.trim(),
        title_fr: d.title_fr.trim() || null,
        title_en: d.title_en.trim() || null,
        slug: cleanSlug,
        excerpt: d.excerpt.trim() || null,
        excerpt_fr: d.excerpt_fr.trim() || null,
        excerpt_en: d.excerpt_en.trim() || null,
        content: d.content.trim() || null,
        content_fr: d.content_fr.trim() || null,
        content_en: d.content_en.trim() || null,
        cover: d.cover.trim() || null,
        author: d.author.trim() || null,
        tags: d.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        published: d.published,
        published_at: d.published ? d.published_at || new Date().toISOString() : null,
      };

      if (d.id) {
        const { error } = await supabase.from("articles").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("content.blog.toasts.saved"));
      setDraft(null);
      invalidate();
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : String(err ?? "");
      if (/duplicate key|unique constraint/i.test(raw)) {
        toast.error("الرابط المختصر (slug) مستخدم بالفعل، يرجى اختيار رابط آخر");
      } else {
        toast.error(raw || t("content.blog.toasts.saveFailed"));
      }
    },
  });

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setIsUploading(true);
    try {
      const url = await uploadMedia(file, "blog");
      setDraft((d) => (d ? { ...d, cover: url } : d));
      toast.success(t("content.common.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("content.common.uploadFailed"));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return articles.filter((a) => {
      if (statusFilter === "published" && !a.published) return false;
      if (statusFilter === "draft" && a.published) return false;
      if (!needle) return true;
      return [a.title, a.title_fr, a.title_en, a.slug, a.author, a.excerpt]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [articles, statusFilter, debounced]);

  function edit(row: Article) {
    setDraft({
      id: row.id,
      title: row.title ?? "",
      title_fr: row.title_fr ?? "",
      title_en: row.title_en ?? "",
      slug: row.slug ?? "",
      excerpt: row.excerpt ?? "",
      excerpt_fr: row.excerpt_fr ?? "",
      excerpt_en: row.excerpt_en ?? "",
      content: row.content ?? "",
      content_fr: row.content_fr ?? "",
      content_en: row.content_en ?? "",
      cover: row.cover ?? "",
      author: row.author ?? "",
      tags: Array.isArray(row.tags) ? (row.tags as string[]).join(", ") : "",
      published: row.published ?? true,
      published_at: row.published_at,
    });
  }

  const canSave = Boolean(draft && draft.title.trim().length > 1);

  return (
    <Page
      title={t("content.blog.pageTitle")}
      description={t("content.blog.pageDescription")}
      actions={
        <Button onClick={() => setDraft({ ...EMPTY_ARTICLE })}>
          <Plus className="me-2 h-4 w-4" />
          {t("content.blog.newArticle")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "all", label: t("content.services.filters.all"), count: articles.length },
            {
              value: "published",
              label: "منشور",
              count: articles.filter((r) => r.published).length,
            },
            {
              value: "draft",
              label: "مسودة",
              count: articles.filter((r) => !r.published).length,
            },
          ]}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ابحث بالعنوان أو الرابط أو الكاتب…"
          className="lg:ms-auto lg:max-w-sm"
        />
      </div>

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {list.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={4} />
          </div>
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={
                articles.length === 0 ? t("content.blog.empty") : t("content.services.noMatchTitle")
              }
              description={
                articles.length === 0
                  ? "أضف مقالاتك الأولى لتظهر للمسافرين والزوار."
                  : t("content.services.noMatchDescription")
              }
              icon={Newspaper}
              action={
                articles.length === 0 ? (
                  <Button onClick={() => setDraft({ ...EMPTY_ARTICLE })}>
                    <Plus className="me-2 h-4 w-4" />
                    {t("content.blog.newArticle")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5 hover:bg-surface-sunken/20 transition-colors"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {a.cover ? (
                    <img
                      src={a.cover}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover border border-border-subtle"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground border border-border-subtle">
                      <Newspaper className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{a.title}</p>
                      <span
                        className="text-caption font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-surface-sunken/60 hidden sm:inline"
                        dir="ltr"
                      >
                        /{a.slug}
                      </span>
                    </div>

                    {a.excerpt && (
                      <p className="mt-0.5 text-caption text-muted-foreground line-clamp-1">
                        {a.excerpt}
                      </p>
                    )}

                    <div className="mt-1 flex items-center gap-3 text-caption text-muted-foreground">
                      {a.author && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {a.author}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {shortDate(a.published_at || a.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <StatusSwitch
                    checked={Boolean(a.published)}
                    disabled={togglePublish.isPending && pendingArticleId === a.id}
                    isPending={togglePublish.isPending && pendingArticleId === a.id}
                    onCheckedChange={(published) => {
                      setPendingArticleId(a.id);
                      togglePublish.mutate({ id: a.id, published });
                    }}
                    activeLabel="منشور"
                    inactiveLabel="مسودة"
                    ariaLabel={
                      a.published ? t("content.blog.unpublish") : t("content.blog.publish")
                    }
                  />

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t("content.common.edit")}
                      onClick={() => edit(a)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={t("content.common.delete")}
                      onClick={() => setConfirmDelete(a)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ------------------------------------------------------------ editor */}
      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? t("content.blog.editTitle") : t("content.blog.newTitle")}
        description="إدارة محتوى المقال، النص المترجم، صورة الغلاف وإعدادات النشر."
        footer={
          draft ? (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                {t("ops.common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!canSave || saveMutation.isPending}
                onClick={() => {
                  if (canSave && !saveMutation.isPending) {
                    saveMutation.mutate(draft);
                  }
                }}
              >
                {saveMutation.isPending ? t("content.common.saving") : t("ops.common.save")}
              </Button>
            </div>
          ) : undefined
        }
      >
        {draft && (
          <div className="space-y-6">
            {/* SECTION 1 — CONTENT */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                {t("content.blog.fields.title")}
              </h3>
              <LocalizedField
                label={t("content.blog.fields.title")}
                values={{ base: draft.title, fr: draft.title_fr, en: draft.title_en }}
                onChange={(v) =>
                  setDraft({ ...draft, title: v.base, title_fr: v.fr, title_en: v.en })
                }
              />
            </div>

            {/* SECTION 2 — EXCERPT */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                المقتطف المختصر
              </h3>
              <LocalizedField
                label={t("content.blog.fields.excerpt")}
                rows={2}
                values={{ base: draft.excerpt, fr: draft.excerpt_fr, en: draft.excerpt_en }}
                onChange={(v) =>
                  setDraft({ ...draft, excerpt: v.base, excerpt_fr: v.fr, excerpt_en: v.en })
                }
              />
            </div>

            {/* SECTION 3 — ARTICLE CONTENT */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                محتوى المقال الكامل
              </h3>
              <LocalizedField
                label={t("content.blog.fields.content")}
                rows={10}
                values={{ base: draft.content, fr: draft.content_fr, en: draft.content_en }}
                onChange={(v) =>
                  setDraft({ ...draft, content: v.base, content_fr: v.fr, content_en: v.en })
                }
              />
            </div>

            {/* SECTION 4 — SEO & MEDIA */}
            <div className="space-y-4">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                الوسائط والرابط المختصر (SEO)
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="article-slug">{t("content.blog.fields.slug")}</Label>
                <Input
                  id="article-slug"
                  dir="ltr"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  onBlur={() => setDraft({ ...draft, slug: slugify(draft.slug || draft.title) })}
                  placeholder="flight-booking-tips"
                />
                <p className="text-caption text-muted-foreground">
                  الرابط الظاهر في المتصفح، مثال: ‎/blog/flight-booking-tips
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-cover">{t("content.blog.fields.cover")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="article-cover"
                    dir="ltr"
                    value={draft.cover}
                    onChange={(e) => setDraft({ ...draft, cover: e.target.value })}
                    placeholder="https://… أو قم برفع صورة"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-input border border-border px-3 text-small font-medium hover:bg-accent shrink-0">
                    <Upload className="h-4 w-4 text-primary" />
                    {isUploading
                      ? t("content.common.saving")
                      : t("content.services.actions.upload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={handleCoverUpload}
                    />
                  </label>
                </div>
                {draft.cover && (
                  <div className="relative mt-2 aspect-video w-full max-w-md rounded-lg overflow-hidden border border-border-subtle bg-surface-sunken">
                    <img src={draft.cover} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, cover: "" })}
                      className="absolute top-2 end-2 rounded-full bg-foreground/70 p-1.5 text-background hover:bg-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="article-author">{t("content.blog.fields.author")}</Label>
                  <Input
                    id="article-author"
                    value={draft.author}
                    onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                    placeholder="فريق جنة الصحراء"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="article-tags">{t("content.blog.fields.tags")}</Label>
                  <Input
                    id="article-tags"
                    value={draft.tags}
                    onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                    placeholder="طيران, نصائح, سياحة"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5 — PUBLISHING */}
            <div className="space-y-4">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                حالة النشر
              </h3>

              <div className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface-sunken/20 p-3.5">
                <div className="min-w-0">
                  <p className="text-small font-medium">{t("content.blog.table.published")}</p>
                  <p className="text-caption text-muted-foreground">
                    المقالات المنشورة فقط تظهر في صفحة المدونة العامة.
                  </p>
                </div>
                <StatusSwitch
                  checked={Boolean(draft.published)}
                  activeLabel="منشور"
                  inactiveLabel="مسودة"
                  onCheckedChange={(v) => setDraft({ ...draft, published: v })}
                />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.blog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.title
                ? `هل أنت متأكد من حذف مقال «${confirmDelete.title}»؟`
                : "هل أنت متأكد من حذف هذا المقال؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
            >
              {t("ops.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
