import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Check,
  Clock,
  FileCheck2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Package } from "@/lib/queries";
import {
  ALLOWED_TYPES,
  MAX_PASSPORT_BYTES,
  adultPrice,
  childPrice,
  infantPrice,
  money,
  randomId,
  type Counts,
  type Passenger,
  type ServiceKey,
} from "./model";

/* -------------------------------------------------- stepper */

export function StepIndicator({
  steps,
  current,
  onJump,
}: {
  steps: string[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i <= current && onJump(i)}
              disabled={i > current}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-caption font-semibold transition-all duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-brand-glow"
                  : done
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  active ? "bg-primary-foreground/20" : done ? "bg-primary/15" : "bg-background/60"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`h-px w-4 sm:w-8 ${done ? "bg-primary/50" : "bg-border"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------- step 1: services */

export function ServiceGrid({
  services,
  value,
  onChange,
}: {
  services: Array<{ key: ServiceKey; icon: React.ReactNode; count: number }>;
  value: ServiceKey | null;
  onChange: (k: ServiceKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {services.map((s) => {
        const active = value === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-pressed={active}
            className={`group relative overflow-hidden rounded-xl border p-6 text-start transition-all duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              active
                ? "border-primary bg-primary/5 shadow-xl"
                : "border-border-subtle bg-card hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            }`}
          >
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-base ${
                active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              {s.icon}
            </span>
            <span className="mt-4 block text-h5 font-bold">{t(`categories.${s.key}`)}</span>
            <span className="mt-1 block text-caption text-muted-foreground">
              {t("bookingFlow.package.available", { count: s.count })}
            </span>
            {active && (
              <span className="absolute top-4 end-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------- step 2: packages */

export function PackageOption({
  pkg,
  active,
  onSelect,
}: {
  pkg: Package;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group flex w-full flex-col overflow-hidden rounded-xl border text-start transition-all duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "border-primary bg-primary/5 shadow-xl"
          : "border-border-subtle bg-card hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {pkg.cover ? (
          <img
            src={pkg.cover}
            alt={pkg.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-slow ease-standard group-hover:scale-105"
          />
        ) : null}
        {active && (
          <span className="absolute top-3 end-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-brand-glow">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-h5 font-bold leading-snug">{pkg.title}</h3>
        {pkg.short_description && (
          <p className="line-clamp-2 text-small text-muted-foreground">{pkg.short_description}</p>
        )}
        <ul className="mt-auto space-y-1.5 text-caption text-muted-foreground">
          {pkg.destination && (
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {pkg.destination}
            </li>
          )}
          {pkg.departure_date && (
            <li className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {new Date(pkg.departure_date).toLocaleDateString()}
            </li>
          )}
          {pkg.duration && (
            <li className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" /> {pkg.duration}
            </li>
          )}
          {typeof pkg.seats === "number" && (
            <li className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" /> {pkg.seats} {t("package.seats")}
            </li>
          )}
        </ul>
        <div className="flex items-baseline gap-2 border-t border-border pt-3">
          <span className="text-caption text-muted-foreground">
            {t("bookingFlow.package.from")}
          </span>
          <span className="text-h5 font-extrabold text-primary">
            {money(adultPrice(pkg), pkg.currency)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------- step 3: counters */

export function CounterRow({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-card p-5">
      <div>
        <p className="text-body font-bold">{label}</p>
        <p className="text-caption text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`- ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-fast hover:bg-muted disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-h5 font-bold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`+ ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-fast hover:bg-primary/90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------- passenger form */

export function PassportUpload({
  passenger,
  onChange,
}: {
  passenger: Passenger;
  onChange: (patch: Partial<Passenger>) => void;
}) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const uid = `pax-${passenger.id}`;

  async function handleFile(file: File | null) {
    if (!file) return;
    if (file.size > MAX_PASSPORT_BYTES) {
      toast.error(t("bookingFlow.errors.tooLarge"));
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t("bookingFlow.errors.badType"));
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const safeExt = ext?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
      const path = `bookings/${randomId()}/passport.${safeExt}`;
      const { error } = await supabase.storage
        .from("passports")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange({ passportPath: path, passportName: file.name });
    } catch (err) {
      console.error(err);
      toast.error(t("bookingFlow.errors.upload"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${uid}-file`}>{t("bookingFlow.fields.passportFile")}</Label>
      <label
        htmlFor={`${uid}-file`}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-small transition-all duration-base ease-standard hover:bg-muted"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">{t("bookingFlow.fields.uploading")}</span>
          </>
        ) : passenger.passportName ? (
          <>
            <FileCheck2 className="h-5 w-5 text-primary" />
            <span className="truncate">{passenger.passportName}</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">{t("bookingFlow.fields.passportHint")}</span>
          </>
        )}
        <input
          id={`${uid}-file`}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

export function PassengerForm({
  passenger,
  index,
  isPrimary,
  showPassport = false,
  onChange,
}: {
  passenger: Passenger;
  index: number;
  isPrimary: boolean;
  showPassport?: boolean;
  onChange: (patch: Partial<Passenger>) => void;
}) {
  const { t } = useTranslation();
  const uid = `pax-${passenger.id}`;

  const typeLabel = t(`bookingFlow.travellers.${passenger.type}`);

  return (
    <div className="rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h5 font-bold">
          {typeLabel} {index + 1}
        </h3>
        {isPrimary && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
            {t("bookingFlow.travellers.primaryBadge")}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor={`${uid}-name`}>{t("bookingFlow.fields.fullName")} *</Label>
          <Input
            id={`${uid}-name`}
            maxLength={120}
            value={passenger.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
          />
        </div>

          <Label htmlFor={`${uid}-gender`}>{t("bookingFlow.fields.gender")}</Label>
          <select
            id={`${uid}-gender`}
            value={passenger.gender}
            onChange={(e) => onChange({ gender: e.target.value })}
            className="h-10 rounded-sm border border-input bg-background px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">—</option>
            <option value="male">{t("bookingFlow.fields.male")}</option>
            <option value="female">{t("bookingFlow.fields.female")}</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${uid}-dob`}>{t("bookingFlow.fields.dob")}</Label>
          <Input
            id={`${uid}-dob`}
            type="date"
            value={passenger.dateOfBirth}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${uid}-exp`}>{t("bookingFlow.fields.passportExpiry")}</Label>
          <Input
            id={`${uid}-exp`}
            type="date"
            value={passenger.passportExpiry}
            onChange={(e) => onChange({ passportExpiry: e.target.value })}
          />
        </div>

        {isPrimary && (
          <>
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-phone`}>{t("bookingFlow.fields.phone")} *</Label>
              <Input
                id={`${uid}-phone`}
                type="tel"
                inputMode="tel"
                maxLength={30}
                value={passenger.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-email`}>{t("bookingFlow.fields.email")} *</Label>
              <Input
                id={`${uid}-email`}
                type="email"
                maxLength={254}
                value={passenger.email}
                onChange={(e) => onChange({ email: e.target.value })}
              />
            </div>
          </>
        )}

        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor={`${uid}-emg`}>{t("bookingFlow.fields.emergency")}</Label>
          <Input
            id={`${uid}-emg`}
            maxLength={160}
            value={passenger.emergencyContact}
            onChange={(e) => onChange({ emergencyContact: e.target.value })}
          />
        </div>

        {showPassport && (
          <div className="md:col-span-2">
            <PassportUpload passenger={passenger} onChange={onChange} />
          </div>
        )}

        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor={`${uid}-notes`}>{t("bookingFlow.fields.notes")}</Label>
          <Textarea
            id={`${uid}-notes`}
            rows={2}
            maxLength={1000}
            value={passenger.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- summary */

export function SummaryPanel({
  pkg,
  counts,
  total,
}: {
  pkg: Package | null;
  counts: Counts;
  total: number;
}) {
  const { t } = useTranslation();
  if (!pkg) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-small text-muted-foreground">
        {t("bookingFlow.summary.empty")}
      </div>
    );
  }
  const people = counts.adults + counts.children + counts.infants;
  const rows: Array<[string, string]> = [
    [t("bookingFlow.summary.package"), pkg.title],
    [
      t("bookingFlow.summary.departure"),
      pkg.departure_date ? new Date(pkg.departure_date).toLocaleDateString() : "—",
    ],
    [t("bookingFlow.summary.duration"), pkg.duration ?? "—"],
    [t("bookingFlow.summary.perAdult"), money(adultPrice(pkg), pkg.currency)],
    ...(counts.children > 0
      ? ([[t("bookingFlow.summary.perChild"), money(childPrice(pkg), pkg.currency)]] as Array<
          [string, string]
        >)
      : []),
    ...(counts.infants > 0
      ? ([[t("bookingFlow.summary.perInfant"), money(infantPrice(pkg), pkg.currency)]] as Array<
          [string, string]
        >)
      : []),
    [t("bookingFlow.summary.passengers"), String(people)],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card shadow-lg">
      {pkg.cover && (
        <img src={pkg.cover} alt={pkg.title} loading="lazy" className="h-32 w-full object-cover" />
      )}
      <div className="p-6">
        <h3 className="text-h5 font-bold">{t("bookingFlow.summary.title")}</h3>
        <dl className="mt-4 space-y-2.5 text-small">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-end font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-body font-bold">{t("bookingFlow.summary.total")}</span>
          <span className="text-h4 font-extrabold text-primary">{money(total, pkg.currency)}</span>
        </div>
      </div>
    </div>
  );
}
