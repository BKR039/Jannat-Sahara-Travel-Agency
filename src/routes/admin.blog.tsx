import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Newspaper, Upload, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { LocalizedField } from "@/components/admin/LocalizedField";
import { ErrorState } from "@/components/admin/kit";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({
    meta: [{ title: adminDocTitle("blog") }],
  }),
  component: BlogAdminPage,
});

type Article = Database["public"]["Tables"]["articles"]["Row"];

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
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-articles"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
  }

  const togglePublish = useMutation({
    mutationFn: async (a: Article) => {
      const { error } = await supabase
        .from("articles")
        .update({
          published: !a.published,
          published_at: !a.published ? new Date().toISOString() : a.published_at,
        })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("content.common.deleted"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t("content.blog.pageTitle")}
        description={t("content.blog.pageDescription")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("content.blog.newArticle")}
          </Button>
        }
      />
      <AdminCard>
        {list.isLoading ? (
          <p className="text-small text-muted-foreground">{t("content.blog.loading")}</p>
        ) : list.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => list.refetch()} />
        ) : !list.data?.length ? (
          <EmptyState title={t("content.blog.empty")} icon={Newspaper} />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-border text-start">
                  <th className="px-4 sm:px-5 py-2 font-semibold">
                    {t("content.blog.table.title")}
                  </th>
                  <th className="px-4 py-2 font-semibold">{t("content.blog.table.slug")}</th>
                  <th className="px-4 py-2 font-semibold">{t("content.blog.table.published")}</th>
                  <th className="px-4 py-2 font-semibold">{t("content.blog.table.date")}</th>
                  <th className="px-4 sm:px-5 py-2 font-semibold text-end">
                    {t("content.blog.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-3">
                        {a.cover && (
                          <img src={a.cover} alt="" className="h-10 w-10 rounded object-cover" />
                        )}
                        <div>
                          <div className="font-medium">{a.title}</div>
                          <div className="text-caption text-muted-foreground line-clamp-1">
                            {a.excerpt}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">/{a.slug}</td>
                    <td className="px-4 py-3">
                      {/*
                       * A bare <button> wrapping a 16px icon: no accessible
                       * name at all (a `title` is not one for a control whose
                       * only child is an svg), and a 16×16 hit area. The
                       * shared icon button carries both the name and the
                       * touch floor.
                       */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => togglePublish.mutate(a)}
                        title={
                          a.published ? t("content.blog.unpublish") : t("content.blog.publish")
                        }
                        aria-label={
                          a.published ? t("content.blog.unpublish") : t("content.blog.publish")
                        }
                      >
                        {a.published ? (
                          <Eye className="h-4 w-4 text-success" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-caption">
                      {a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("content.common.edit")}
                        onClick={() => setEditing(a)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("content.common.delete")}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("content.blog.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{a.title}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(a.id)}>
                              {t("ops.common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <ArticleEditor
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            invalidate();
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function ArticleEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Article | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [f, setF] = useState({
    title: initial?.title ?? "",
    title_fr: initial?.title_fr ?? "",
    title_en: initial?.title_en ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    excerpt_fr: initial?.excerpt_fr ?? "",
    excerpt_en: initial?.excerpt_en ?? "",
    content: initial?.content ?? "",
    content_fr: initial?.content_fr ?? "",
    content_en: initial?.content_en ?? "",
    cover: initial?.cover ?? "",
    author: initial?.author ?? "",
    tags: Array.isArray(initial?.tags) ? (initial!.tags as string[]).join(", ") : "",
    published: initial?.published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "blog");
      setF((s) => ({ ...s, cover: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function save() {
    if (!f.title.trim() || !f.slug.trim())
      return toast.error(t("content.blog.toasts.titleSlugRequired"));
    const payload = {
      title: f.title.trim(),
      // Empty stays NULL so the documented public fallback applies.
      title_fr: f.title_fr.trim() || null,
      title_en: f.title_en.trim() || null,
      slug: slugify(f.slug || f.title),
      excerpt: f.excerpt.trim() || null,
      excerpt_fr: f.excerpt_fr.trim() || null,
      excerpt_en: f.excerpt_en.trim() || null,
      content: f.content.trim() || null,
      content_fr: f.content_fr.trim() || null,
      content_en: f.content_en.trim() || null,
      cover: f.cover.trim() || null,
      author: f.author.trim() || null,
      tags: f.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      published: f.published,
      published_at: f.published ? new Date().toISOString() : null,
    };
    setSaving(true);
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("articles").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(payload);
        if (error) throw error;
      }
      toast.success(t("content.blog.toasts.saved"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("content.blog.editTitle") : t("content.blog.newTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <LocalizedField
              label={t("content.blog.fields.title")}
              values={{ base: f.title, fr: f.title_fr, en: f.title_en }}
              onChange={(v) => setF({ ...f, title: v.base, title_fr: v.fr, title_en: v.en })}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("content.blog.fields.slug")}</Label>
            <Input
              value={f.slug}
              onChange={(e) => setF({ ...f, slug: e.target.value })}
              onBlur={() => setF({ ...f, slug: slugify(f.slug) })}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("content.blog.fields.author")}</Label>
            <Input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label={t("content.blog.fields.excerpt")}
              rows={2}
              values={{ base: f.excerpt, fr: f.excerpt_fr, en: f.excerpt_en }}
              onChange={(v) => setF({ ...f, excerpt: v.base, excerpt_fr: v.fr, excerpt_en: v.en })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label={t("content.blog.fields.content")}
              rows={12}
              values={{ base: f.content, fr: f.content_fr, en: f.content_en }}
              onChange={(v) => setF({ ...f, content: v.base, content_fr: v.fr, content_en: v.en })}
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label>{t("content.blog.fields.cover")}</Label>
            <div className="flex gap-2">
              <Input
                value={f.cover}
                onChange={(e) => setF({ ...f, cover: e.target.value })}
                placeholder="https://…"
              />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
            {f.cover && <img src={f.cover} alt="" className="mt-2 h-24 rounded-md object-cover" />}
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label>{t("content.blog.fields.tags")}</Label>
            <Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} />
            <Label>{t("content.blog.table.published")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("ops.common.cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t("content.common.saving") : t("content.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
