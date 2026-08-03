import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Check,
  CloudUpload,
  Loader2,
  Monitor,
  RotateCcw,
  Search,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { uploadMedia } from "@/lib/admin/media";
import { toast } from "sonner";

/* ----------------------------- section scaffold ---------------------------- */

export function SettingsSection({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <header className="max-w-2xl">
        <h2 className="text-h4 font-bold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-2 text-small leading-relaxed text-muted-foreground">{description}</p>
        )}
      </header>
      {aside}
      {children}
    </section>
  );
}

export function SettingsCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border-subtle bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h3 className="text-body font-semibold">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/** Responsive field grid — never more than two columns. */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 md:grid-cols-2", className)}>{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  wide,
  children,
}: {
  label: ReactNode;
  hint?: string;
  error?: string | null;
  wide?: boolean;
  children: ReactNode | ((id: string) => ReactNode);
}) {
  const id = useId();
  return (
    <div className={cn("grid gap-2", wide && "md:col-span-2")}>
      <Label htmlFor={id} className="text-small font-medium">
        {label}
      </Label>
      {typeof children === "function" ? children(id) : children}
      {error ? (
        <p className="text-caption text-destructive">{error}</p>
      ) : (
        hint && <p className="text-caption leading-relaxed text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  wide,
  value,
  onChange,
  placeholder,
  type,
  maxCount,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  wide?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxCount?: number;
}) {
  return (
    <Field label={label} hint={hint} error={error} wide={wide}>
      {(id) => (
        <>
          <Input
            id={id}
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {maxCount && (
            <p
              className={cn(
                "text-caption tabular-nums",
                value.length > maxCount ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {value.length} / {maxCount}
            </p>
          )}
        </>
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} wide>
      {(id) => (
        <Textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

/* -------------------------------- media field ------------------------------- */

export function ImageField({
  label,
  hint,
  value,
  onChange,
  folder,
  aspect = "aspect-[16/9]",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  folder: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadMedia(file, folder);
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label} hint={hint} wide>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken/60 sm:w-64",
            aspect,
          )}
        >
          {value ? (
            <img src={value} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-caption text-muted-foreground">
              No image yet
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
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
            <CloudUpload className="me-2 h-4 w-4" /> {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onChange("")}
            >
              <Trash2 className="me-2 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
      </div>
    </Field>
  );
}

/* -------------------------------- icon picker ------------------------------- */

const ICON_CHOICES = [
  "users",
  "user-check",
  "plane",
  "plane-takeoff",
  "map-pin",
  "map",
  "globe",
  "calendar",
  "star",
  "award",
  "trophy",
  "heart",
  "shield-check",
  "sparkles",
  "smile",
  "thumbs-up",
  "briefcase",
  "building-2",
  "phone",
  "mail",
  "message-circle",
  "clock",
  "ticket",
  "luggage",
  "kaaba",
  "moon-star",
  "camera",
  "image",
  "trending-up",
  "badge-check",
  "handshake",
  "gem",
];

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = ICON_CHOICES.filter((n) => n.includes(q.trim().toLowerCase()));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
          <DynamicIcon name={value} className="h-4 w-4 text-primary" />
          <span className="truncate text-muted-foreground">{value || "Choose icon"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search icons"
            className="pl-8"
          />
        </div>
        <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
          {list.map((n) => (
            <button
              key={n}
              type="button"
              title={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={cn(
                "grid h-9 place-items-center rounded-md border border-transparent transition-colors hover:bg-accent",
                value === n && "border-primary bg-accent text-primary",
              )}
            >
              <DynamicIcon name={n} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------- save footer ------------------------------- */

export function useLastSaved(saving: boolean, success: boolean) {
  const [at, setAt] = useState<Date | null>(null);
  useEffect(() => {
    if (success) setAt(new Date());
  }, [success]);
  return saving ? null : at;
}

export function SaveBar({
  dirty,
  saving,
  lastSaved,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border-subtle bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving changes…
            </>
          ) : dirty ? (
            <>
              <span className="h-2 w-2 rounded-full bg-warning" /> Unsaved changes
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              {lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : "All changes saved"}
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onDiscard}>
            <RotateCcw className="me-2 h-4 w-4" /> Discard
          </Button>
          <Button size="sm" disabled={!dirty || saving} onClick={onSave}>
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
  );
}

/* ------------------------------- live preview ------------------------------- */

const DEVICES = {
  desktop: { label: "Desktop", width: "100%", icon: Monitor },
  tablet: { label: "Tablet", width: "820px", icon: Tablet },
  mobile: { label: "Mobile", width: "390px", icon: Smartphone },
} as const;

export function LivePreview({ path = "/", reloadKey }: { path?: string; reloadKey?: number }) {
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  return (
    <SettingsCard
      title="Live preview"
      description="See how the public website renders your content."
      actions={
        <div className="flex gap-1 rounded-lg border border-border-subtle bg-surface-sunken/60 p-1">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((k) => {
            const Icon = DEVICES[k].icon;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDevice(k)}
                aria-label={DEVICES[k].label}
                aria-pressed={device === k}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  device === k
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      }
    >
      <div className="flex justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken/40 p-2">
        <iframe
          key={`${device}-${reloadKey ?? 0}`}
          src={path}
          title="Website preview"
          loading="lazy"
          className="h-[520px] rounded-lg border border-border-subtle bg-background"
          style={{ width: DEVICES[device].width, maxWidth: "100%" }}
        />
      </div>
    </SettingsCard>
  );
}

/* ------------------------------ auto-save status ---------------------------- */

export function AutoSaveBar({
  dirty,
  saving,
  hasErrors,
  lastSaved,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  hasErrors?: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border-subtle bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          {hasErrors ? (
            <>
              <span className="h-2 w-2 rounded-full bg-destructive" /> Fix the highlighted fields to
              save
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : dirty ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-warning" /> Auto-saving in a
              moment
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              {lastSaved ? `Auto-saved at ${lastSaved.toLocaleTimeString()}` : "All changes saved"}
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onDiscard}>
            <RotateCcw className="me-2 h-4 w-4" /> Discard
          </Button>
          <Button size="sm" disabled={!dirty || saving || hasErrors} onClick={onSave}>
            {saving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="me-2 h-4 w-4" />
            )}{" "}
            Save now
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- toggle field ------------------------------ */

export function SwitchField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border-subtle bg-surface-sunken/40 px-4 py-3.5 transition-colors hover:bg-accent/40">
      <span className="min-w-0">
        <span className="block text-small font-medium text-foreground">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

/* --------------------------------- colour field ----------------------------- */

export function ColorField({
  label,
  hint,
  error,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  value: string;
  onChange: (v: string) => void;
}) {
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000";
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="flex items-center gap-2">
        <span
          className="h-10 w-10 shrink-0 rounded-lg border border-border-subtle"
          style={{ backgroundColor: safe }}
          aria-hidden
        />
        <Input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer p-1"
          aria-label={`${label} colour picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#EE5A24"
          className="font-mono uppercase"
        />
      </div>
    </Field>
  );
}

/* ------------------------------- search preview ----------------------------- */

export function SerpPreview({
  title,
  description,
  urlLabel,
}: {
  title: string;
  description: string;
  urlLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-5">
      <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        Google result preview
      </p>
      <div className="rounded-lg bg-card p-4 shadow-sm">
        <p className="truncate text-caption text-success">{urlLabel}</p>
        <p className="mt-1 line-clamp-1 text-body font-medium text-primary">
          {title || "Your page title"}
        </p>
        <p className="mt-1 line-clamp-2 text-small leading-relaxed text-muted-foreground">
          {description || "Your meta description appears here in search results."}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- brand preview ----------------------------- */

export function BrandPreview({
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
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      <div
        className="flex items-center gap-4 px-5 py-6"
        style={{ background: `linear-gradient(120deg, ${primary} 0%, ${accent} 100%)` }}
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/95">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-caption text-neutral-500">Logo</span>
          )}
        </span>
        <span className="min-w-0 text-white">
          <span className="block truncate text-h5 font-bold">{name || "Agency name"}</span>
          <span className="block truncate text-small opacity-90">{tagline || "Your tagline"}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 bg-card px-5 py-4">
        <span
          className="rounded-lg px-4 py-2 text-small font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          Primary button
        </span>
        <span
          className="rounded-lg px-4 py-2 text-small font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Accent button
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ bilingual fields ----------------------------- */

import { MissingFrBadge, isEmptyFr } from "@/components/admin/ui";

/** Two-column Arabic/French pair for a single-line text field. */
export function BilingualTextField({
  label,
  hint,
  error,
  wide = true,
  valueAr,
  onChangeAr,
  valueFr,
  onChangeFr,
  placeholderAr,
  placeholderFr,
  type,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  wide?: boolean;
  valueAr: string;
  onChangeAr: (v: string) => void;
  valueFr: string;
  onChangeFr: (v: string) => void;
  placeholderAr?: string;
  placeholderFr?: string;
  type?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", wide && "md:col-span-2")}>
      <Field label={`${label} (Arabic)`} hint={hint} error={error}>
        <Input
          dir="rtl"
          type={type}
          value={valueAr}
          placeholder={placeholderAr}
          onChange={(e) => onChangeAr(e.target.value)}
        />
      </Field>
      <Field
        label={
          <span className="inline-flex items-center gap-2">
            {`${label} (French)`}
            {isEmptyFr(valueFr) && <MissingFrBadge />}
          </span>
        }
      >
        <Input
          dir="ltr"
          type={type}
          value={valueFr}
          placeholder={placeholderFr}
          onChange={(e) => onChangeFr(e.target.value)}
        />
      </Field>
    </div>
  );
}

/** Two-column Arabic/French pair for a multi-line text field. */
export function BilingualTextAreaField({
  label,
  hint,
  valueAr,
  onChangeAr,
  valueFr,
  onChangeFr,
  rows = 4,
}: {
  label: string;
  hint?: string;
  valueAr: string;
  onChangeAr: (v: string) => void;
  valueFr: string;
  onChangeFr: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
      <Field label={`${label} (Arabic)`} hint={hint}>
        <Textarea
          dir="rtl"
          rows={rows}
          value={valueAr}
          onChange={(e) => onChangeAr(e.target.value)}
        />
      </Field>
      <Field
        label={
          <span className="inline-flex items-center gap-2">
            {`${label} (French)`}
            {isEmptyFr(valueFr) && <MissingFrBadge />}
          </span>
        }
      >
        <Textarea
          dir="ltr"
          rows={rows}
          value={valueFr}
          onChange={(e) => onChangeFr(e.target.value)}
        />
      </Field>
    </div>
  );
}
