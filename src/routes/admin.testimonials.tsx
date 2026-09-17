import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Star, Upload } from "lucide-react";
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

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({
    meta: [{ title: adminDocTitle("testimonials") }],
  }),
  component: TestimonialsAdminPage,
});
type T = Database["public"]["Tables"]["testimonials"]["Row"];

function TestimonialsAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-testimonials"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").order("sort_order");
      if (error) throw error;
      return data as T[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
    qc.invalidateQueries({ queryKey: ["testimonials"] });
  }

  const toggle = useMutation({
    mutationFn: async (item: T) => {
      const { error } = await supabase
        .from("testimonials")
        .update({ active: !item.active })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
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
        title={t("content.testimonials.pageTitle")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("content.testimonials.newTestimonial")}
          </Button>
        }
      />
      <AdminCard>
        {list.isLoading ? (
          <p className="text-small text-muted-foreground">{t("content.testimonials.loading")}</p>
        ) : list.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => list.refetch()} />
        ) : !list.data?.length ? (
          <EmptyState title={t("content.testimonials.empty")} icon={Star} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.data.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  {item.avatar && (
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.role && <p className="text-caption text-muted-foreground">{item.role}</p>}
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < item.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-small text-muted-foreground line-clamp-3">{item.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-caption">
                    <Switch
                      checked={item.active}
                      onCheckedChange={() => toggle.mutate(item)}
                      aria-label={t("content.common.toggleActive")}
                    />
                    <span>
                      {item.active ? t("content.common.active") : t("content.common.hidden")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("content.common.edit")}
                      onClick={() => setEditing(item)}
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
                          <AlertDialogTitle>
                            {t("content.testimonials.deleteTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete testimonial by "{item.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(item.id)}>
                            {t("ops.common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <TestimonialEditor
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

function TestimonialEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: T | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [f, setF] = useState({
    name: initial?.name ?? "",
    name_fr: initial?.name_fr ?? "",
    name_en: initial?.name_en ?? "",
    role: initial?.role ?? "",
    role_fr: initial?.role_fr ?? "",
    role_en: initial?.role_en ?? "",
    avatar: initial?.avatar ?? "",
    content: initial?.content ?? "",
    content_fr: initial?.content_fr ?? "",
    content_en: initial?.content_en ?? "",
    rating: initial?.rating ?? 5,
    sort_order: initial?.sort_order ?? 0,
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "testimonials");
      setF((s) => ({ ...s, avatar: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function save() {
    if (!f.name.trim() || !f.content.trim())
      return toast.error(t("content.testimonials.toasts.nameContentRequired"));
    setSaving(true);
    const payload = {
      name: f.name.trim(),
      // Empty stays NULL so the documented public fallback applies.
      name_fr: f.name_fr.trim() || null,
      name_en: f.name_en.trim() || null,
      role: f.role.trim() || null,
      role_fr: f.role_fr.trim() || null,
      role_en: f.role_en.trim() || null,
      avatar: f.avatar.trim() || null,
      content: f.content.trim(),
      content_fr: f.content_fr.trim() || null,
      content_en: f.content_en.trim() || null,
      rating: Number(f.rating) || 5,
      sort_order: Number(f.sort_order) || 0,
      active: f.active,
    };
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
      toast.success(t("content.testimonials.toasts.saved"));
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
            {isEdit ? t("content.testimonials.editTitle") : t("content.testimonials.newTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <LocalizedField
            label={t("content.testimonials.fields.name")}
            values={{ base: f.name, fr: f.name_fr, en: f.name_en }}
            onChange={(v) => setF({ ...f, name: v.base, name_fr: v.fr, name_en: v.en })}
          />
          <LocalizedField
            label={t("content.testimonials.fields.role")}
            values={{ base: f.role, fr: f.role_fr, en: f.role_en }}
            onChange={(v) => setF({ ...f, role: v.base, role_fr: v.fr, role_en: v.en })}
          />
          <LocalizedField
            label={t("content.testimonials.fields.content")}
            rows={4}
            values={{ base: f.content, fr: f.content_fr, en: f.content_en }}
            onChange={(v) => setF({ ...f, content: v.base, content_fr: v.fr, content_en: v.en })}
          />
          <div className="grid gap-1">
            <Label>{t("content.testimonials.fields.avatar")}</Label>
            <div className="flex gap-2">
              <Input value={f.avatar} onChange={(e) => setF({ ...f, avatar: e.target.value })} />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
          </div>
          <div className="grid gap-1">
            <Label>{t("content.testimonials.fields.rating")}</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={f.rating}
              onChange={(e) => setF({ ...f, rating: Number(e.target.value) || 5 })}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("content.testimonials.fields.sortOrder")}</Label>
            <Input
              type="number"
              value={f.sort_order}
              onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} />
            <Label>{t("content.testimonials.fields.active")}</Label>
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
