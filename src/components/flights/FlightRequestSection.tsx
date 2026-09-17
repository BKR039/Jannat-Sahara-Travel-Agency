import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLang } from "@/lib/i18n";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Armchair,
  Loader2,
  CheckCircle2,
  Check,
  Copy,
  Phone,
  MessageCircle,
  ArrowLeftRight,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { AirportCombobox } from "./AirportCombobox";
import { DateField, parseISODate, startOfToday } from "./DateField";
import { RequestSummary } from "./RequestSummary";
import { EMPTY_DRAFT, type Draft } from "./model";
import { Stage, Panel, Field, controlClass, Segmented, Stepper } from "./parts";
import { submitFlightRequest } from "@/lib/flight-request.functions";
import {
  CABIN_CLASSES,
  FlightRequestInput,
  type FlightRequestInputType,
} from "@/lib/flight-request.schema";
import { cabinLabel } from "@/lib/flight-request.labels";
import { describeAirportValue } from "@/lib/airports";
import { contactInfoQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A validation failure in the traveller's own language.
 *
 * `FlightRequestInput` is shared with the server function, so its messages are
 * English wire strings — "Return date is required for round trips" was being
 * printed verbatim under an Arabic field. The schema is left exactly as it is
 * (it is the server's contract); only the presentation is translated here.
 *
 * The two return-date rules are told apart from the draft rather than from the
 * message text, so this does not depend on English strings it would then have
 * to match.
 */
function fieldErrorText(field: string, draft: Draft, t: (key: string) => string): string {
  if (field === "returnDate") {
    return !draft.returnDate
      ? t("flightRequest.fieldErrors.returnDateRequired")
      : t("flightRequest.fieldErrors.returnDateOrder");
  }
  const known = [
    "name",
    "phone",
    "email",
    "fromAirport",
    "toAirport",
    "departureDate",
    "adults",
    "notes",
  ];
  return t(`flightRequest.fieldErrors.${known.includes(field) ? field : "generic"}`);
}

export function FlightRequestSection() {
  const { t, i18n } = useTranslation();
  const { lang } = useLocalized();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
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

  /** Reverses the journey. Pure state swap — no validation semantics change. */
  const swapAirports = () =>
    setDraft((d) => ({ ...d, fromAirport: d.toAirport, toAirport: d.fromAirport }));

  const mutation = useMutation({
    mutationFn: async (payload: FlightRequestInputType) => submit({ data: payload }),
    onSuccess: (res) => {
      setReference(res.reference);
      setDraft(EMPTY_DRAFT);
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
        if (!next[key]) next[key] = fieldErrorText(key, draft, t);
      }
      setErrors(next);
      toast.error(t("flightRequest.errorValidation"));
      // Take the traveller to the first thing that needs fixing rather than
      // leaving them to hunt for it in a long page.
      const firstKey = Object.keys(next)[0];
      document
        .querySelector(`[data-field="${firstKey}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    mutation.mutate({ ...parsed.data, locale: normalizeLang(i18n.language) });
  }

  if (reference) {
    return (
      <SuccessPanel
        reference={reference}
        phone={phoneNumber}
        whatsapp={whatsapp}
        onNew={() => setReference(null)}
      />
    );
  }

  const from = describeAirportValue(draft.fromAirport, lang);
  const to = describeAirportValue(draft.toAirport, lang);
  const routeLabel = (a: typeof from) =>
    a.kind === "catalogue" ? a.city : a.kind === "custom" ? a.text : "";

  const journeyDone = from.kind !== "empty" && to.kind !== "empty";
  const journeySummary = journeyDone ? `${routeLabel(from)} → ${routeLabel(to)}` : undefined;

  const detailsDone = !!draft.departureDate && (draft.tripType === "one_way" || !!draft.returnDate);
  const contactDone =
    draft.name.trim().length >= 2 && draft.phone.trim().length >= 6 && draft.email.includes("@");

  const travellers = draft.adults + draft.children + draft.infants;
  const passengersLabel = t("flightRequest.passengersCount", { count: travellers });

  const outboundLeg = journeyDone ? `${routeLabel(from)} → ${routeLabel(to)}` : undefined;
  const inboundLeg = journeyDone ? `${routeLabel(to)} → ${routeLabel(from)}` : undefined;

  const cta = (
    <>
      <button
        type="submit"
        disabled={mutation.isPending}
        className={cn(
          "flex h-14 w-full items-center justify-center gap-3 rounded-button bg-gradient-sunrise",
          "text-body font-bold text-primary-foreground",
          "transition-[filter,box-shadow,transform] duration-base ease-standard",
          "hover:-translate-y-0.5 hover:shadow-brand-glow hover:brightness-[1.04]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:pointer-events-none disabled:opacity-70",
          "motion-reduce:transform-none motion-reduce:transition-none",
        )}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t("flightRequest.submitting")}
          </>
        ) : (
          t("flightRequest.submitLabel")
        )}
      </button>

      {/*
       * Reassurance, not marketing. Each line states something the flow
       * actually does: it is a request rather than a booking, a person
       * answers it, and the answer comes back on the contact details given
       * above. No ratings, no counts, no promises about price.
       */}
      <ul className="mt-4 space-y-2">
        {["noPayment", "teamReplies", "helpChoosing"].map((k) => (
          <li key={k} className="flex items-start gap-2 text-caption text-muted-foreground">
            <Check className="ds-icon-lead text-brand-green" aria-hidden="true" />
            <span>{t(`flightRequest.reassurance.${k}`)}</span>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:py-14">
      {/* ------------------------------- intro -------------------------------- */}
      <header className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
        <span className="inline-flex items-center gap-2 rounded-badge border border-primary/20 bg-accent/60 px-3.5 py-1.5 text-caption font-semibold text-primary">
          {t("flightRequest.badge")}
        </span>
        {/* Sized down from the previous display heading: on this page the
            journey card is the hero, not the sentence above it. */}
        <h1 className="mt-4 text-h3 leading-[1.35] text-foreground">
          {t("flightRequest.heading")}
        </h1>
        <p className="mt-3 text-body leading-relaxed text-muted-foreground">
          {t("flightRequest.subheading")}
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="ds-reveal">
        {/* ------------------------- 01 · the journey ------------------------- */}
        <Stage
          index={1}
          title={t("flightRequest.journeyTitle")}
          description={t("flightRequest.journeyDescription")}
          complete={journeyDone}
          completeSummary={journeySummary}
        >
          {/*
           * The featured surface of the page. Everything after it — dates,
           * travellers, cabin, contact — is detail about a journey described
           * here, so this is the one block that gets the large radius and the
           * warm tint.
           */}
          <Panel tinted className="p-4 sm:p-6">
            <Segmented
              ariaLabel={t("flightRequest.tripTypeAria")}
              value={draft.tripType}
              onChange={(v) => set("tripType", v)}
              options={[
                { value: "round_trip" as const, label: t("flightRequest.roundTrip") },
                { value: "one_way" as const, label: t("flightRequest.oneWay") },
              ]}
            />

            {/*
             * From and to read as one journey. At desktop the swap sits on the
             * axis between them; on mobile the two selectors stack and the
             * swap becomes the link in the chain, which keeps both fields at
             * full width instead of squeezing them side by side.
             */}
            <div className="relative mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end md:gap-4">
              <div data-field="fromAirport" className="min-w-0">
                <AirportCombobox
                  id="from-airport"
                  label={t("flightRequest.fromLabel")}
                  placeholder={t("flightRequest.fromPlaceholder")}
                  value={draft.fromAirport}
                  onChange={(v) => set("fromAirport", v)}
                  invalid={!!errors["fromAirport"]}
                  direction="from"
                />
                {errors["fromAirport"] && <FieldError>{errors["fromAirport"]}</FieldError>}
              </div>

              <button
                type="button"
                onClick={swapAirports}
                aria-label={t("flightRequest.swapAria")}
                className={cn(
                  "group mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                  "border border-border bg-surface text-primary",
                  "transition-[transform,border-color,background-color] duration-base ease-standard",
                  "hover:border-primary hover:bg-accent",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "motion-reduce:transition-none",
                  "md:mb-1",
                )}
              >
                {/* Horizontal at desktop, vertical when the fields stack —
                    the glyph matches the axis it actually swaps along. */}
                <ArrowLeftRight
                  className="hidden h-4 w-4 transition-transform duration-base ease-standard group-hover:rotate-180 motion-reduce:transition-none md:block"
                  aria-hidden="true"
                />
                <ArrowUpDown
                  className="h-4 w-4 transition-transform duration-base ease-standard group-hover:rotate-180 motion-reduce:transition-none md:hidden"
                  aria-hidden="true"
                />
              </button>

              <div data-field="toAirport" className="min-w-0">
                <AirportCombobox
                  id="to-airport"
                  label={t("flightRequest.toLabel")}
                  placeholder={t("flightRequest.toPlaceholder")}
                  value={draft.toAirport}
                  onChange={(v) => set("toAirport", v)}
                  invalid={!!errors["toAirport"]}
                  direction="to"
                />
                {errors["toAirport"] && <FieldError>{errors["toAirport"]}</FieldError>}
              </div>
            </div>
          </Panel>
        </Stage>

        {/* ---------------- main column + sticky summary aside ---------------- */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-8">
            {/* --------------------- 02 · travel details -------------------- */}
            <Stage
              index={2}
              title={t("flightRequest.detailsTitle")}
              description={t("flightRequest.detailsDescription")}
              complete={detailsDone}
              completeSummary={
                detailsDone
                  ? passengersLabel + " · " + cabinLabel(draft.cabinClass, lang)
                  : undefined
              }
            >
              <Panel className="space-y-5 p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div data-field="departureDate">
                    <DateField
                      id="departure-date"
                      label={t("flightRequest.departureLabel")}
                      value={draft.departureDate}
                      onChange={(iso) => {
                        set("departureDate", iso);
                        // A return earlier than the new departure is no longer
                        // a valid answer, so it is cleared rather than left to
                        // fail validation later.
                        if (draft.returnDate && draft.returnDate < iso) set("returnDate", "");
                      }}
                      min={startOfToday()}
                      legend={outboundLeg}
                      invalid={!!errors["departureDate"]}
                    />
                    {errors["departureDate"] && <FieldError>{errors["departureDate"]}</FieldError>}
                  </div>

                  {draft.tripType === "round_trip" && (
                    <div data-field="returnDate" className="ds-reveal">
                      <DateField
                        id="return-date"
                        label={t("flightRequest.returnLabel")}
                        value={draft.returnDate}
                        onChange={(iso) => set("returnDate", iso)}
                        min={parseISODate(draft.departureDate) ?? startOfToday()}
                        legend={inboundLeg}
                        invalid={!!errors["returnDate"]}
                      />
                      {errors["returnDate"] && <FieldError>{errors["returnDate"]}</FieldError>}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* ------------------------ travellers ------------------- */}
                  <Field
                    label={t("flightRequest.passengersFieldLabel")}
                    htmlFor="passengers"
                    error={errors["adults"]}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          id="passengers"
                          type="button"
                          className={controlClass(
                            !!errors["adults"],
                            "flex items-center justify-between gap-3 text-start hover:border-primary/50",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Users
                              className="h-5 w-5 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">{passengersLabel}</span>
                          </span>
                          <ChevronDown
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-4">
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

                  {/* -------------------------- cabin ---------------------- */}
                  <Field label={t("flightRequest.cabinLabel")} htmlFor="cabin-class">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          id="cabin-class"
                          type="button"
                          className={controlClass(
                            false,
                            "flex items-center justify-between gap-3 text-start hover:border-primary/50",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Armchair
                              className="h-5 w-5 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {cabinLabel(draft.cabinClass, i18n.language)}
                            </span>
                          </span>
                          <ChevronDown
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[min(20rem,calc(100vw-2rem))] p-1.5"
                      >
                        {/* Only the four classes the schema accepts. */}
                        <ul role="listbox" aria-label={t("flightRequest.cabinLabel")}>
                          {CABIN_CLASSES.map((c) => {
                            const active = c === draft.cabinClass;
                            return (
                              <li key={c}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  onClick={() => set("cabinClass", c)}
                                  className={cn(
                                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-input px-3 text-start",
                                    "text-small font-medium transition-colors duration-fast",
                                    active
                                      ? "bg-accent text-primary"
                                      : "text-foreground hover:bg-muted",
                                  )}
                                >
                                  {cabinLabel(c, i18n.language)}
                                  {active && (
                                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </Field>
                </div>
              </Panel>
            </Stage>

            {/* ----------------------- 03 · contact ------------------------ */}
            <Stage
              index={3}
              title={t("flightRequest.contactDetailsTitle")}
              description={t("flightRequest.contactDescription")}
              complete={contactDone}
              completeSummary={contactDone ? draft.name.trim() : undefined}
            >
              <Panel className="space-y-4 p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t("flightRequest.nameLabel")}
                    htmlFor="req-name"
                    error={errors["name"]}
                    className="sm:col-span-2"
                  >
                    <input
                      id="req-name"
                      data-field="name"
                      name="name"
                      autoComplete="name"
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder={t("flightRequest.namePlaceholder")}
                      aria-invalid={!!errors["name"]}
                      className={controlClass(!!errors["name"])}
                    />
                  </Field>

                  <Field
                    label={t("flightRequest.phoneLabel")}
                    htmlFor="req-phone"
                    error={errors["phone"]}
                  >
                    <input
                      id="req-phone"
                      data-field="phone"
                      name="tel"
                      type="tel"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      value={draft.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+216 00 000 000"
                      aria-invalid={!!errors["phone"]}
                      className={controlClass(!!errors["phone"])}
                    />
                  </Field>

                  <Field
                    label={t("flightRequest.emailLabel")}
                    htmlFor="req-email"
                    error={errors["email"]}
                  >
                    <input
                      id="req-email"
                      data-field="email"
                      name="email"
                      type="email"
                      dir="ltr"
                      inputMode="email"
                      autoComplete="email"
                      value={draft.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="name@email.com"
                      aria-invalid={!!errors["email"]}
                      className={controlClass(!!errors["email"])}
                    />
                  </Field>
                </div>

                <Field
                  label={t("flightRequest.notesLabel")}
                  htmlFor="req-notes"
                  error={errors["notes"]}
                >
                  <textarea
                    id="req-notes"
                    data-field="notes"
                    rows={3}
                    value={draft.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder={t("flightRequest.notesPlaceholder")}
                    className="w-full rounded-input border border-border bg-surface p-4 text-body text-foreground transition-[border-color,box-shadow] duration-fast ease-standard placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </Field>
              </Panel>
            </Stage>

            {/* The summary and CTA travel with the content on small screens;
                the aside below takes over from `lg`. */}
            <div className="lg:hidden">
              <RequestSummary draft={draft} />
              <div className="mt-5">{cta}</div>
            </div>
          </div>

          {/* --------------------------- desktop aside ------------------------ */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <RequestSummary draft={draft} />
              <div className="mt-5">{cta}</div>
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-caption font-medium text-destructive">
      {children}
    </p>
  );
}

/**
 * The booking area after a successful submission.
 *
 * The form is replaced rather than left standing behind a toast: the request
 * has been sent, so the only things that matter now are the reference the
 * server returned and how the agency will get back in touch.
 */
function SuccessPanel({
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
    <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 md:py-20">
      <div className="ds-reveal flex flex-col items-center gap-5 rounded-card-lg border border-border-subtle bg-surface p-6 text-center sm:p-10">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-mint-muted text-brand-green">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-h4 leading-snug text-foreground">
            {t("flightRequest.successTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-body leading-relaxed text-muted-foreground">
            {t("flightRequest.successDesc")}
          </p>
        </div>

        {/* The reference the server actually returned — never generated here. */}
        <div className="w-full rounded-card border border-dashed border-primary/40 bg-accent/50 p-5">
          <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            {t("flightRequest.referenceLabel")}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span dir="ltr" className="text-h4 font-extrabold tracking-wide text-primary">
              {reference}
            </span>
            <button
              type="button"
              aria-label={t("flightRequest.copyReferenceAria")}
              onClick={() => {
                void navigator.clipboard.writeText(reference);
                toast.success(t("flightRequest.referenceCopied"));
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle text-muted-foreground transition-colors duration-fast hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-button bg-brand-green text-small font-bold text-brand-green-foreground transition-transform duration-base ease-standard hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            {t("flightRequest.whatsappCta")}
          </a>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-button bg-gradient-sunrise text-small font-bold text-primary-foreground transition-transform duration-base ease-standard hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            {t("flightRequest.callCta")}
          </a>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="min-h-11 text-small font-semibold text-primary hover:underline"
        >
          {t("flightRequest.newRequestCta")}
        </button>
      </div>
    </section>
  );
}
