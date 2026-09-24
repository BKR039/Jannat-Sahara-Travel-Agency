import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, HelpCircle, FolderTree } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/admin/kit";
import { LocalizedField } from "@/components/admin/LocalizedField";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/faq")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("faq") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: FaqAdminPage,
});

type Row = Database["public"]["Tables"]["faqs"]["Row"];

interface FaqDraft {
  id: string | null;
  question: string;
  question_fr: string;
  question_en: string;
  answer: string;
  answer_fr: string;
  answer_en: string;
  category: string;
  sort_order: number;
  active: boolean;
}

const EMPTY_FAQ: FaqDraft = {
  id: null,
  question: "",
  question_fr: "",
  question_en: "",
  answer: "",
  answer_fr: "",
  answer_en: "",
  category: "",
  sort_order: 0,
  active: true,
};

function FaqAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();

  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [pendingFaqId, setPendingFaqId] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const list = useQuery({
    queryKey: ["admin-faqs"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => list.data ?? [], [list.data]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((f) => f.category).filter(Boolean))) as string[];
  }, [items]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-faqs"] });
    qc.invalidateQueries({ queryKey: ["faqs"] });
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
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

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("faqs").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(
        t(v.active ? "content.services.toasts.activated" : "content.services.toasts.deactivated"),
      );
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message || "فشل تحديث حالة السؤال");
    },
    onSettled: () => setPendingFaqId(null),
  });

  const saveMutation = useMutation({
    mutationFn: async (d: FaqDraft) => {
      const payload = {
        question: d.question.trim(),
        question_fr: d.question_fr.trim() || null,
        question_en: d.question_en.trim() || null,
        answer: d.answer.trim(),
        answer_fr: d.answer_fr.trim() || null,
        answer_en: d.answer_en.trim() || null,
        category: d.category.trim() || null,
        sort_order: Number(d.sort_order) || 0,
        active: d.active,
      };

      if (d.id) {
        const { error } = await supabase.from("faqs").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("content.faq.toasts.saved"));
      setDraft(null);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t("content.faq.toasts.saveFailed"));
    },
  });

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return items.filter((f) => {
      if (statusFilter === "active" && !f.active) return false;
      if (statusFilter === "inactive" && f.active) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (!needle) return true;
      return [
        f.question,
        f.question_fr,
        f.question_en,
        f.answer,
        f.answer_fr,
        f.answer_en,
        f.category,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [items, statusFilter, categoryFilter, debounced]);

  function edit(row: Row) {
    setDraft({
      id: row.id,
      question: row.question ?? "",
      question_fr: row.question_fr ?? "",
      question_en: row.question_en ?? "",
      answer: row.answer ?? "",
      answer_fr: row.answer_fr ?? "",
      answer_en: row.answer_en ?? "",
      category: row.category ?? "",
      sort_order: row.sort_order ?? 0,
      active: row.active ?? true,
    });
  }

  const canSave = Boolean(
    draft && draft.question.trim().length > 1 && draft.answer.trim().length > 1,
  );

  return (
    <Page
      title={t("content.faq.pageTitle")}
      description="إدارة الأسئلة المتكررة وإجاباتها المعروضة في صفحة الأسئلة الشائعة وتفاصيل الباقات."
      actions={
        <Button onClick={() => setDraft({ ...EMPTY_FAQ })}>
          <Plus className="me-2 h-4 w-4" />
          {t("content.faq.newFaq")}
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

        <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-11 bg-card">
              <SelectValue placeholder={t("content.faq.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ابحث بالسؤال أو الإجابة أو التصنيف…"
            className="w-full sm:w-64"
          />
        </div>
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
                items.length === 0 ? t("content.faq.empty") : t("content.services.noMatchTitle")
              }
              description={
                items.length === 0
                  ? "أضف أسئلة متكررة وإجاباتها لتسهيل تصفح المسافرين."
                  : t("content.services.noMatchDescription")
              }
              icon={HelpCircle}
              action={
                items.length === 0 ? (
                  <Button onClick={() => setDraft({ ...EMPTY_FAQ })}>
                    <Plus className="me-2 h-4 w-4" />
                    {t("content.faq.newFaq")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:px-5 hover:bg-surface-sunken/20 transition-colors"
              >
                {/* Question and Answer preview */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground text-small leading-snug">
                      {f.question}
                    </p>
                    {f.category && (
                      <span className="rounded-md bg-accent px-2 py-0.5 text-caption font-medium text-accent-foreground">
                        {f.category}
                      </span>
                    )}
                    <span className="text-caption font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-surface-sunken/60">
                      #{f.sort_order ?? 0}
                    </span>
                  </div>

                  <p className="mt-1.5 text-small text-muted-foreground leading-relaxed line-clamp-2">
                    {f.answer}
                  </p>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center justify-between gap-3 shrink-0 pt-2 sm:pt-0 sm:justify-end">
                  <StatusSwitch
                    checked={Boolean(f.active)}
                    disabled={toggle.isPending && pendingFaqId === f.id}
                    isPending={toggle.isPending && pendingFaqId === f.id}
                    onCheckedChange={(active) => {
                      setPendingFaqId(f.id);
                      toggle.mutate({ id: f.id, active });
                    }}
                    activeLabel={t("content.common.active")}
                    inactiveLabel={t("content.common.hidden")}
                    ariaLabel={t("content.common.toggleActive")}
                  />

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t("content.common.edit")}
                      onClick={() => edit(f)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={t("content.common.delete")}
                      onClick={() => setConfirmDelete(f)}
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
        title={draft?.id ? t("content.faq.editTitle") : t("content.faq.newTitle")}
        description="إدارة نصوص السؤال والإجابة، التصنيف وترتيب العرض."
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
            {/* SECTION 1 — QUESTION */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                {t("content.faq.fields.question")}
              </h3>
              <LocalizedField
                label={t("content.faq.fields.question")}
                values={{ base: draft.question, fr: draft.question_fr, en: draft.question_en }}
                onChange={(v) =>
                  setDraft({ ...draft, question: v.base, question_fr: v.fr, question_en: v.en })
                }
              />
            </div>

            {/* SECTION 2 — ANSWER */}
            <div className="space-y-3">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                {t("content.faq.fields.answer")}
              </h3>
              <LocalizedField
                label={t("content.faq.fields.answer")}
                rows={5}
                values={{ base: draft.answer, fr: draft.answer_fr, en: draft.answer_en }}
                onChange={(v) =>
                  setDraft({ ...draft, answer: v.base, answer_fr: v.fr, answer_en: v.en })
                }
              />
            </div>

            {/* SECTION 3 — METADATA & DISPLAY */}
            <div className="space-y-4">
              <h3 className="text-small font-semibold text-foreground border-b border-border-subtle pb-1.5">
                التصنيف وإعدادات العرض
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="faq-category">{t("content.faq.category")}</Label>
                <Input
                  id="faq-category"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="مثال: umrah, trips, visa"
                  list="faq-category-suggestions"
                />
                <datalist id="faq-category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="faq-order">{t("content.faq.fields.sortOrder")}</Label>
                <NumberInput
                  id="faq-order"
                  dir="ltr"
                  value={draft.sort_order}
                  onChange={(v) => setDraft({ ...draft, sort_order: v ?? 0 })}
                  min={0}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface-sunken/20 p-3.5">
                <div className="min-w-0">
                  <p className="text-small font-medium">{t("content.faq.fields.active")}</p>
                  <p className="text-caption text-muted-foreground">
                    التحكم في ظهور هذا السؤال في صفحة الأسئلة الشائعة العامة.
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
            <AlertDialogTitle>{t("content.faq.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.question
                ? `هل أنت متأكد من حذف «${confirmDelete.question}»؟`
                : "هل أنت متأكد من حذف هذا السؤال؟"}
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
