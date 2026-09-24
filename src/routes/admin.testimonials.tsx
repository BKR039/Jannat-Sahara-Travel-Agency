import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Upload, User, Quote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
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
  Avatar,
} from "@/components/admin/kit";
import { LocalizedField } from "@/components/admin/LocalizedField";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/testimonials")({
  ssr: false,
  head: () => ({
    meta: [
      { title: adminDocTitle("testimonials") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TestimonialsAdminPage,
});

type Row = Database["public"]["Tables"]["testimonials"]["Row"];

interface TestimonialDraft {
  id: string | null;
  name: string;
  name_fr: string;
  name_en: string;
  role: string;
  role_fr: string;
  role_en: string;
  avatar: string;
  content: string;
  content_fr: string;
  content_en: string;
  rating: number;
  sort_order: number;
  active: boolean;
}

const EMPTY_TESTIMONIAL: TestimonialDraft = {
  id: null,
  name: "",
  name_fr: "",
  name_en: "",
  role: "",
  role_fr: "",
  role_en: "",
  avatar: "",
  content: "",
  content_fr: "",
  content_en: "",
  rating: 5,
  sort_order: 0,
  active: true,
};

function TestimonialsAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();

  const [draft, setDraft] = useState<TestimonialDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [pendingTestimonialId, setPendingTestimonialId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const debounced = useDebounced(search);

  const list = useQuery({
    queryKey: ["admin-testimonials"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => list.data ?? [], [list.data]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
    qc.invalidateQueries({ queryKey: ["testimonials"] });
  }

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("testimonials").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(
        t(v.active ? "content.services.toasts.activated" : "content.services.toasts.deactivated"),
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "فشل تحديث حالة الرأي"),
    onSettled: () => setPendingTestimonialId(null),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
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
    mutationFn: async (d: TestimonialDraft) => {
      const payload = {
        name: d.name.trim(),
        name_fr: d.name_fr.trim() || null,
        name_en: d.name_en.trim() || null,
        role: d.role.trim() || null,
        role_fr: d.role_fr.trim() || null,
        role_en: d.role_en.trim() || null,
        avatar: d.avatar.trim() || null,
        content: d.content.trim(),
        content_fr: d.content_fr.trim() || null,
        content_en: d.content_en.trim() || null,
        rating: Math.min(5, Math.max(1, Number(d.rating) || 5)),
        sort_order: Number(d.sort_order) || 0,
        active: d.active,
      };

      if (d.id) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("content.testimonials.toasts.saved"));
      setDraft(null);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t("content.testimonials.toasts.saveFailed"));
    },
  });

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setIsUploading(true);
    try {
      const url = await uploadMedia(file, "testimonials");
      setDraft((d) => (d ? { ...d, avatar: url } : d));
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
    return items.filter((item) => {
      if (statusFilter === "active" && !item.active) return false;
      if (statusFilter === "inactive" && item.active) return false;
      if (!needle) return true;
      return [item.name, item.name_fr, item.name_en, item.role, item.content]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [items, statusFilter, debounced]);

  function edit(row: Row) {
    setDraft({
      id: row.id,
      name: row.name ?? "",
      name_fr: row.name_fr ?? "",
      name_en: row.name_en ?? "",
      role: row.role ?? "",
      role_fr: row.role_fr ?? "",
      role_en: row.role_en ?? "",
      avatar: row.avatar ?? "",
      content: row.content ?? "",
      content_fr: row.content_fr ?? "",
      content_en: row.content_en ?? "",
      rating: row.rating ?? 5,
      sort_order: row.sort_order ?? 0,
      active: row.active ?? true,
    });
  }

  const canSave = Boolean(draft && draft.name.trim().length > 1 && draft.content.trim().length > 1);

  return (
    <Page
      title={t("content.testimonials.pageTitle")}
      description="إدارة آراء وتجارب المسافرين المعروضة في الصفحة الرئيسية."
      actions={
        <Button onClick={() => setDraft({ ...EMPTY_TESTIMONIAL })}>
          <Plus className="me-2 h-4 w-4" />
          {t("content.testimonials.newTestimonial")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "all", label: t("content.services.filters.all"), count: items.length },
            {
              value: "active",
              label: t("content.services.filters.active"),
              count: items.filter((r) => r.active).length,
            },
            {
              value: "inactive",
              label: t("content.services.filters.inactive"),
              count: items.filter((r) => !r.active).length,
            },
          ]}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ابحث باسم المسافر أو الصفة أو المحتوى…"
          className="lg:ms-auto lg:max-w-sm"
        />
      </div>

      <Panel className="mt-4" bodyClassName="p-4 sm:p-5">
        {list.isLoading ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              items.length === 0
                ? t("content.testimonials.empty")
                : t("content.services.noMatchTitle")
            }
            description={
              items.length === 0
                ? "أضف آراء وتقييمات عملائك لتظهر في قسم آراء المسافرين."
                : t("content.services.noMatchDescription")
            }
            icon={Star}
            action={
              items.length === 0 ? (
                <Button onClick={() => setDraft({ ...EMPTY_TESTIMONIAL })}>
                  <Plus className="me-2 h-4 w-4" />
                  {t("content.testimonials.newTestimonial")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-xl border border-border-subtle bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
              >
                {/* Header: Customer and Stars */}
                <div className="flex items-start gap-3">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="h-11 w-11 shrink-0 rounded-full object-cover border border-border-subtle"
                    />
                  ) : (
                    <Avatar name={item.name} className="h-11 w-11 text-small" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-foreground truncate">{item.name}</p>
                      <span className="text-caption font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-surface-sunken/60">
                        #{item.sort_order ?? 0}
                      </span>
                    </div>

                    {item.role && (
                      <p className="text-caption text-muted-foreground truncate">{item.role}</p>
                    )}

                    <div
                      className="mt-1 flex gap-0.5 text-warning"
                      aria-label={`تقييم ${item.rating} من 5`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3.5 w-3.5",
                            i < item.rating
                              ? "fill-warning text-warning"
                              : "fill-muted text-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content review quote */}
                <div className="relative mt-3 flex-1 bg-surface-sunken/30 rounded-lg p-3 border border-border-subtle">
                  <p className="text-small text-foreground/90 leading-relaxed line-clamp-3">
                    «{item.content}»
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                  <StatusSwitch
                    checked={Boolean(item.active)}
                    disabled={toggle.isPending && pendingTestimonialId === item.id}
                    isPending={toggle.isPending && pendingTestimonialId === item.id}
                    onCheckedChange={(active) => {
                      setPendingTestimonialId(item.id);
                      toggle.mutate({ id: item.id, active });
                    }}
                    activeLabel={t("content.common.active")}
                    inactiveLabel={t("content.common.hidden")}
                    ariaLabel={t("content.common.toggleActive")}
                  />

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t("content.common.edit")}
                      onClick={() => edit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={t("content.common.delete")}
                      onClick={() => setConfirmDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ------------------------------------------------------------ editor */}
      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? t("content.testimonials.editTitle") : t("content.testimonials.newTitle")}
        description="إدارة رأي العميل، التقييم بالنجوم، والتفاصيل الشخصية."
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
            {/* SECTION 1 — CUSTOMER & TRIP */}
            <div className="space-y-4">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                بيانات المسافر والرحلة
              </h3>

              <div className="space-y-1">
                <LocalizedField
                  label={t("content.testimonials.fields.name")}
                  values={{ base: draft.name, fr: draft.name_fr, en: draft.name_en }}
                  onChange={(v) =>
                    setDraft({ ...draft, name: v.base, name_fr: v.fr, name_en: v.en })
                  }
                />
              </div>

              <div className="space-y-1">
                <LocalizedField
                  label={t("content.testimonials.fields.role")}
                  values={{ base: draft.role, fr: draft.role_fr, en: draft.role_en }}
                  onChange={(v) =>
                    setDraft({ ...draft, role: v.base, role_fr: v.fr, role_en: v.en })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testimonial-avatar">
                  {t("content.testimonials.fields.avatar")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="testimonial-avatar"
                    dir="ltr"
                    value={draft.avatar}
                    onChange={(e) => setDraft({ ...draft, avatar: e.target.value })}
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
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>

                {draft.avatar && (
                  <div className="flex items-center gap-3 mt-2 p-2 rounded-lg border border-border-subtle bg-surface-sunken/30">
                    <img
                      src={draft.avatar}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover border border-border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8 text-caption"
                      onClick={() => setDraft({ ...draft, avatar: "" })}
                    >
                      إزالة الصورة
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2 — REVIEW */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                {t("content.testimonials.fields.content")} *
              </h3>
              <LocalizedField
                label={t("content.testimonials.fields.content")}
                rows={4}
                values={{
                  base: draft.content,
                  fr: draft.content_fr,
                  en: draft.content_en,
                }}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    content: v.base,
                    content_fr: v.fr,
                    content_en: v.en,
                  })
                }
              />
            </div>

            {/* SECTION 3 — RATING */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                {t("content.testimonials.fields.rating")}
              </h3>

              <div className="flex items-center gap-2 p-3 rounded-card border border-border-subtle bg-surface-sunken/20">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDraft({ ...draft, rating: star })}
                      className="p-1 rounded hover:bg-accent transition-colors focus-visible:outline-ring"
                      title={`${star} نجوم`}
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          star <= draft.rating
                            ? "fill-warning text-warning"
                            : "fill-muted text-muted-foreground/30 hover:text-warning/50",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <span className="ms-auto text-small font-semibold tabular-nums text-foreground">
                  {draft.rating} / 5 نجوم
                </span>
              </div>
            </div>

            {/* SECTION 4 — DISPLAY */}
            <div className="space-y-4">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                إعدادات العرض
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="testimonial-order">
                  {t("content.testimonials.fields.sortOrder")}
                </Label>
                <NumberInput
                  id="testimonial-order"
                  dir="ltr"
                  value={draft.sort_order}
                  onChange={(v) => setDraft({ ...draft, sort_order: v ?? 0 })}
                  min={0}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface-sunken/20 p-3.5">
                <div className="min-w-0">
                  <p className="text-small font-medium">
                    {t("content.testimonials.fields.active")}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    التحكم في ظهور هذا الرأي في قسم آراء المسافرين في الموقع العام.
                  </p>
                </div>
                <StatusSwitch
                  checked={Boolean(draft.active)}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.testimonials.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name
                ? t("content.testimonials.deleteDescription", { name: confirmDelete.name })
                : "هل أنت متأكد من حذف هذا الرأي؟"}
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
