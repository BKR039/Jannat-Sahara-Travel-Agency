import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { StatusBadge } from "@/components/admin/ui";
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

const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "General" },
  { key: "pricing", label: "Pricing" },
  { key: "media", label: "Media" },
  { key: "hotel", label: "Hotel" },
  { key: "flights", label: "Flights" },
  { key: "itinerary", label: "Itinerary" },
  { key: "included", label: "Included" },
  { key: "excluded", label: "Excluded" },
  { key: "documents", label: "Documents" },
  { key: "seo", label: "SEO" },
  { key: "gallery", label: "Gallery" },
  { key: "availability", label: "Availability" },
  { key: "booking", label: "Booking" },
];

export function PackageEditorPage({ packageId }: { packageId: string }) {
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
  const blocking = !!(errors.title || errors.slug || errors.price);
  const dirty = !!form && JSON.stringify(form) !== baselineRef.current;

  function update<K extends keyof PackageForm>(key: K, value: PackageForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-package", packageId] });
  }

  async function save({ silent }: { silent?: boolean } = {}) {
    if (!form || blocking) {
      if (!silent) toast.error("Fix the highlighted fields before saving.");
      return;
    }
    const snapshot = JSON.stringify(form);
    setSaving(true);
    try {
      const payload = toPayload(form);
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
      if (!silent) toast.success(id ? "Package saved" : "Draft created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* auto-save (only once the record exists and validation passes) */
  useEffect(() => {
    if (!form || !id || !dirty || blocking || saving) return;
    const t = setTimeout(() => void save({ silent: true }), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, id, dirty, blocking]);

  /* warn on unsaved changes when leaving */
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

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
      toast.success("Duplicated as a new draft");
      void navigate({ to: "/admin/packages/$id", params: { id: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Package deleted");
      void navigate({ to: "/admin/packages" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isNew && record.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <SettingsCard title="Package not found">
        <p className="text-small text-muted-foreground">
          This package no longer exists.{" "}
          <Link to="/admin/packages" className="font-medium text-primary hover:underline">
            Back to packages
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
              <ArrowLeft className="me-2 h-4 w-4" /> Packages
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-h5 font-bold">
                {form.title.trim() || (isNew ? "New package" : "Untitled package")}
              </h1>
              <StatusBadge status={form.status} />
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-caption text-muted-foreground">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : dirty ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  {id ? "Unsaved changes — auto-saving" : "Draft not created yet"}
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  {lastSaved ? `Auto-saved at ${lastSaved.toLocaleTimeString()}` : "All changes saved"}
                </>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> {errorCount} issue
                  {errorCount > 1 ? "s" : ""}
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
              <Eye className="me-2 h-4 w-4" /> Preview
            </Button>
            {id && (
              <Button
                variant="outline"
                size="sm"
                disabled={duplicate.isPending}
                onClick={() => duplicate.mutate()}
              >
                <Copy className="me-2 h-4 w-4" /> Duplicate
              </Button>
            )}
            {form.status !== "published" ? (
              <Button
                size="sm"
                disabled={saving}
                onClick={() => {
                  const next = { ...form, status: "published" as const };
                  const nextErrors = validate(next);
                  if (Object.keys(nextErrors).length) {
                    setForm(next);
                    toast.error("Resolve the highlighted fields to publish.");
                    return;
                  }
                  setForm(next);
                  toast.info("Publishing…");
                }}
              >
                <Send className="me-2 h-4 w-4" /> Publish
              </Button>
            ) : null}
            <Button size="sm" variant={form.status === "published" ? "default" : "outline"} disabled={saving || !dirty} onClick={() => void save()}>
              {saving ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-2 h-4 w-4" />
              )}
              {id ? "Save" : "Create draft"}
            </Button>
            {id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label="Delete package">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete package?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{form.title}" will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* ------------------------------- tab rail ------------------------------ */}
        <nav
          aria-label="Editor sections"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {TABS.map((t) => {
            const count = errorCountForTab(t.key, errors);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-small font-medium transition-colors lg:w-full",
                  tab === t.key
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-caption font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ------------------------------- tab panels ---------------------------- */}
        <div className="min-w-0 space-y-6">
          {tab === "general" && (
            <SettingsCard title="General" description="Core identity of this package.">
              <FieldGrid>
                <TextField
                  label="Title"
                  value={form.title}
                  error={errors.title}
                  onChange={(v) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            title: v,
                            slug: !id && (!f.slug || f.slug === slugify(f.title)) ? slugify(v) : f.slug,
                          }
                        : f,
                    )
                  }
                />
                <TextField
                  label="Slug"
                  hint={publicPath ?? "Used in the public URL."}
                  value={form.slug}
                  error={errors.slug}
                  onChange={(v) => update("slug", v)}
                />
                <Field label="Service category">
                  <Select
                    value={form.category}
                    onValueChange={(v) => update("category", v as PackageForm["category"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status" hint="Only published packages appear on the website.">
                  <Select
                    value={form.status}
                    onValueChange={(v) => update("status", v as PackageForm["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <TextField label="Country" value={form.country} onChange={(v) => update("country", v)} />
                <TextField label="City" value={form.city} onChange={(v) => update("city", v)} />
                <TextField
                  label="Destination label"
                  hint="Shown on cards, e.g. “Makkah & Madinah”."
                  wide
                  value={form.destination}
                  onChange={(v) => update("destination", v)}
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Short description"
                    hint="One or two lines used on package cards."
                    rows={2}
                    value={form.short_description}
                    onChange={(v) => update("short_description", v)}
                  />
                  {errors.short_description && (
                    <p className="text-caption text-destructive">{errors.short_description}</p>
                  )}
                </div>
                <TextAreaField
                  label="Full description"
                  rows={7}
                  value={form.description}
                  onChange={(v) => update("description", v)}
                />
                <Field label="Sort order" hint="Lower numbers appear first.">
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => update("sort_order", e.target.value)}
                  />
                </Field>
                <Field label="Featured" hint="Highlight this package on the homepage.">
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      id="featured"
                      checked={form.featured}
                      onCheckedChange={(v) => update("featured", v)}
                    />
                    <Label htmlFor="featured" className="text-small">
                      Show in featured section
                    </Label>
                  </div>
                </Field>
              </FieldGrid>
            </SettingsCard>
          )}

          {tab === "pricing" && (
            <SettingsCard title="Pricing" description="Base fare, promotions, and per-traveller rates.">
              <FieldGrid>
                <TextField
                  label="Base price"
                  type="number"
                  value={form.price}
                  error={errors.price}
                  onChange={(v) => update("price", v)}
                />
                <TextField label="Currency" value={form.currency} onChange={(v) => update("currency", v)} />
                <TextField
                  label="Discounted price"
                  hint="Leave empty when there is no promotion."
                  type="number"
                  value={form.discount_price}
                  error={errors.discount_price}
                  onChange={(v) => update("discount_price", v)}
                />
                <TextField
                  label="Discount (%)"
                  type="number"
                  value={form.discount}
                  error={errors.discount}
                  onChange={(v) => update("discount", v)}
                />
                <TextField
                  label="Child price"
                  type="number"
                  value={form.child_price}
                  error={errors.child_price}
                  onChange={(v) => update("child_price", v)}
                />
                <TextField
                  label="Infant price"
                  type="number"
                  value={form.infant_price}
                  error={errors.infant_price}
                  onChange={(v) => update("infant_price", v)}
                />
              </FieldGrid>
              <div className="mt-6 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
                <p className="text-caption uppercase tracking-wide text-muted-foreground">
                  Traveller pays
                </p>
                <p className="mt-1 text-h4 font-bold tabular-nums">
                  {(form.discount_price || form.price || "0")} {form.currency}
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
            <SettingsCard title="Media" description="Cover image and downloadable brochure.">
              <div className="grid gap-5">
                <ImageField
                  label="Cover image"
                  hint="Used on cards, package page hero, and social previews."
                  value={form.cover}
                  folder="packages"
                  onChange={(v) => update("cover", v)}
                />
                {errors.cover && <p className="text-caption text-destructive">{errors.cover}</p>}
                <PdfField
                  label="Brochure (PDF)"
                  hint="Optional downloadable programme."
                  value={form.brochure_pdf}
                  onChange={(v) => update("brochure_pdf", v)}
                />
              </div>
            </SettingsCard>
          )}

          {tab === "hotel" && (
            <SettingsCard title="Accommodation" description="Where travellers stay and how they move.">
              <FieldGrid>
                <TextField label="Hotel name" value={form.hotel} onChange={(v) => update("hotel", v)} />
                <TextField
                  label="Hotel rating (1–5)"
                  type="number"
                  value={form.hotel_rating}
                  error={errors.hotel_rating}
                  onChange={(v) => update("hotel_rating", v)}
                />
                <TextField
                  label="Ground transport"
                  hint="e.g. Private air-conditioned coach"
                  wide
                  value={form.transport}
                  onChange={(v) => update("transport", v)}
                />
              </FieldGrid>
            </SettingsCard>
          )}

          {tab === "flights" && (
            <SettingsCard title="Flights" description="Airline and travel dates.">
              <FieldGrid>
                <TextField label="Airline" value={form.airline} onChange={(v) => update("airline", v)} />
                <Field label="Departure date">
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => update("departure_date", e.target.value)}
                  />
                </Field>
                <Field label="Return date" error={errors.return_date}>
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
            <SettingsCard title="Itinerary" description="Day-by-day programme shown on the package page.">
              <ItineraryEditor items={form.timeline} onChange={(v) => update("timeline", v)} />
            </SettingsCard>
          )}

          {tab === "included" && (
            <SettingsCard title="What's included" description="Everything covered by the price.">
              <ListEditor
                items={form.included}
                onChange={(v) => update("included", v)}
                placeholder="Return flights from Tunis"
                addLabel="Add inclusion"
                emptyTitle="No inclusions listed"
                emptyDescription="Add the services covered by this package."
              />
            </SettingsCard>
          )}

          {tab === "excluded" && (
            <SettingsCard title="What's not included" description="Set expectations up front.">
              <ListEditor
                items={form.excluded}
                onChange={(v) => update("excluded", v)}
                placeholder="Personal expenses"
                addLabel="Add exclusion"
                emptyTitle="No exclusions listed"
                emptyDescription="Add anything travellers must pay separately."
              />
            </SettingsCard>
          )}

          {tab === "documents" && (
            <SettingsCard title="Required documents" description="Paperwork travellers must provide.">
              <ListEditor
                items={form.required_documents}
                onChange={(v) => update("required_documents", v)}
                placeholder="Passport valid for 6 months"
                addLabel="Add document"
                emptyTitle="No documents listed"
                emptyDescription="List the documents needed to confirm a booking."
              />
            </SettingsCard>
          )}

          {tab === "seo" && (
            <SettingsCard title="SEO" description="How this package appears in search and social previews.">
              <FieldGrid>
                <TextField
                  label="SEO title"
                  wide
                  maxCount={60}
                  value={form.seo_title}
                  error={errors.seo_title}
                  placeholder={form.title}
                  onChange={(v) => update("seo_title", v)}
                />
                <TextField
                  label="Meta description"
                  wide
                  maxCount={160}
                  value={form.seo_description}
                  error={errors.seo_description}
                  placeholder={form.short_description}
                  onChange={(v) => update("seo_description", v)}
                />
                <Field label="Keywords" wide hint="Press Enter or comma to add.">
                  <KeywordEditor items={form.seo_keywords} onChange={(v) => update("seo_keywords", v)} />
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
              title="Gallery"
              description="Photos shown on the package page. The first image is the main one."
            >
              <GalleryManager items={form.gallery} onChange={(v) => update("gallery", v)} />
            </SettingsCard>
          )}

          {tab === "availability" && (
            <SettingsCard title="Availability" description="Duration and seat inventory.">
              <FieldGrid>
                <TextField
                  label="Duration"
                  hint="e.g. 10 days / 9 nights"
                  value={form.duration}
                  onChange={(v) => update("duration", v)}
                />
                <TextField
                  label="Available seats"
                  type="number"
                  value={form.seats}
                  error={errors.seats}
                  onChange={(v) => update("seats", v)}
                />
                <TextField
                  label="Total seats"
                  type="number"
                  value={form.total_seats}
                  error={errors.total_seats}
                  onChange={(v) => update("total_seats", v)}
                />
              </FieldGrid>
              {form.total_seats && (
                <p className="mt-4 text-caption text-muted-foreground">
                  {Math.max(0, Number(form.total_seats) - Number(form.seats || 0))} of{" "}
                  {form.total_seats} seats booked.
                </p>
              )}
            </SettingsCard>
          )}

          {tab === "booking" && (
            <SettingsCard title="Booking" description="What travellers see when they reserve.">
              <FieldGrid>
                <TextField
                  label="Meeting point"
                  hint="Where travellers gather before departure."
                  wide
                  value={form.meeting_point}
                  onChange={(v) => update("meeting_point", v)}
                />
              </FieldGrid>
              <div className="mt-6 grid gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 text-small">
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Bookable on the website</span>
                  <span className="font-medium">
                    {form.status === "published" && Number(form.seats || 0) > 0 ? "Yes" : "No"}
                  </span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Required documents configured</span>
                  <span className="font-medium">{form.required_documents.length}</span>
                </p>
                <Link
                  to="/admin/bookings"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Open bookings <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </SettingsCard>
          )}
        </div>
      </div>

      {/* -------------------------------- preview -------------------------------- */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Live preview</SheetTitle>
          </SheetHeader>
          {publicPath && (
            <div className="mt-4 h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border-subtle">
              <iframe
                key={`${publicPath}-${lastSaved?.getTime() ?? 0}`}
                src={publicPath}
                title="Package preview"
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
              Open in a new tab <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
