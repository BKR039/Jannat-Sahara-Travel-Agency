import { useRef, useState } from "react";
import { CloudUpload, ImagePlus, Loader2, RotateCcw, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Disclosure } from "@/components/admin/kit";
import { uploadMedia } from "@/lib/admin/media";
import { cn } from "@/lib/utils";
import { SettingsCard, SettingsSection, TextField } from "./parts";
import { hexColor, maxLen, url, useSiteSettings, type SettingSpec } from "./useSiteSettings";
import { useContactSettings } from "./useContactSettings";

const DEFAULT_PRIMARY = "#EE5A24";
const DEFAULT_ACCENT = "#C9982E";

const SPECS: SettingSpec[] = [
  { key: "brand_tagline", label: "Tagline", validate: maxLen(80) },
  { key: "brand_logo_url", label: "Logo" },
  { key: "brand_favicon_url", label: "Favicon" },
  { key: "brand_primary_color", label: "Primary colour", validate: hexColor },
  { key: "brand_accent_color", label: "Secondary colour", validate: hexColor },
  { key: "brand_website_url", label: "Website URL", validate: url },
  { key: "brand_canonical_url", label: "Canonical URL", validate: url },
];

/* ------------------------------- asset uploader ------------------------------ */

function AssetUploader({
  label,
  hint,
  value,
  onChange,
  size = "lg",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  size?: "lg" | "sm";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadMedia(file, "brand"));
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const box = size === "lg" ? "h-24 w-24" : "h-14 w-14";

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={value ? `Replace ${label}` : `Upload ${label}`}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken/60 transition-colors hover:border-primary/50",
          box,
        )}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            <ImagePlus className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </span>
        )}
      </button>

      <div className="min-w-0">
        <p className="text-small font-medium text-foreground">
          {label}
        </p>
        {hint && <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <CloudUpload className="me-2 h-3.5 w-3.5" /> {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onChange("")}
            >
              <Trash2 className="me-2 h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- swatches --------------------------------- */

function SwatchField({
  label,
  value,
  fallback,
  error,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  error?: string | null;
  onChange: (v: string) => void;
}) {
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
  return (
    <div className="grid gap-2">
      <Label className="text-small font-medium">{label}</Label>
      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-sunken/40 p-2">
        <label
          className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border-subtle"
          style={{ backgroundColor: safe }}
        >
          <input
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} picker`}
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="border-0 bg-transparent font-mono uppercase shadow-none focus-visible:ring-0"
        />
      </div>
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}

/* ------------------------------- live preview -------------------------------- */

function BrandStage({
  logo,
  name,
  tagline,
  primary,
  accent,
}: {
  logo: string;
  name: string;
  tagline: string;
  primary: string;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm">
      {/* navigation preview */}
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-sunken">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-caption text-muted-foreground">·</span>
            )}
          </span>
          <span className="truncate text-small font-semibold text-foreground">
            {name || "Agency name"}
          </span>
        </div>
        <div className="hidden items-center gap-3 text-caption text-muted-foreground sm:flex">
          <span>الرئيسية</span>
          <span>العمرة</span>
          <span>الرحلات</span>
        </div>
      </div>

      {/* hero preview */}
      <div
        className="px-5 py-7 text-center"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
      >
        <span className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white/95 shadow-sm">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <span className="text-caption text-neutral-500">Logo</span>
          )}
        </span>
        <p className="mt-3 truncate text-h5 font-bold text-white">{name || "Agency name"}</p>
        <p className="mt-1 line-clamp-2 text-small text-white/90">{tagline || "Your tagline"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        <span
          className="rounded-xl px-4 py-2 text-small font-semibold text-white shadow-sm"
          style={{ backgroundColor: primary }}
        >
          احجز الآن
        </span>
        <span
          className="rounded-xl border px-4 py-2 text-small font-semibold"
          style={{ borderColor: accent, color: accent }}
        >
          تصفح العروض
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------- section --------------------------------- */

export function BrandSection() {
  const s = useSiteSettings("brand", SPECS);
  const contact = useContactSettings([
    { key: "agency_name", label: "Agency name", icon: "building-2", sort_order: 0 },
  ]);

  if (s.loading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const primary = s.form.brand_primary_color || DEFAULT_PRIMARY;
  const accent = s.form.brand_accent_color || DEFAULT_ACCENT;
  const isDefaultColors = primary === DEFAULT_PRIMARY && accent === DEFAULT_ACCENT;

  const dirty = s.dirty || contact.dirty;
  const saving = s.saving || contact.saving;
  const hasErrors = s.hasErrors || contact.hasErrors;
  const lastSaved = s.lastSaved ?? contact.lastSaved;

  return (
    <SettingsSection
      title="Brand identity"
      description="Your logo, voice and colours — exactly as travellers see them on the public website."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------- left column ------------------------------ */}
        <div className="min-w-0 space-y-5">
          <SettingsCard title="Brand identity" description="The name and voice of your agency.">
            <div className="space-y-5">
              <TextField
                label="Agency name"
                hint="Inherited from your agency profile — editing it here updates it everywhere."
                value={contact.form.agency_name ?? ""}
                onChange={(v) => contact.set("agency_name", v)}
              />
              <TextField
                label="Tagline"
                hint="One short line under your logo."
                error={s.errors.brand_tagline}
                value={s.form.brand_tagline ?? ""}
                onChange={(v) => s.set("brand_tagline", v)}
              />
            </div>
          </SettingsCard>

          <SettingsCard title="Brand assets" description="PNG, SVG or JPG.">
            <div className="space-y-5">
              <AssetUploader
                label="Logo"
                hint="Square, transparent background. 512×512 recommended."
                value={s.form.brand_logo_url ?? ""}
                onChange={(v) => s.set("brand_logo_url", v)}
              />
              <div className="border-t border-border-subtle pt-5">
                <AssetUploader
                  label="Favicon"
                  hint="Browser-tab icon. 64×64."
                  size="sm"
                  value={s.form.brand_favicon_url ?? ""}
                  onChange={(v) => s.set("brand_favicon_url", v)}
                />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Brand colours"
            description="Used for buttons, badges and highlights."
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDefaultColors}
                onClick={() => {
                  s.set("brand_primary_color", DEFAULT_PRIMARY);
                  s.set("brand_accent_color", DEFAULT_ACCENT);
                }}
              >
                <RotateCcw className="me-2 h-3.5 w-3.5" /> Reset to brand defaults
              </Button>
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <SwatchField
                label="Primary colour"
                fallback={DEFAULT_PRIMARY}
                error={s.errors.brand_primary_color}
                value={s.form.brand_primary_color ?? ""}
                onChange={(v) => s.set("brand_primary_color", v)}
              />
              <SwatchField
                label="Secondary colour"
                fallback={DEFAULT_ACCENT}
                error={s.errors.brand_accent_color}
                value={s.form.brand_accent_color ?? ""}
                onChange={(v) => s.set("brand_accent_color", v)}
              />
            </div>
          </SettingsCard>

          <Disclosure label="Advanced settings">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Website URL"
                hint="Used in emails and structured data."
                placeholder="https://janatsahara.tn"
                error={s.errors.brand_website_url}
                value={s.form.brand_website_url ?? ""}
                onChange={(v) => s.set("brand_website_url", v)}
              />
              <TextField
                label="Canonical URL"
                hint="Preferred address search engines should index."
                placeholder="https://janatsahara.tn"
                error={s.errors.brand_canonical_url}
                value={s.form.brand_canonical_url ?? ""}
                onChange={(v) => s.set("brand_canonical_url", v)}
              />
            </div>
          </Disclosure>
        </div>

        {/* ------------------------------ right column ----------------------------- */}
        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Live preview
          </p>
          <BrandStage
            logo={s.form.brand_logo_url ?? ""}
            name={contact.form.agency_name ?? ""}
            tagline={s.form.brand_tagline ?? ""}
            primary={primary}
            accent={accent}
          />
          <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
            Updates instantly as you edit. Published to the public website when you save.
          </p>
        </aside>
      </div>

      {/* --------------------------------- save bar -------------------------------- */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border-subtle bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-caption text-muted-foreground">
            {hasErrors ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive" /> Fix the highlighted fields
              </>
            ) : saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : dirty ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-warning" /> Unsaved changes
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                {lastSaved
                  ? `All changes saved · ${lastSaved.toLocaleTimeString()}`
                  : "All changes saved"}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!dirty || saving}
              onClick={() => {
                s.discard();
                contact.discard();
              }}
            >
              <RotateCcw className="me-2 h-4 w-4" /> Discard
            </Button>
            <Button
              size="sm"
              disabled={!dirty || saving || hasErrors}
              onClick={() => {
                s.saveNow();
                contact.saveNow();
              }}
            >
              {saving ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-2 h-4 w-4" />
              )}{" "}
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
