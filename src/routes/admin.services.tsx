import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Pencil, Plus, Power, Trash2 } from "lucide-react";
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
  EMPTY_SERVICE,
  SERVICE_TARGETS,
  changedColumns,
  isKnownServiceTarget,
  nextSortOrder,
  normalizeSlug,
  serviceColumns,
  validateService,
  type ServiceDraft,
} from "@/lib/admin/content-rows";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/services")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("services") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ServicesPage,
});

type Row = Database["public"]["Tables"]["services"]["Row"];

/** Icons already used by the seeded service cards — a starting point, not a limit. */
const ICON_SUGGESTIONS = ["moon", "palm-tree", "plane", "stamp", "map-pin", "compass"];

function ServicesPage() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const debounced = useDebounced(search);

  const q = useQuery({
    queryKey: ["admin-services"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
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
    queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  function failed(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    if (/duplicate key|unique constraint/i.test(raw)) return t("content.services.errors.slugTaken");
    return t("content.services.toasts.saveFailed");
  }

  const saveMutation = useMutation({
    mutationFn: async (d: ServiceDraft) => {
      const columns = serviceColumns(d);
      if (d.id) {
        const current = rows.find((r) => r.id === d.id);
        const patch = changedColumns(current, columns);
        // Nothing to write is a successful no-op, not an empty UPDATE.
        if (Object.keys(patch).length === 0) return;
        const { error } = await supabase
          .from("services")
          .update(patch as never)
          .eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(columns as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("content.services.toasts.saved"));
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error(failed(e)),
  });

  const activeMutation = useMutation({
    mutationFn: async (v: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active: v.active }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(
        t(v.active ? "content.services.toasts.activated" : "content.services.toasts.deactivated"),
      );
      invalidate();
    },
    onError: (e) => toast.error(failed(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("content.services.toasts.deleted"));
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => {
      toast.error(failed(e));
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
      return [r.title, r.title_fr, r.title_en, r.slug]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, statusFilter, debounced]);

  const errors = draft ? validateService(draft) : {};
  const canSave = draft !== null && Object.keys(errors).length === 0;

  function edit(row: Row) {
    setDraft({
      id: row.id,
      title: row.title ?? "",
      title_fr: row.title_fr ?? "",
      title_en: row.title_en ?? "",
      slug: row.slug ?? "",
      description: row.description ?? "",
      description_fr: row.description_fr ?? "",
      description_en: row.description_en ?? "",
      icon: row.icon ?? "",
      cover: row.cover ?? "",
      sort_order: row.sort_order ?? 0,
      active: row.active,
    });
  }

  async function uploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    try {
      const url = await uploadMedia(file, "services");
      setDraft((d) => (d ? { ...d, cover: url } : d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("content.services.toasts.uploadFailed"));
    }
  }

  return (
    <Page
      title={t("content.services.pageTitle")}
      description={t("content.services.pageDescription")}
      actions={
        <Button onClick={() => setDraft({ ...EMPTY_SERVICE, sort_order: nextSortOrder(rows) })}>
          <Plus className="me-2 h-4 w-4" /> {t("content.services.addItem")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "all", label: t("content.services.filters.all"), count: rows.length },
            {
              value: "active",
              label: t("content.services.filters.active"),
              count: rows.filter((r) => r.active).length,
            },
            {
              value: "inactive",
              label: t("content.services.filters.inactive"),
              count: rows.filter((r) => !r.active).length,
            },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("content.services.searchPlaceholder")}
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
              icon={LayoutGrid}
              title={
                rows.length === 0
                  ? t("content.services.emptyTitle")
                  : t("content.services.noMatchTitle")
              }
              description={
                rows.length === 0
                  ? t("content.services.emptyDescription")
                  : t("content.services.noMatchDescription")
              }
              action={
                rows.length === 0 ? (
                  <Button
                    onClick={() => setDraft({ ...EMPTY_SERVICE, sort_order: nextSortOrder(rows) })}
                  >
                    <Plus className="me-2 h-4 w-4" /> {t("content.services.addItem")}
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
                  <p className="truncate text-caption text-muted-foreground" dir="ltr">
                    /{row.slug}
                  </p>
                </div>

                <TranslationChips row={row} />

                <span className="hidden text-caption tabular-nums text-muted-foreground sm:inline">
                  {t("content.services.fields.sortOrder")} {row.sort_order ?? 0}
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
                      ? "content.services.filters.active"
                      : "content.services.filters.inactive",
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
                        ? "content.services.actions.deactivate"
                        : "content.services.actions.activate",
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
        title={draft?.id ? t("content.services.editTitle") : t("content.services.newTitle")}
        description={t("content.services.formHint")}
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
              label={t("content.services.fields.title")}
              values={{ base: draft.title, fr: draft.title_fr, en: draft.title_en }}
              onChange={(v) =>
                setDraft({ ...draft, title: v.base, title_fr: v.fr, title_en: v.en })
              }
            />
            {errors.title && (
              <p className="text-caption text-destructive">
                {t("content.services.errors.titleRequired")}
              </p>
            )}

            <LocalizedField
              label={t("content.services.fields.description")}
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
              <Label htmlFor="service-slug">{t("content.services.fields.slug")} *</Label>
              <Input
                id="service-slug"
                dir="ltr"
                list="service-slug-options"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                onBlur={() => setDraft({ ...draft, slug: normalizeSlug(draft.slug) })}
                placeholder={SERVICE_TARGETS[0]}
              />
              <datalist id="service-slug-options">
                {SERVICE_TARGETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {errors.slug ? (
                <p className="text-caption text-destructive">
                  {t(`content.services.errors.${errors.slug}`)}
                </p>
              ) : draft.slug && !isKnownServiceTarget(normalizeSlug(draft.slug)) ? (
                <p className="text-caption text-warning">
                  {t("content.services.fields.slugUnknown")}
                </p>
              ) : (
                <p className="text-caption text-muted-foreground">
                  {t("content.services.fields.slugHint")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-icon">{t("content.services.fields.icon")}</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken/50 text-primary">
                  <DynamicIcon name={draft.icon} className="h-5 w-5" />
                </span>
                <Input
                  id="service-icon"
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
                {t("content.services.fields.iconHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-cover">{t("content.services.fields.cover")}</Label>
              <div className="flex gap-2">
                <Input
                  id="service-cover"
                  dir="ltr"
                  value={draft.cover}
                  onChange={(e) => setDraft({ ...draft, cover: e.target.value })}
                />
                <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-3 text-small hover:bg-accent">
                  {t("content.services.actions.upload")}
                  <input type="file" accept="image/*" className="sr-only" onChange={uploadCover} />
                </label>
              </div>
              <p className="text-caption text-muted-foreground">
                {t("content.services.fields.coverHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-order">{t("content.services.fields.sortOrder")}</Label>
              <Input
                id="service-order"
                type="number"
                dir="ltr"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
              />
              <p className="text-caption text-muted-foreground">
                {t("content.services.fields.sortOrderHint")}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3">
              <div className="min-w-0">
                <p className="text-small font-medium">{t("content.services.fields.active")}</p>
                <p className="text-caption text-muted-foreground">
                  {t("content.services.fields.activeHint")}
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
            <AlertDialogTitle>{t("content.services.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.services.deleteDescription", { name: confirmDelete?.title ?? "" })}
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
