import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLang } from "@/lib/i18n";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Armchair,
  CalendarDays,
  Loader2,
  Sparkles,
  CheckCircle2,
  Copy,
  Phone,
  MessageCircle,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { AirportCombobox } from "./AirportCombobox";
import { submitFlightRequest } from "@/lib/flight-request.functions";
import {
  CABIN_CLASSES,
  cabinLabel,
  FlightRequestInput,
  type FlightRequestInputType,
} from "@/lib/flight-request.schema";
import { contactInfoQuery } from "@/lib/queries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

type Draft = {
  name: string;
  phone: string;
  email: string;
  fromAirport: string;
  toAirport: string;
  tripType: "one_way" | "round_trip";
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: (typeof CABIN_CLASSES)[number];
  notes: string;
};

const EMPTY: Draft = {
  name: "",
  phone: "",
  email: "",
  fromAirport: "",
  toAirport: "",
  tripType: "round_trip",
  departureDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "economy",
  notes: "",
};

const fieldClass =
  "h-14 w-full rounded-[var(--radius-card)] border border-border-subtle bg-card px-4 text-body text-foreground shadow-sm transition-all duration-base ease-standard placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15";

export function FlightRequestSection() {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);
  const submit = useServerFn(submitFlightRequest);
  const { data: contact } = useQuery(contactInfoQuery());

  const phoneNumber = useMemo(
    () => contact?.find((c) => c.key === "phone" || c.key === "mobile")?.value ?? "",
    [contact],
  );
  const whatsapp = useMemo(
    () => contact?.find((c) => c.key === "whatsapp")?.value ?? phoneNumber,
    [contact, phoneNumber],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (payload: FlightRequestInputType) => submit({ data: payload }),
    onSuccess: (res) => {
      setReference(res.reference);
      setDraft(EMPTY);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message || t("flightRequest.errorGeneric")),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = FlightRequestInput.safeParse({
      ...draft,
      returnDate: draft.tripType === "round_trip" ? draft.returnDate : "",
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error(t("flightRequest.errorValidation"));
      return;
    }
    setErrors({});
    mutation.mutate({ ...parsed.data, locale: normalizeLang(i18n.language) });
  }

  if (reference) {
    return (
      <SuccessScreen
        reference={reference}
        phone={phoneNumber}
        whatsapp={whatsapp}
        onNew={() => setReference(null)}
      />
    );
  }

  const passengersLabel = t("flightRequest.passengersCount", { count: draft.adults + draft.children + draft.infants });

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-caption font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {t("flightRequest.badge")}
        </span>
        <h1 className="text-h2 text-foreground">{t("flightRequest.heading")}</h1>
        <p className="max-w-2xl text-body-lg text-muted-foreground">
          {t("flightRequest.subheading")}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="rounded-[var(--radius-card)] border border-border-subtle bg-card p-6 shadow-xl md:p-10 ds-reveal"
      >
        {/* Trip type */}
        <div
          role="radiogroup"
          aria-label={t("flightRequest.tripTypeAria")}
          className="mb-8 inline-flex rounded-full bg-muted p-1"
        >
          {(
            [
              ["one_way", t("flightRequest.oneWay")],
              ["round_trip", t("flightRequest.roundTrip")],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={draft.tripType === val}
              onClick={() => set("tripType", val)}
              className={cn(
                "rounded-full px-5 py-2.5 text-small font-semibold transition-all duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                draft.tripType === val
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AirportCombobox
            id="from-airport"
            label={t("flightRequest.fromLabel")}
            placeholder={t("flightRequest.fromPlaceholder")}
            value={draft.fromAirport}
            onChange={(v) => set("fromAirport", v)}
            invalid={!!errors["fromAirport"]}
          />
          <AirportCombobox
            id="to-airport"
            label={t("flightRequest.toLabel")}
            placeholder={t("flightRequest.toPlaceholder")}
            value={draft.toAirport}
            onChange={(v) => set("toAirport", v)}
            invalid={!!errors["toAirport"]}
          />

          <Field label={t("flightRequest.departureLabel")} htmlFor="departure-date" error={errors["departureDate"]}>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-muted-foreground">
                <CalendarDays className="h-5 w-5" />
              </span>
              <input
                id="departure-date"
                type="date"
                min={today()}
                value={draft.departureDate}
                onChange={(e) => set("departureDate", e.target.value)}
                className={cn(fieldClass, "pe-12", errors["departureDate"] && "border-destructive")}
              />
            </div>
          </Field>

          {draft.tripType === "round_trip" && (
            <Field label={t("flightRequest.returnLabel")} htmlFor="return-date" error={errors["returnDate"]}>
              <div className="relative ds-reveal">
                <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-muted-foreground">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <input
                  id="return-date"
                  type="date"
                  min={draft.departureDate || today()}
                  value={draft.returnDate}
                  onChange={(e) => set("returnDate", e.target.value)}
                  className={cn(fieldClass, "pe-12", errors["returnDate"] && "border-destructive")}
                />
              </div>
            </Field>
          )}

          <Field label={t("flightRequest.passengersFieldLabel")} htmlFor="passengers" error={errors["adults"]}>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="passengers"
                  type="button"
                  className={cn(fieldClass, "flex items-center justify-between gap-3 text-start")}
                >
                  <span className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {passengersLabel}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-4">
                <div className="flex flex-col gap-4">
                  <Stepper
                    label={t("flightRequest.adultsLabel")}
                    hint={t("flightRequest.adultsHint")}
                    value={draft.adults}
                    min={1}
                    onChange={(v) => set("adults", v)}
                  />
                  <Stepper
                    label={t("flightRequest.childrenLabel")}
                    hint={t("flightRequest.childrenHint")}
                    value={draft.children}
                    onChange={(v) => set("children", v)}
                  />
                  <Stepper
                    label={t("flightRequest.infantsLabel")}
                    hint={t("flightRequest.infantsHint")}
                    value={draft.infants}
                    onChange={(v) => set("infants", v)}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </Field>

          <Field label={t("flightRequest.cabinLabel")} htmlFor="cabin-class">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">
                <Armchair className="h-5 w-5" />
              </span>
              <select
                id="cabin-class"
                value={draft.cabinClass}
                onChange={(e) => set("cabinClass", e.target.value as Draft["cabinClass"])}
                className={cn(fieldClass, "ps-12 appearance-none")}
              >
                {CABIN_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {cabinLabel(c, i18n.language)}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        <div className="my-8 h-px bg-border-subtle" />

        <div className="grid gap-6 md:grid-cols-3">
          <Field label={t("flightRequest.nameLabel")} htmlFor="req-name" error={errors["name"]}>
            <input
              id="req-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("flightRequest.namePlaceholder")}
              className={cn(fieldClass, errors["name"] && "border-destructive")}
            />
          </Field>
          <Field label={t("flightRequest.phoneLabel")} htmlFor="req-phone" error={errors["phone"]}>
            <input
              id="req-phone"
              dir="ltr"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+216 00 000 000"
              className={cn(fieldClass, errors["phone"] && "border-destructive")}
            />
          </Field>
          <Field label={t("flightRequest.emailLabel")} htmlFor="req-email" error={errors["email"]}>
            <input
              id="req-email"
              dir="ltr"
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@email.com"
              className={cn(fieldClass, errors["email"] && "border-destructive")}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label={t("flightRequest.notesLabel")} htmlFor="req-notes" error={errors["notes"]}>
            <textarea
              id="req-notes"
              rows={5}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={t("flightRequest.notesPlaceholder")}
              className="w-full rounded-[var(--radius-card)] border border-border-subtle bg-card p-4 text-body text-foreground shadow-sm transition-all duration-base ease-standard placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-8 flex h-16 w-full items-center justify-center gap-3 rounded-full bg-primary text-body-lg font-bold text-primary-foreground shadow-lg transition-all duration-base ease-standard hover:scale-[1.01] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70 disabled:hover:scale-100"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> {t("flightRequest.submitting")}
            </>
          ) : (
            t("flightRequest.submitLabel")
          )}
        </button>
        <p className="mt-4 text-center text-caption text-muted-foreground">
          {t("flightRequest.disclaimer")}
        </p>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-small font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error && <span className="text-caption text-destructive">{error}</span>}
    </div>
  );
}

function Stepper({
  label,
  hint,
  value,
  min = 0,
  max = 20,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const { t: tt } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-small font-semibold text-foreground">{label}</div>
        <div className="text-caption text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={tt("flightRequest.decreaseAria", { label })}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-small font-bold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={tt("flightRequest.increaseAria", { label })}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({
  reference,
  phone,
  whatsapp,
  onNew,
}: {
  reference: string;
  phone: string;
  whatsapp: string;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  const waLink = `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
    t("flightRequest.waMessage", { reference }),
  )}`;
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <div className="flex flex-col items-center gap-6 rounded-[var(--radius-card)] border border-border-subtle bg-card p-8 text-center shadow-xl md:p-12 ds-reveal">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-mint-muted text-brand-green">
          <CheckCircle2 className="h-10 w-10" />
        </span>
        <h1 className="text-h2 text-foreground">{t("flightRequest.successTitle")}</h1>
        <p className="max-w-xl text-body-lg text-muted-foreground">
          {t("flightRequest.successDesc")}
        </p>

        <div className="w-full rounded-[var(--radius-card)] border border-dashed border-primary/40 bg-accent/50 p-5">
          <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            {t("flightRequest.referenceLabel")}
          </div>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span dir="ltr" className="text-h3 font-extrabold text-primary">
              {reference}
            </span>
            <button
              type="button"
              aria-label={t("flightRequest.copyReferenceAria")}
              onClick={() => {
                void navigator.clipboard.writeText(reference);
                toast.success(t("flightRequest.referenceCopied"));
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-brand-green text-small font-bold text-brand-green-foreground shadow-md transition hover:scale-[1.01]"
          >
            <MessageCircle className="h-5 w-5" /> {t("flightRequest.whatsappCta")}
          </a>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-small font-bold text-primary-foreground shadow-md transition hover:scale-[1.01]"
          >
            <Phone className="h-5 w-5" /> {t("flightRequest.callCta")}
          </a>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="text-small font-semibold text-primary hover:underline"
        >
          {t("flightRequest.newRequestCta")}
        </button>
      </div>
    </section>
  );
}
