import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ImageIcon, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/admin/gallery")({
  head: () => ({
    meta: [{ title: adminDocTitle("gallery") }],
  }),
  component: GalleryAdminPage,
});

type Item = Database["public"]["Tables"]["gallery_items"]["Row"];

function GalleryAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState("all");

  const list = useQuery({
    queryKey: ["admin-gallery", category] as const,
    queryFn: async () => {
      let q = supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data as Item[];
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["admin-gallery-categories"] as const,
    queryFn: async () => {
      const { data } = await supabase.from("gallery_items").select("category");
      return Array.from(new Set((data ?? []).map((r) => r.category).filter(Boolean))) as string[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("content.common.deleted"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (i: Item) => {
      const { error } = await supabase
        .from("gallery_items")
        .update({ active: !i.active })
        .eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  async function bulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadMedia(file, "gallery");
        const { error } = await supabase.from("gallery_items").insert({
          image: url,
          title: file.name.replace(/\.[^.]+$/, ""),
          active: true,
          sort_order: 0,
        });
        if (error) throw error;
        ok++;
      } catch (err) {
        console.error(err);
      }
    }
    toast.success(`Uploaded ${ok} image(s)`);
    invalidate();
    e.target.value = "";
  }

  return (
    <>
      <PageHeader
        title={t("content.gallery.pageTitle")}
        description={t("content.gallery.pageDescription")}
        actions={
          <>
            <label className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-small text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Upload className="h-4 w-4" />
              {t("content.gallery.bulkUpload")}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={bulkUpload}
              />
            </label>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t("content.gallery.addItem")}
            </Button>
          </>
        }
      />

      <AdminCard className="mb-4">
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-[200px]"
              aria-label={t("content.gallery.categoryPlaceholder")}
            >
              <SelectValue placeholder={t("content.gallery.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("content.gallery.allCategories")}</SelectItem>
              {(categoriesQ.data ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminCard>

      <AdminCard>
        {list.isLoading ? (
          <p className="text-small text-muted-foreground">{t("content.gallery.loading")}</p>
        ) : list.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => list.refetch()} />
        ) : !list.data?.length ? (
          <EmptyState title={t("content.gallery.empty")} icon={ImageIcon} />
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {list.data.map((i) => (
              <div
                key={i.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card"
              >
                <img
                  src={i.image}
                  alt={i.title ?? ""}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <div className="p-2">
                  <p className="text-caption font-medium truncate">{i.title ?? "—"}</p>
                  <p className="text-caption text-muted-foreground">{i.category ?? "—"}</p>
                </div>
                <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Switch
                    checked={i.active}
                    onCheckedChange={() => toggleActive.mutate(i)}
                    aria-label={t("content.common.toggleActive")}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={t("content.common.edit")}
                    onClick={() => setEditing(i)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="destructive"
                        aria-label={t("content.common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("content.gallery.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("content.gallery.deleteDescription")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(i.id)}>
                          {t("ops.common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <GalleryEditor
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

function GalleryEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Item | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [f, setF] = useState({
    title: initial?.title ?? "",
    title_fr: initial?.title_fr ?? "",
    title_en: initial?.title_en ?? "",
    image: initial?.image ?? "",
    category: initial?.category ?? "",
    sort_order: initial?.sort_order != null ? String(initial.sort_order) : "0",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "gallery");
      setF((s) => ({ ...s, image: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function save() {
    if (!f.image.trim()) return toast.error(t("content.gallery.toasts.imageRequired"));
    const payload = {
      title: f.title.trim() || null,
      // Empty stays NULL so the documented public fallback applies.
      title_fr: f.title_fr.trim() || null,
      title_en: f.title_en.trim() || null,
      image: f.image.trim(),
      category: f.category.trim() || null,
      sort_order: Number(f.sort_order) || 0,
      active: f.active,
    };
    setSaving(true);
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("gallery_items").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gallery_items").insert(payload);
        if (error) throw error;
      }
      toast.success(t("content.gallery.toasts.saved"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("content.gallery.editTitle") : t("content.gallery.newTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>{t("content.gallery.fields.title")}</Label>
            <LocalizedField
              label={t("content.gallery.fields.title")}
              values={{ base: f.title, fr: f.title_fr, en: f.title_en }}
              onChange={(v) => setF({ ...f, title: v.base, title_fr: v.fr, title_en: v.en })}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("content.gallery.fields.image")}</Label>
            <div className="flex gap-2">
              <Input value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
            {f.image && <img src={f.image} alt="" className="h-24 rounded-md object-cover" />}
          </div>
          <div className="grid gap-1">
            <Label>{t("content.gallery.categoryPlaceholder")}</Label>
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label>{t("content.gallery.fields.sortOrder")}</Label>
            <Input
              type="number"
              value={f.sort_order}
              onChange={(e) => setF({ ...f, sort_order: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} />
            <Label>{t("content.gallery.fields.active")}</Label>
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
