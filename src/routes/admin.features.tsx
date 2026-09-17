import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  EmptyState,
  ErrorState,
  FilterTabs,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  useDebounced,
} from "@/components/admin/kit";
import { LocalizedField } from "@/components/admin/LocalizedField";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  EMPTY_FEATURE,
  changedColumns,
  featureColumns,
  nextSortOrder,
  validateFeature,
  type FeatureDraft,
} from "@/lib/admin/content-rows";
import { adminDocTitle } from "@/lib/admin/doc-title";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/features")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("features") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: FeaturesPage,
});

type Row = Database["public"]["Tables"]["features"]["Row"];

/** Icons already used by the seeded "why choose us" cards — a starting point. */
const ICON_SUGGESTIONS = [
  "award",
  "badge-dollar-sign",
  "headphones",
  "shield-check",
  "building",
  "sparkles",
];

function FeaturesPage() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [draft, setDraft] = useState<FeatureDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const debounced = useDebounced(search);

  const q = useQuery({
    queryKey: ["admin-features"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .order("sort_order")
        .order("title");
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => q.data ?? [], [q.data]);

  /** The public homepage reads the same table, so refresh its cache too. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-features"] });
    queryClient.invalidateQueries({ queryKey: ["features"] });
  };

  const failed = () => t("content.features.toasts.saveFailed");

  const saveMutation = useMutation({
    mutationFn: async (d: FeatureDraft) => {
      const columns = featureColumns(d);
      if (d.id) {
        const current = rows.find((r) => r.id === d.id);
        const patch = changedColumns(current, columns);
        // Nothing to write is a successful no-op, not an empty UPDATE.
        if (Object.keys(patch).length === 0) return;
        const { error } = await supabase
          .from("features")
          .update(patch as never)
          .eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("features").insert(columns as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("content.features.toasts.saved"));
      setDraft(null);
      invalidate();
    },
    onError: () => toast.error(failed()),
  });

  const activeMutation = useMutation({
    mutationFn: async (v: { id: string; active: boolean }) => {
      const { error } = await supabase.from("features").update({ active: v.active }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(
        t(v.active ? "content.features.toasts.activated" : "content.features.toasts.deactivated"),
      );
      invalidate();
    },
    onError: () => toast.error(failed()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("features").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("content.features.toasts.deleted"));
      setConfirmDelete(null);
      invalidate();
    },
    onError: () => {
      toast.error(failed());
      setConfirmDelete(null);
    },
  });

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "inactive" && r.active) return false;
      if (!needle) return true;
      // Search covers all three languages so an English editor can find a row.
      return [r.title, r.title_fr, r.title_en]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, statusFilter, debounced]);

  const errors = draft ? validateFeature(draft) : {};
  const canSave = draft !== null && Object.keys(errors).length === 0;

  function edit(row: Row) {
    setDraft({
      id: row.id,
      title: row.title ?? "",
      title_fr: row.title_fr ?? "",
      title_en: row.title_en ?? "",
      description: row.description ?? "",
      description_fr: row.description_fr ?? "",
      description_en: row.description_en ?? "",
      icon: row.icon ?? "",
      sort_order: row.sort_order ?? 0,
      active: row.active,
    });
  }

  return (
    <Page
      title={t("content.features.pageTitle")}
      description={t("content.features.pageDescription")}
      actions={
        <Button onClick={() => setDraft({ ...EMPTY_FEATURE, sort_order: nextSortOrder(rows) })}>
          <Plus className="me-2 h-4 w-4" /> {t("content.features.addItem")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "all", label: t("content.features.filters.all"), count: rows.length },
            {
              value: "active",
              label: t("content.features.filters.active"),
              count: rows.filter((r) => r.active).length,
            },
            {
              value: "inactive",
              label: t("content.features.filters.inactive"),
              count: rows.filter((r) => !r.active).length,
            },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("content.features.searchPlaceholder")}
          className="lg:ms-auto lg:max-w-sm"
        />
      </div>

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {q.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={4} />
          </div>
        ) : q.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => q.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={BadgeCheck}
              title={
                rows.length === 0
                  ? t("content.features.emptyTitle")
                  : t("content.features.noMatchTitle")
              }
              description={
                rows.length === 0
                  ? t("content.features.emptyDescription")
                  : t("content.features.noMatchDescription")
              }
              action={
                rows.length === 0 ? (
                  <Button
                    onClick={() => setDraft({ ...EMPTY_FEATURE, sort_order: nextSortOrder(rows) })}
                  >
                    <Plus className="me-2 h-4 w-4" /> {t("content.features.addItem")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DynamicIcon name={row.icon} className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-small font-medium">{row.title}</p>
                  {row.description && (
                    <p className="truncate text-caption text-muted-foreground">{row.description}</p>
                  )}
                </div>

                <TranslationChips row={row} />

                <span className="hidden text-caption tabular-nums text-muted-foreground sm:inline">
                  {t("content.features.fields.sortOrder")} {row.sort_order ?? 0}
                </span>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-caption font-semibold",
                    row.active
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-sunken text-muted-foreground",
                  )}
                >
                  {t(
                    row.active
                      ? "content.features.filters.active"
                      : "content.features.filters.inactive",
                  )}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("ops.common.edit")}
                    onClick={() => edit(row)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t(
                      row.active
                        ? "content.features.actions.deactivate"
                        : "content.features.actions.activate",
                    )}
                    disabled={activeMutation.isPending}
                    onClick={() => activeMutation.mutate({ id: row.id, active: !row.active })}
                  >
                    <Power className={cn("h-4 w-4", row.active && "text-primary")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("ops.common.delete")}
                    onClick={() => setConfirmDelete(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
        title={draft?.id ? t("content.features.editTitle") : t("content.features.newTitle")}
        description={t("content.features.formHint")}
      >
        {draft && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSave || saveMutation.isPending) return;
              saveMutation.mutate(draft);
            }}
          >
            <LocalizedField
              label={t("content.features.fields.title")}
              values={{ base: draft.title, fr: draft.title_fr, en: draft.title_en }}
              onChange={(v) =>
                setDraft({ ...draft, title: v.base, title_fr: v.fr, title_en: v.en })
              }
            />
            {errors.title && (
              <p className="text-caption text-destructive">
                {t("content.features.errors.titleRequired")}
              </p>
            )}

            <LocalizedField
              label={t("content.features.fields.description")}
              rows={3}
              values={{
                base: draft.description,
                fr: draft.description_fr,
                en: draft.description_en,
              }}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  description: v.base,
                  description_fr: v.fr,
                  description_en: v.en,
                })
              }
            />

            <div className="space-y-1.5">
              <Label htmlFor="feature-icon">{t("content.features.fields.icon")}</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken/50 text-primary">
                  <DynamicIcon name={draft.icon} className="h-5 w-5" />
                </span>
                <Input
                  id="feature-icon"
                  dir="ltr"
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  placeholder={ICON_SUGGESTIONS[0]}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ICON_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => setDraft({ ...draft, icon: name })}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      draft.icon === name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border-subtle text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <DynamicIcon name={name} className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <p className="text-caption text-muted-foreground">
                {t("content.features.fields.iconHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feature-order">{t("content.features.fields.sortOrder")}</Label>
              <Input
                id="feature-order"
                type="number"
                dir="ltr"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
              />
              <p className="text-caption text-muted-foreground">
                {t("content.features.fields.sortOrderHint")}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3">
              <div className="min-w-0">
                <p className="text-small font-medium">{t("content.features.fields.active")}</p>
                <p className="text-caption text-muted-foreground">
                  {t("content.features.fields.activeHint")}
                </p>
              </div>
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                {t("ops.common.cancel")}
              </Button>
              <Button type="submit" disabled={!canSave || saveMutation.isPending}>
                {saveMutation.isPending ? t("content.common.saving") : t("ops.common.save")}
              </Button>
            </div>
          </form>
        )}
      </Drawer>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.features.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.features.deleteDescription", { name: confirmDelete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
            >
              {t("ops.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

/** At-a-glance translation coverage — which languages this row is missing. */
function TranslationChips({ row }: { row: { title_fr: string | null; title_en: string | null } }) {
  const { t } = useTranslation("admin");
  const missing = [!row.title_fr?.trim() ? "fr" : null, !row.title_en?.trim() ? "en" : null].filter(
    Boolean,
  ) as string[];
  if (missing.length === 0) return null;
  return (
    <span className="rounded-full bg-warning-muted px-2.5 py-0.5 text-caption font-medium text-warning">
      {t("content.common.missingTranslations", {
        langs: missing.map((l) => t(`ops.localized.${l}`)).join(" · "),
      })}
    </span>
  );
}
