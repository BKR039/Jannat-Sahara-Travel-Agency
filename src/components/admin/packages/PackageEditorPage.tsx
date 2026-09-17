import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import {
  Field,
  FieldGrid,
  ImageField,
  SettingsCard,
  TextAreaField,
  TextField,
} from "@/components/admin/settings/parts";
import { StatusChip } from "@/components/ds";
import { Skeleton } from "@/components/admin/kit";
import { deleteVerdict } from "@/lib/admin/package-delete";
import { cn } from "@/lib/utils";
import { GalleryManager, ItineraryEditor, KeywordEditor, ListEditor, PdfField } from "./fields";
import {
  CATEGORIES,
  STATUSES,
  emptyForm,
  errorCountForTab,
  slugify,
  toForm,
  toPayload,
  validate,
  type PackageForm,
  type PackageRow,
  type TabKey,
} from "./model";
import { useTranslation } from "react-i18next";
import { SeatPanel } from "./SeatPanel";
import { PublicationPanel } from "./PublicationPanel";

/**
 * Which validation errors stop a save.
 *
 * Title, slug and price are the columns the public page cannot render without;
 * everything else is allowed to be incomplete in a draft.
 */
function blocksSave(errors: Record<string, string | undefined>): boolean {
  return !!(errors.title || errors.slug || errors.price);
}

/** Tab labels come from the admin dictionary, like every other admin string. */
function buildTabs(t: (key: string) => string): { key: TabKey; label: string }[] {
  const keys: TabKey[] = [
    "general",
    "pricing",
    "media",
    "hotel",
    "flights",
    "itinerary",
    "included",
    "excluded",
    "documents",
    "seo",
    "gallery",
    "availability",
    "booking",
  ];
  return keys.map((key) => ({ key, label: t(`ops.editor.tabs.${key}`) }));
}

