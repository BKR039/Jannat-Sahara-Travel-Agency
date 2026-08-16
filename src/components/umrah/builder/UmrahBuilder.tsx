import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Compass,
  MessageCircle,
  Plane,
  Send,
  Users,
} from "lucide-react";
import { AirportCombobox } from "@/components/flights/AirportCombobox";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { contactInfoQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { submitCustomPackageRequest } from "@/lib/umrah-builder.functions";
import {
  BUDGET_LEVELS,
  CONTACT_PREFERENCES,
  MADINAH_AREAS,
  MAKKAH_AREAS,
  ROOM_TYPES,
  type BudgetLevel,
  type ContactPreference,
  type RoomType,
} from "@/lib/umrah-builder.schema";
import {
  BUILDER_STEPS,
  INITIAL_STATE,
  buildWhatsAppMessage,
  clearDraft,
  loadDraft,
  saveDraft,
  stepValid,
  travellersTotal,
  tripDays,
  type BuilderState,
  type BuilderStep,
} from "./model";
import {
  BuilderStepper,
  ChoiceCard,
  Counter,
  DateRangeField,
  StepShell,
  SummaryBody,
  SummaryPanel,
  TextField,
} from "./parts";
import { HotelSelector } from "./HotelSelector";

const STEP_ICON: Record<BuilderStep, typeof CalendarDays> = {
  dates: CalendarDays,
  flights: Plane,
  travellers: Users,
  makkah: Compass,
  madinah: Compass,
  room: BedDouble,
  contact: Send,
};

export function UmrahBuilder() {
  const { t } = useTranslation();
  const { lang, L } = useLocalized();
  const submit = useServerFn(submitCustomPackageRequest);

  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ reference: string } | null>(null);

  // Draft restore happens after hydration so SSR markup stays stable.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) setState(draft);
  }, []);
  useEffect(() => {
    saveDraft(state);
  }, [state]);

  const step = BUILDER_STEPS[index]!;
  const patch = (next: Partial<BuilderState>) => {
    setError(null);
    setState((prev) => ({ ...prev, ...next }));
  };

  const areaLabel = (city: "makkah" | "madinah", code: string) =>
    code ? t(`umrahBuilder.areas.${city}.${code}`) : "";
  const budgetLabel = (code: string) => (code ? t(`umrahBuilder.budgets.${code}`) : "");
  const roomLabel = state.roomType ? t(`umrahBuilder.room.types.${state.roomType}`) : "";

  const stepError = (s: BuilderStep): string => {
    switch (s) {
      case "dates":
        if (!state.departureDate || !state.returnDate) return t("umrahBuilder.validation.dates");
        return t("umrahBuilder.validation.dateOrder");
      case "flights":
        return t("umrahBuilder.validation.flights");
      case "travellers":
        return t("umrahBuilder.validation.adults");
      case "makkah":
      case "madinah":
        return t("umrahBuilder.validation.stay");
      case "room":
        if (!state.roomType) return t("umrahBuilder.validation.room");
        return t("umrahBuilder.validation.nights");
      case "contact":
        if (state.name.trim().length < 2) return t("umrahBuilder.validation.name");
        if (!/^[+()\d\s-]{6,32}$/.test(state.phone.trim())) return t("umrahBuilder.validation.phone");
        return t("umrahBuilder.validation.email");
    }
  };

  const goNext = () => {
    if (!stepValid(step, state)) {
      setError(stepError(step));
      return;
    }
    setError(null);
    if (index < BUILDER_STEPS.length - 1) {
      setIndex(index + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void send();
    }
  };

  const goBack = () => {
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  };

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await submit({
        data: {
          name: state.name.trim(),
          phone: state.phone.trim(),
          email: state.email.trim(),
          whatsapp: state.whatsapp.trim(),
          contactPreference: state.contactPreference || undefined,
          locale: lang,
          departureDate: state.departureDate,
          returnDate: state.returnDate,
          departureAirport: state.departureAirport,
          returnAirport: state.returnAirport,
          airportFlexible: state.airportFlexible,
          makkahNights: state.makkahNights,
          makkahHotelId: state.makkahHotelId,
          makkahArea: state.makkahArea || undefined,
          makkahPreference: state.makkahPreference || undefined,
          madinahNights: state.madinahNights,
          madinahHotelId: state.madinahHotelId,
          madinahArea: state.madinahArea || undefined,
          madinahPreference: state.madinahPreference || undefined,
          adults: state.adults,
          children: state.children,
          infants: state.infants,
          roomType: state.roomType || undefined,
          notes: state.notes.trim(),
        },
      });
      setResult({ reference: res.reference });
      clearDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(t("umrahBuilder.errors.submit"));
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <SiteLayout>
        <SuccessScreen state={state} reference={result.reference} />
      </SiteLayout>
    );
  }

  const nights = tripDays(state.departureDate, state.returnDate) - 1;

  return (
    <SiteLayout>
      <section className="bg-gradient-oasis-night">
        <div className="mx-auto max-w-7xl px-4 py-12 text-on-dark md:px-6 md:py-16">
          <span className="rounded-full border border-on-dark/30 bg-on-dark/10 px-4 py-1 text-caption font-semibold">
            {t("umrahBuilder.hero.badge")}
          </span>
          <h1 className="mt-3 text-h1">{t("umrahBuilder.hero.title")}</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-dark/90">
            {t("umrahBuilder.hero.subtitle")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6 space-y-3">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            {t("umrahBuilder.nav.progress", { current: index + 1, total: BUILDER_STEPS.length })}
          </p>
          <BuilderStepper
            steps={BUILDER_STEPS}
            current={index}
            onSelect={setIndex}
            labels={
              Object.fromEntries(
                BUILDER_STEPS.map((s) => [s, t(`umrahBuilder.steps.${s}`)]),
              ) as Record<BuilderStep, string>
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            {step === "dates" && (
              <StepShell title={t("umrahBuilder.dates.title")} subtitle={t("umrahBuilder.dates.subtitle")}>
                <DateRangeField
                  from={state.departureDate}
                  to={state.returnDate}
                  onChange={(from, to) => patch({ departureDate: from, returnDate: to })}
                  labelFrom={t("umrahBuilder.dates.from")}
                  labelTo={t("umrahBuilder.dates.to")}
                  placeholder={t("umrahBuilder.dates.placeholder")}
                />
                {nights > 0 && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-caption font-semibold text-primary">
                    <CalendarDays className="h-4 w-4" />
                    {t("umrahBuilder.dates.duration", { count: nights })}
                  </p>
                )}
              </StepShell>
            )}

            {step === "flights" && (
              <StepShell
                title={t("umrahBuilder.flights.title")}
                subtitle={t("umrahBuilder.flights.subtitle")}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <AirportCombobox
                      id="builder-from"
                      label={t("umrahBuilder.flights.departure")}
                      placeholder={t("umrahBuilder.flights.placeholder")}
                      value={state.departureAirport}
                      onChange={(v) => patch({ departureAirport: v, airportFlexible: false })}
                    />
                    <p className="text-caption text-muted-foreground">
                      {t("umrahBuilder.flights.departureHint")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <AirportCombobox
                      id="builder-to"
                      label={t("umrahBuilder.flights.return")}
                      placeholder={t("umrahBuilder.flights.placeholder")}
                      value={state.returnAirport}
                      onChange={(v) => patch({ returnAirport: v, airportFlexible: false })}
                    />
                    <p className="text-caption text-muted-foreground">
                      {t("umrahBuilder.flights.returnHint")}
                    </p>
                  </div>
                </div>
                <ChoiceCard
                  selected={state.airportFlexible}
                  icon={<Compass className="h-5 w-5" />}
                  title={t("umrahBuilder.flights.flexibleTitle")}
                  description={t("umrahBuilder.flights.flexibleDesc")}
                  onClick={() =>
                    patch({
                      airportFlexible: !state.airportFlexible,
                      departureAirport: "",
                      returnAirport: "",
                    })
                  }
                />
                <p className="text-caption text-muted-foreground">{t("umrahBuilder.flights.note")}</p>
              </StepShell>
            )}

            {step === "travellers" && (
              <StepShell
                title={t("umrahBuilder.travellers.title")}
                subtitle={t("umrahBuilder.travellers.subtitle")}
              >
                <div className="space-y-3">
                  <Counter
                    label={t("umrahBuilder.travellers.adults")}
                    hint={t("umrahBuilder.travellers.adultsHint")}
                    value={state.adults}
                    min={1}
                    onChange={(adults) => patch({ adults })}
                  />
                  <Counter
                    label={t("umrahBuilder.travellers.children")}
                    hint={t("umrahBuilder.travellers.childrenHint")}
                    value={state.children}
                    onChange={(children) => patch({ children })}
                  />
                  <Counter
                    label={t("umrahBuilder.travellers.infants")}
                    hint={t("umrahBuilder.travellers.infantsHint")}
                    value={state.infants}
                    onChange={(infants) => patch({ infants })}
                  />
                </div>
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-caption font-semibold text-primary">
                  <Users className="h-4 w-4" />
                  {t("umrahBuilder.travellers.total", { count: travellersTotal(state) })}
                </p>
              </StepShell>
            )}

            {(step === "makkah" || step === "madinah") && (
              <StayStep
                key={step}
                city={step}
                state={state}
                patch={patch}
                areaLabel={areaLabel}
                budgetLabel={budgetLabel}
              />
            )}

            {step === "room" && (
              <StepShell title={t("umrahBuilder.room.title")} subtitle={t("umrahBuilder.room.subtitle")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROOM_TYPES.map((type) => (
                    <ChoiceCard
                      key={type}
                      selected={state.roomType === type}
                      icon={<BedDouble className="h-5 w-5" />}
                      title={t(`umrahBuilder.room.types.${type}`)}
                      onClick={() => patch({ roomType: type as RoomType })}
                    />
                  ))}
                </div>
              </StepShell>
            )}

            {step === "contact" && (
              <StepShell
                title={t("umrahBuilder.contact.title")}
                subtitle={t("umrahBuilder.contact.subtitle")}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="builder-name"
                    label={t("umrahBuilder.contact.name")}
                    value={state.name}
                    onChange={(name) => patch({ name })}
                    required
                  />
                  <TextField
                    id="builder-phone"
                    label={t("umrahBuilder.contact.phone")}
                    value={state.phone}
                    onChange={(phone) => patch({ phone })}
                    type="tel"
                    inputMode="tel"
                    required
                  />
                  <TextField
                    id="builder-whatsapp"
                    label={t("umrahBuilder.contact.whatsapp")}
                    value={state.whatsapp}
                    onChange={(whatsapp) => patch({ whatsapp })}
                    type="tel"
                    inputMode="tel"
                  />
                  <TextField
                    id="builder-email"
                    label={t("umrahBuilder.contact.email")}
                    value={state.email}
                    onChange={(email) => patch({ email })}
                    type="email"
                    inputMode="email"
                  />
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-caption font-semibold text-muted-foreground">
                    {t("umrahBuilder.contact.preference")}
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {CONTACT_PREFERENCES.map((pref) => (
                      <ChoiceCard
                        key={pref}
                        selected={state.contactPreference === pref}
                        title={t(`umrahBuilder.contact.preferences.${pref}`)}
                        onClick={() => patch({ contactPreference: pref as ContactPreference })}
                      />
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-1.5">
                  <label
                    htmlFor="builder-notes"
                    className="text-caption font-semibold text-muted-foreground"
                  >
                    {t("umrahBuilder.contact.notes")}
                  </label>
                  <textarea
                    id="builder-notes"
                    rows={4}
                    value={state.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    placeholder={t("umrahBuilder.contact.notesPlaceholder")}
                    className="w-full rounded-2xl border border-border-subtle bg-card p-4 text-small outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              </StepShell>
            )}

            {error && (
              <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-small text-destructive">
                {error}
              </p>
            )}

            {/* Desktop navigation */}
            <div className="hidden items-center justify-between gap-3 sm:flex">
              <Button variant="outline" onClick={goBack} disabled={index === 0}>
                <ArrowLeft className="me-2 h-4 w-4 rtl:-scale-x-100" />
                {t("umrahBuilder.nav.back")}
              </Button>
              <Button onClick={goNext} disabled={sending} size="lg">
                {index === BUILDER_STEPS.length - 1
                  ? sending
                    ? t("umrahBuilder.nav.submitting")
                    : t("umrahBuilder.nav.submit")
                  : t("umrahBuilder.nav.next")}
                <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>

          <SummaryPanel>
            <SummaryBody
              state={state}
              areaLabel={areaLabel}
              budgetLabel={budgetLabel}
              roomLabel={roomLabel}
            />
            <p className="mt-3 rounded-2xl bg-primary/10 p-3 text-caption font-semibold text-primary">
              {t("umrahBuilder.summary.noPrice")}
            </p>
          </SummaryPanel>
        </div>
      </div>

      {/* Mobile sticky navigation */}
      <div className="sticky bottom-0 z-30 border-t border-border-subtle bg-card/95 p-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack} disabled={index === 0} className="min-h-11">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            <span className="sr-only">{t("umrahBuilder.nav.back")}</span>
          </Button>
          <Button onClick={goNext} disabled={sending} className="min-h-11 flex-1">
            {index === BUILDER_STEPS.length - 1
              ? sending
                ? t("umrahBuilder.nav.submitting")
                : t("umrahBuilder.nav.submit")
              : t("umrahBuilder.nav.next")}
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}

/* ------------------------------------------------------------- stay step */

function StayStep({
  city,
  state,
  patch,
  areaLabel,
  budgetLabel,
}: {
  city: "makkah" | "madinah";
  state: BuilderState;
  patch: (next: Partial<BuilderState>) => void;
  areaLabel: (city: "makkah" | "madinah", code: string) => string;
  budgetLabel: (code: string) => string;
}) {
  const { t } = useTranslation();

  const nights = city === "makkah" ? state.makkahNights : state.madinahNights;
  const mode = city === "makkah" ? state.makkahMode : state.madinahMode;
  const hotelId = city === "makkah" ? state.makkahHotelId : state.madinahHotelId;
  const area = city === "makkah" ? state.makkahArea : state.madinahArea;
  const preference = city === "makkah" ? state.makkahPreference : state.madinahPreference;
  const areas = city === "makkah" ? MAKKAH_AREAS : MADINAH_AREAS;

  const set = (next: Record<string, unknown>) => {
    const prefixed: Record<string, unknown> = {};
    Object.entries(next).forEach(([k, v]) => {
      prefixed[`${city}${k[0]!.toUpperCase()}${k.slice(1)}`] = v;
    });
    patch(prefixed as Partial<BuilderState>);
  };

  return (
    <StepShell title={t(`umrahBuilder.${city}.title`)} subtitle={t(`umrahBuilder.${city}.subtitle`)}>
      <Counter
        label={t("umrahBuilder.stay.nights")}
        hint={t("umrahBuilder.stay.nightsHint")}
        value={nights}
        min={0}
        max={60}
        onChange={(v) => set({ nights: v })}
      />

      {nights === 0 ? (
        <p className="rounded-2xl bg-surface-sunken/60 p-4 text-small text-muted-foreground">
          {t("umrahBuilder.stay.skipped")}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              selected={mode === "hotel"}
              title={t("umrahBuilder.stay.modeHotel")}
              description={t("umrahBuilder.stay.modeHotelDesc")}
              onClick={() => set({ mode: "hotel", area: "" })}
            />
            <ChoiceCard
              selected={mode === "area"}
              title={t("umrahBuilder.stay.modeArea")}
              description={t("umrahBuilder.stay.modeAreaDesc")}
              onClick={() => set({ mode: "area", hotelId: null, hotelName: "" })}
            />
          </div>

          {mode === "hotel" && (
            <HotelSelector
              city={city}
              selectedId={hotelId}
              onSelect={(hotel, name) => set({ hotelId: hotel.id, hotelName: name })}
              onFallback={() => set({ mode: "area", hotelId: null, hotelName: "" })}
            />
          )}

          {mode === "area" && (
            <div className="space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-caption font-semibold text-muted-foreground">
                  {t("umrahBuilder.stay.areaLabel")}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {areas.map((code) => (
                    <ChoiceCard
                      key={code}
                      selected={area === code}
                      title={areaLabel(city, code)}
                      onClick={() => set({ area: code })}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-caption font-semibold text-muted-foreground">
                  {t("umrahBuilder.stay.budgetLabel")}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {BUDGET_LEVELS.map((level) => (
                    <ChoiceCard
                      key={level}
                      selected={preference === level}
                      title={budgetLabel(level)}
                      onClick={() => set({ preference: level as BudgetLevel })}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </>
      )}
    </StepShell>
  );
}

/* --------------------------------------------------------- success screen */

function SuccessScreen({ state, reference }: { state: BuilderState; reference: string }) {
  const { t } = useTranslation();
  const { longDate } = useLocalized();
  const { data: info } = useQuery(contactInfoQuery());

  const whatsappNumber = (info?.find((c) => c.key === "whatsapp")?.value ?? "").replace(/[^\d]/g, "");
  const message = buildWhatsAppMessage(state, t, {
    date: (v) => longDate(v),
    area: (v) => (v ? t(`umrahBuilder.areas.makkah.${v}`, { defaultValue: v }) : ""),
    budget: (v) => (v ? t(`umrahBuilder.budgets.${v}`, { defaultValue: v }) : ""),
  });
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`${reference}\n\n${message}`)}`
    : null;

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-20 text-center md:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </span>
      <h1 className="text-h2">{t("umrahBuilder.success.title")}</h1>
      <p className="text-body text-muted-foreground">{t("umrahBuilder.success.subtitle")}</p>
      <p className="rounded-full bg-surface-sunken px-5 py-2 text-small font-bold tracking-wide">
        {t("umrahBuilder.success.reference")}: {reference}
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {whatsappHref && (
          <Button asChild size="lg">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="me-2 h-5 w-5" />
              {t("umrahBuilder.success.whatsapp")}
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link to="/umrah">{t("umrahBuilder.success.back")}</Link>
        </Button>
      </div>
    </section>
  );
}

export { STEP_ICON };