export function PackageEditorPage({ packageId }: { packageId: string }) {
  const { t, i18n } = useTranslation("admin");
  const isNew = packageId === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [id, setId] = useState<string | null>(isNew ? null : packageId);
  const [form, setForm] = useState<PackageForm | null>(isNew ? emptyForm() : null);
  const [tab, setTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const baselineRef = useRef<string>(isNew ? "" : "__loading__");

  const record = useQuery({
    queryKey: ["admin-package", packageId] as const,
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", packageId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PackageRow | null;
    },
  });

  useEffect(() => {
    if (isNew || !record.data || form) return;
    const next = toForm(record.data);
    setForm(next);
    baselineRef.current = JSON.stringify(next);
  }, [isNew, record.data, form]);

  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const errorCount = Object.keys(errors).length;
  const blocking = blocksSave(errors);
  const dirty = !!form && JSON.stringify(form) !== baselineRef.current;

  function update<K extends keyof PackageForm>(key: K, value: PackageForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-package", packageId] });
  }

  /**
   * Write the form to the database. Explicit — never called on a timer.
   *
   * `override` exists because a publish is one operator gesture, not two: the
   * publish button changes the status and saves in the same click, and React
   * state set in that click is not visible to this function's closure. Passing
   * the intended form through the call is what makes the button do what its
   * label says.
   */
  async function save({ silent, override }: { silent?: boolean; override?: PackageForm } = {}) {
    const form_ = override ?? form;
    if (!form_ || blocksSave(validate(form_))) {
      if (!silent) toast.error(t("ops.editor.toastFixFields"));
      return;
    }
    const snapshot = JSON.stringify(form_);
    setSaving(true);
    try {
      const payload = toPayload(form_);
      if (id) {
        const { error } = await supabase.from("packages").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("packages")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setId(data.id);
        void navigate({
          to: "/admin/packages/$id",
          params: { id: data.id },
          replace: true,
        });
      }
      baselineRef.current = snapshot;
      setLastSaved(new Date());
      invalidate();
      if (!silent)
        toast.success(id ? t("ops.editor.header.saved") : t("ops.editor.header.draftCreated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ops.editor.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  /*
   * Autosave removed deliberately — saving is explicit.
   *
   * It fired 1.5s after any keystroke, which broke two things that browser QA
   * surfaced. First, "leave without saving" was a lie: the edit had already
   * been written, so discarding changed nothing. Second, and worse, on a
   * PUBLISHED programme it pushed half-typed values straight to the public
   * page — typing "5200" over "4500" briefly advertised the trip at 52 TND.
   *
   * With explicit save the dirty dialog tells the truth and nothing reaches a
   * customer until the operator decides it should.
   */

  /* warn on unsaved changes when leaving */
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /*
   * `beforeunload` only covers closing the tab or a hard reload. An in-app
   * navigation — the sidebar, the back link, a notification deep link — bypassed
   * it entirely and discarded unsaved edits silently. `useBlocker` is the
   * router's supported hook for this, so browser back/forward and search params
   * keep working and no history API is monkey-patched.
   */
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saving,
    withResolver: true,
    enableBeforeUnload: false,
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Nothing to duplicate");
      const payload = toPayload(form);
      const { data, error } = await supabase
        .from("packages")
        .insert({
          ...payload,
          slug: `${payload.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
          title: `${payload.title} (copy)`,
          status: "draft" as const,
          featured: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId) => {
      invalidate();
      toast.success(t("ops.editor.toastDuplicated"));
      void navigate({ to: "/admin/packages/$id", params: { id: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!id) return;
      /*
       * The same guard the programme list applies, which the editor did not.
       * `bookings.package_id` is ON DELETE SET NULL, so deleting a programme
       * that has been sold does not fail — it quietly detaches every customer's
       * booking from what they bought. Counted in the database at the moment of
       * deletion, not from a cached row.
       */
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("package_id", id);
      if (countError) throw countError;

      const verdict = deleteVerdict({ bookings: count ?? 0 });
      if (!verdict.canDelete) {
        throw new Error(
          t("ops.packagesList.deleteBlocked.has_bookings", { count: verdict.bookings }),
        );
      }

      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("ops.editor.toastPackageDeleted"));
      void navigate({ to: "/admin/packages" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /*
   * The shape of the editor that is about to appear — action bar, tab rail,
   * form card — rather than a spinner on an empty viewport, so opening a
   * programme does not read as a failure to load and the layout does not jump.
   */
  if (!isNew && record.isLoading) {
    return (
      <div className="pb-4" role="status" aria-label={t("ops.editor.loading")}>
        <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-border-subtle pb-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-6 w-56" />
          <div className="ms-auto flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="hidden space-y-2 lg:block">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <SettingsCard title={t("ops.editor.notFoundTitle")}>
        <p className="text-small text-muted-foreground">
          {t("ops.editor.notFoundDescription")}{" "}
          <Link to="/admin/packages" className="font-medium text-primary hover:underline">
            {t("ops.editor.backToPackagesLink")}
          </Link>
        </p>
      </SettingsCard>
    );
  }

  const publicPath = form.slug ? `/packages/${slugify(form.slug)}` : null;

  return (
    <div className="pb-4">
      {/* ------------------------------ sticky header ----------------------------- */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-border-subtle bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/packages">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("ops.editor.backToPackages")}
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-h5 font-bold">
                {form.title.trim() ||
                  (isNew ? t("ops.editor.header.newPackage") : t("ops.editor.header.untitled"))}
              </h1>
              <StatusChip value={form.status} vocab="publication" />
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-caption text-muted-foreground">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("ops.editor.saving")}
                </>
              ) : dirty ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  {id
                    ? t("ops.editor.header.unsavedAutosaving")
                    : t("ops.editor.header.draftNotCreated")}
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  {lastSaved
                    ? t("ops.editor.header.savedAt", {
                        time: lastSaved.toLocaleTimeString(i18n.language),
                      })
                    : t("ops.editor.header.allSaved")}
                </>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("ops.editor.header.issues", { count: errorCount })}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!publicPath}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="me-2 h-4 w-4" />
              {t("ops.editor.preview")}
            </Button>
            {id && (
              <Button
                variant="outline"
                size="sm"
                disabled={duplicate.isPending}
                onClick={() => duplicate.mutate()}
              >
                <Copy className="me-2 h-4 w-4" />
                {t("ops.editor.duplicate")}
              </Button>
            )}
            {form.status !== "published" ? (
              <Button
                size="sm"
                disabled={saving}
                onClick={() => {
                  /*
                   * Publish used to set the status and show a "Publishing…"
                   * toast without writing anything, so the programme stayed a
                   * draft until the operator noticed and pressed Save. One
                   * gesture, one write: the intended form goes to `save` by
                   * value because this click's state is not yet readable here.
                   */
                  const next = { ...form, status: "published" as const };
                  setForm(next);
                  if (Object.keys(validate(next)).length) {
                    toast.error(t("ops.editor.toastResolveFields"));
                    return;
                  }
                  void save({ override: next });
                }}
              >
                <Send className="me-2 h-4 w-4" />
                {t("ops.editor.publish")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={form.status === "published" ? "default" : "outline"}
              disabled={saving || !dirty}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-2 h-4 w-4" />
              )}
              {id ? t("ops.editor.header.save") : t("ops.editor.header.createDraft")}
            </Button>
            {id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={t("ops.editor.deletePackage")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("ops.editor.deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("ops.editor.danger.deleteBody", { title: form.title })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("ops.editor.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate()}>
                      {t("ops.editor.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* ------------------------------- tab rail ------------------------------ */}
        {/*
         * Real tab semantics, and the shell's own selection language: a
         * start-edge marker that mirrors with the writing direction plus the
         * primary tint, rather than a second, editor-only idea of "selected".
         */}
        <div
          role="tablist"
          aria-label={t("ops.editor.editorSections")}
          aria-orientation="vertical"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {buildTabs(t).map((entry) => {
            const count = errorCountForTab(entry.key, errors);
            const active = tab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                id={`editor-tab-${entry.key}`}
                aria-selected={active}
                aria-controls="editor-tabpanel"
                onClick={() => setTab(entry.key)}
                className={cn(
                  "relative flex min-h-11 shrink-0 items-center justify-between gap-2 rounded-input px-3 py-2",
                  "text-small font-medium transition-colors duration-fast ease-standard lg:w-full",
                  "before:absolute before:start-0 before:top-1/2 before:h-5 before:w-0.5",
                  "before:-translate-y-1/2 before:rounded-full before:transition-colors",
                  active
                    ? "bg-primary/10 text-primary before:bg-primary"
                    : "text-foreground/70 before:bg-transparent hover:bg-accent hover:text-foreground",
                )}
              >
                {entry.label}
                {count > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-caption font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ------------------------------- tab panels ---------------------------- */}
        <div
          id="editor-tabpanel"
          role="tabpanel"
          aria-labelledby={`editor-tab-${tab}`}
          className="min-w-0 space-y-6"
        >
          {tab === "general" && (
            <SettingsCard
              title={t("ops.editor.tabs.general")}
              description={t("ops.editor.general.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.general.title")}
                  value={form.title}
                  error={errors.title}
                  onChange={(v) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            title: v,
                            slug:
                              !id && (!f.slug || f.slug === slugify(f.title)) ? slugify(v) : f.slug,
                          }
                        : f,
                    )
                  }
                />
                <TextField
                  label={t("ops.editor.general.slug")}
                  hint={publicPath ?? t("ops.editor.slugHint")}
                  value={form.slug}
                  error={errors.slug}
                  onChange={(v) => update("slug", v)}
                />
                <Field label={t("ops.editor.general.category")}>
                  <Select
                    value={form.category}
                    onValueChange={(v) => update("category", v as PackageForm["category"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* The translated label, never the database enum. */}
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`ops.categories.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {/*
                 * Publication is driven by the shared action model rather than
                 * a raw enum picker, so the editor and the programme list
                 * cannot drift apart on what a status transition means.
                 */}
                <Field label={t("ops.editor.general.status")} wide>
                  <PublicationPanel
                    status={form.status}
                    busy={saving}
                    onChange={(next) => update("status", next)}
                  />
                </Field>
                <TextField
                  label={t("ops.editor.general.country")}
                  value={form.country}
                  onChange={(v) => update("country", v)}
                />
                <TextField
                  label={t("ops.editor.general.countryFr")}
                  value={form.country_fr}
                  onChange={(v) => update("country_fr", v)}
                />
                <TextField
                  label={t("ops.editor.general.countryEn")}
                  value={form.country_en}
                  onChange={(v) => update("country_en", v)}
                />
                <TextField
                  label={t("ops.editor.general.city")}
                  value={form.city}
                  onChange={(v) => update("city", v)}
                />
                <TextField
                  label={t("ops.editor.general.cityFr")}
                  value={form.city_fr}
                  onChange={(v) => update("city_fr", v)}
                />
                <TextField
                  label={t("ops.editor.general.cityEn")}
                  value={form.city_en}
                  onChange={(v) => update("city_en", v)}
                />
                <TextField
                  label={t("ops.editor.general.destinationLabel")}
                  hint={t("ops.editor.general.destinationHint")}
                  wide
                  value={form.destination}
                  onChange={(v) => update("destination", v)}
                />
                <TextField
                  label={t("ops.editor.general.destinationFr")}
                  value={form.destination_fr}
                  onChange={(v) => update("destination_fr", v)}
                />
                <TextField
                  label={t("ops.editor.general.destinationEn")}
                  value={form.destination_en}
                  onChange={(v) => update("destination_en", v)}
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label={t("ops.editor.general.shortDescription")}
                    hint={t("ops.editor.general.shortDescriptionHint")}
                    rows={2}
                    value={form.short_description}
                    onChange={(v) => update("short_description", v)}
                  />
                  {errors.short_description && (
                    <p className="text-caption text-destructive">{errors.short_description}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    label={t("ops.editor.general.shortDescriptionFr")}
                    rows={2}
                    value={form.short_description_fr}
                    onChange={(v) => update("short_description_fr", v)}
                  />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    label={t("ops.editor.general.shortDescriptionEn")}
                    hint={t("ops.localized.emptyHint")}
                    rows={2}
                    value={form.short_description_en}
                    onChange={(v) => update("short_description_en", v)}
                  />
                </div>
                <TextAreaField
                  label={t("ops.editor.general.fullDescription")}
                  rows={7}
                  value={form.description}
                  onChange={(v) => update("description", v)}
                />
                <TextAreaField
                  label={t("ops.editor.general.fullDescriptionFr")}
                  rows={7}
                  value={form.description_fr}
                  onChange={(v) => update("description_fr", v)}
                />
                <TextAreaField
                  label={t("ops.editor.general.fullDescriptionEn")}
                  hint={t("ops.localized.emptyHint")}
                  rows={7}
                  value={form.description_en}
                  onChange={(v) => update("description_en", v)}
                />
                <Field label={t("ops.editor.general.sortOrder")} hint="Lower numbers appear first.">
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => update("sort_order", e.target.value)}
                  />
                </Field>
                <Field
                  label={t("ops.editor.general.featured")}
                  hint="Highlight this package on the homepage."
                >
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      id="featured"
                      checked={form.featured}
                      onCheckedChange={(v) => update("featured", v)}
                    />
                    <Label htmlFor="featured" className="text-small">
                      {t("ops.editor.general.showFeatured")}
                    </Label>
                  </div>
                </Field>
              </FieldGrid>
            </SettingsCard>
          )}

          {tab === "pricing" && (
            <SettingsCard
              title={t("ops.editor.tabs.pricing")}
              description={t("ops.editor.pricing.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.pricing.basePrice")}
                  type="number"
                  value={form.price}
                  error={errors.price}
                  onChange={(v) => update("price", v)}
                />
                <TextField
                  label={t("ops.editor.pricing.currency")}
                  value={form.currency}
                  onChange={(v) => update("currency", v)}
                />
                <TextField
                  label={t("ops.editor.pricing.discountedPrice")}
                  hint="Leave empty when there is no promotion."
                  type="number"
                  value={form.discount_price}
                  error={errors.discount_price}
                  onChange={(v) => update("discount_price", v)}
                />
                <TextField
                  label={t("ops.editor.pricing.discountPercent")}
                  type="number"
                  value={form.discount}
                  error={errors.discount}
                  onChange={(v) => update("discount", v)}
                />
                <TextField
                  label={t("ops.editor.pricing.childPrice")}
                  type="number"
                  value={form.child_price}
                  error={errors.child_price}
                  onChange={(v) => update("child_price", v)}
                />
                <TextField
                  label={t("ops.editor.pricing.infantPrice")}
                  type="number"
                  value={form.infant_price}
                  error={errors.infant_price}
                  onChange={(v) => update("infant_price", v)}
                />
              </FieldGrid>
              <div className="mt-6 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
                <p className="text-caption uppercase tracking-wide text-muted-foreground">
                  {t("ops.editor.pricing.travellerPays")}
                </p>
                <p className="mt-1 text-h4 font-bold tabular-nums">
                  {form.discount_price || form.price || "0"} {form.currency}
                  {form.discount_price && (
                    <span className="ms-2 text-body font-normal text-muted-foreground line-through">
                      {form.price} {form.currency}
                    </span>
                  )}
                </p>
              </div>
            </SettingsCard>
          )}

          {tab === "media" && (
            <SettingsCard
              title={t("ops.editor.tabs.media")}
              description={t("ops.editor.media.cardDescription")}
            >
              <div className="grid gap-5">
                <ImageField
                  label={t("ops.editor.media.coverImage")}
                  hint="Used on cards, package page hero, and social previews."
                  value={form.cover}
                  folder="packages"
                  onChange={(v) => update("cover", v)}
                />
                {errors.cover && <p className="text-caption text-destructive">{errors.cover}</p>}
                <PdfField
                  label={t("ops.editor.media.brochure")}
                  hint="Optional downloadable programme."
                  value={form.brochure_pdf}
                  onChange={(v) => update("brochure_pdf", v)}
                />
              </div>
            </SettingsCard>
          )}

          {tab === "hotel" && (
            <SettingsCard
              title={t("ops.editor.hotel.cardTitle")}
              description={t("ops.editor.hotel.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.hotel.hotelName")}
                  value={form.hotel}
                  onChange={(v) => update("hotel", v)}
                />
                <TextField
                  label={t("ops.editor.hotel.hotelNameFr")}
                  value={form.hotel_fr}
                  onChange={(v) => update("hotel_fr", v)}
                />
                <TextField
                  label={t("ops.editor.hotel.hotelNameEn")}
                  value={form.hotel_en}
                  onChange={(v) => update("hotel_en", v)}
                />
                <TextField
                  label={t("ops.editor.hotel.hotelRating")}
                  type="number"
                  value={form.hotel_rating}
                  error={errors.hotel_rating}
                  onChange={(v) => update("hotel_rating", v)}
                />
                <TextField
                  label={t("ops.editor.hotel.groundTransport")}
                  hint="e.g. Private air-conditioned coach"
                  wide
                  value={form.transport}
                  onChange={(v) => update("transport", v)}
                />
                <TextField
                  label={t("ops.editor.hotel.groundTransportFr")}
                  value={form.transport_fr}
                  onChange={(v) => update("transport_fr", v)}
                />
                <TextField
                  label={t("ops.editor.hotel.groundTransportEn")}
                  value={form.transport_en}
                  onChange={(v) => update("transport_en", v)}
                />
              </FieldGrid>
            </SettingsCard>
          )}

          {tab === "flights" && (
            <SettingsCard
              title={t("ops.editor.tabs.flights")}
              description={t("ops.editor.flights.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.flights.airline")}
                  value={form.airline}
                  onChange={(v) => update("airline", v)}
                />
                <TextField
                  label={t("ops.editor.flights.airlineFr")}
                  value={form.airline_fr}
                  onChange={(v) => update("airline_fr", v)}
                />
                <TextField
                  label={t("ops.editor.flights.airlineEn")}
                  value={form.airline_en}
                  onChange={(v) => update("airline_en", v)}
                />
                <Field label={t("ops.editor.flights.departureDate")}>
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => update("departure_date", e.target.value)}
                  />
                </Field>
                <Field label={t("ops.editor.flights.returnDate")} error={errors.return_date}>
                  <Input
                    type="date"
                    value={form.return_date}
                    onChange={(e) => update("return_date", e.target.value)}
                  />
                </Field>
              </FieldGrid>
            </SettingsCard>
          )}

          {tab === "itinerary" && (
            <SettingsCard
              title={t("ops.editor.tabs.itinerary")}
              description={t("ops.editor.itinerary.cardDescription")}
            >
              <ItineraryEditor items={form.timeline} onChange={(v) => update("timeline", v)} />
            </SettingsCard>
          )}

          {tab === "included" && (
            <SettingsCard
              title={t("ops.editor.included.cardTitle")}
              description={t("ops.editor.included.cardDescription")}
            >
              <ListEditor
                items={form.included}
                onChange={(v) => update("included", v)}
                placeholder={t("ops.editor.included.placeholder")}
                addLabel="Add inclusion"
                emptyTitle="No inclusions listed"
                emptyDescription="Add the services covered by this package."
              />
            </SettingsCard>
          )}

          {tab === "excluded" && (
            <SettingsCard
              title={t("ops.editor.excluded.cardTitle")}
              description={t("ops.editor.excluded.cardDescription")}
            >
              <ListEditor
                items={form.excluded}
                onChange={(v) => update("excluded", v)}
                placeholder={t("ops.editor.excluded.placeholder")}
                addLabel="Add exclusion"
                emptyTitle="No exclusions listed"
                emptyDescription="Add anything travellers must pay separately."
              />
            </SettingsCard>
          )}

          {tab === "documents" && (
            <SettingsCard
              title={t("ops.editor.documents.cardTitle")}
              description={t("ops.editor.documents.cardDescription")}
            >
              <ListEditor
                items={form.required_documents}
                onChange={(v) => update("required_documents", v)}
                placeholder={t("ops.editor.documents.placeholder")}
                addLabel="Add document"
                emptyTitle="No documents listed"
                emptyDescription="List the documents needed to confirm a booking."
              />
            </SettingsCard>
          )}

          {tab === "seo" && (
            <SettingsCard
              title={t("ops.editor.tabs.seo")}
              description={t("ops.editor.seo.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.seo.seoTitle")}
                  wide
                  maxCount={60}
                  value={form.seo_title}
                  error={errors.seo_title}
                  placeholder={form.title}
                  onChange={(v) => update("seo_title", v)}
                />
                <TextField
                  label={t("ops.editor.seo.seoTitleFr")}
                  wide
                  maxCount={60}
                  value={form.seo_title_fr}
                  onChange={(v) => update("seo_title_fr", v)}
                />
                <TextField
                  label={t("ops.editor.seo.seoTitleEn")}
                  wide
                  maxCount={60}
                  value={form.seo_title_en}
                  onChange={(v) => update("seo_title_en", v)}
                />
                <TextField
                  label={t("ops.editor.seo.metaDescription")}
                  wide
                  maxCount={160}
                  value={form.seo_description}
                  error={errors.seo_description}
                  placeholder={form.short_description}
                  onChange={(v) => update("seo_description", v)}
                />
                <TextField
                  label={t("ops.editor.seo.metaDescriptionFr")}
                  wide
                  maxCount={160}
                  value={form.seo_description_fr}
                  onChange={(v) => update("seo_description_fr", v)}
                />
                <TextField
                  label={t("ops.editor.seo.metaDescriptionEn")}
                  wide
                  maxCount={160}
                  hint={t("ops.localized.emptyHint")}
                  value={form.seo_description_en}
                  onChange={(v) => update("seo_description_en", v)}
                />
                <Field
                  label={t("ops.editor.seo.keywords")}
                  wide
                  hint="Press Enter or comma to add."
                >
                  <KeywordEditor
                    items={form.seo_keywords}
                    onChange={(v) => update("seo_keywords", v)}
                  />
                </Field>
              </FieldGrid>
              <div className="mt-6 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
                <p className="truncate text-caption text-success">
                  janatsahara.tn{publicPath ?? "/packages/…"}
                </p>
                <p className="mt-1 truncate text-body font-medium text-info">
                  {form.seo_title || form.title || "Package title"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-small text-muted-foreground">
                  {form.seo_description || form.short_description || "Add a meta description."}
                </p>
              </div>
            </SettingsCard>
          )}

          {tab === "gallery" && (
            <SettingsCard
              title={t("ops.editor.tabs.gallery")}
              description={t("ops.editor.gallery.cardDescription")}
            >
              <GalleryManager items={form.gallery} onChange={(v) => update("gallery", v)} />
            </SettingsCard>
          )}

          {tab === "availability" && (
            <SettingsCard
              title={t("ops.editor.tabs.availability")}
              description={t("ops.editor.availability.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.availability.duration")}
                  hint="e.g. 10 days / 9 nights"
                  value={form.duration}
                  onChange={(v) => update("duration", v)}
                />
                <TextField
                  label={t("ops.editor.availability.durationFr")}
                  value={form.duration_fr}
                  onChange={(v) => update("duration_fr", v)}
                />
                <TextField
                  label={t("ops.editor.availability.durationEn")}
                  value={form.duration_en}
                  onChange={(v) => update("duration_en", v)}
                />
                {/*
                 * Capacity is the only seat number an operator sets. The
                 * previous form also exposed an "available seats" input and
                 * inferred bookings by subtracting it from capacity — the
                 * inverse of how availability actually works, and a number that
                 * drifted from reality the moment a booking was taken.
                 */}
                <TextField
                  label={t("ops.editor.availability.totalSeats")}
                  type="number"
                  value={form.total_seats}
                  error={errors.total_seats}
                  hint={t("ops.editor.availability.capacityHint")}
                  onChange={(v) => update("total_seats", v)}
                />
              </FieldGrid>
              <SeatPanel packageId={id} totalSeats={form.total_seats} />
            </SettingsCard>
          )}

          {tab === "booking" && (
            <SettingsCard
              title={t("ops.editor.tabs.booking")}
              description={t("ops.editor.booking.cardDescription")}
            >
              <FieldGrid>
                <TextField
                  label={t("ops.editor.booking.meetingPoint")}
                  hint="Where travellers gather before departure."
                  wide
                  value={form.meeting_point}
                  onChange={(v) => update("meeting_point", v)}
                />
                <TextField
                  label={t("ops.editor.booking.meetingPointFr")}
                  value={form.meeting_point_fr}
                  onChange={(v) => update("meeting_point_fr", v)}
                />
                <TextField
                  label={t("ops.editor.booking.meetingPointEn")}
                  value={form.meeting_point_en}
                  onChange={(v) => update("meeting_point_en", v)}
                />
              </FieldGrid>
              <div className="mt-6 grid gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 text-small">
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("ops.editor.booking.bookableOnWebsite")}
                  </span>
                  <span className="font-medium">
                    {form.status === "published"
                      ? t("ops.editor.booking.yes")
                      : t("ops.editor.booking.no")}
                  </span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("ops.editor.booking.requiredDocsConfigured")}
                  </span>
                  <span className="font-medium">{form.required_documents.length}</span>
                </p>
                <Link
                  to="/admin/bookings"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {t("ops.editor.booking.openBookings")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </SettingsCard>
          )}
        </div>
      </div>

      {/*
       * In-app unsaved-changes guard. Three outcomes, matching what the
       * operator actually wants at that moment: keep the work, drop it, or go
       * back to editing. `window.confirm` cannot express the first.
       */}
      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ops.editor.unsaved.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("ops.editor.unsaved.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {t("ops.editor.unsaved.stay")}
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                // Baseline is reset first so the guard does not re-fire.
                baselineRef.current = JSON.stringify(form);
                blocker.proceed?.();
              }}
            >
              {t("ops.editor.unsaved.discard")}
            </Button>
            <AlertDialogAction
              onClick={async () => {
                await save();
                blocker.proceed?.();
              }}
            >
              {t("ops.editor.unsaved.saveAndLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* -------------------------------- preview -------------------------------- */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        {/* The end edge in both directions — the sheet primitive's sides are
            physical, so the direction is chosen here rather than restyling it. */}
        <SheetContent
          side={i18n.dir() === "rtl" ? "left" : "right"}
          className="w-full sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>{t("ops.editor.previewTitle")}</SheetTitle>
          </SheetHeader>
          {publicPath && (
            <div className="mt-4 h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border-subtle">
              <iframe
                key={`${publicPath}-${lastSaved?.getTime() ?? 0}`}
                src={publicPath}
                title={t("ops.editor.previewFrameTitle")}
                className="h-full w-full bg-background"
              />
            </div>
          )}
          {publicPath && (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
            >
              {t("ops.editor.openInNewTab")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
