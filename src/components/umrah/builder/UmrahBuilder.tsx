import { useEffect, useRef, useState } from "react";
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
  Phone,
  Plane,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { AirportCombobox } from "@/components/flights/AirportCombobox";
import { BuilderStepNavigation } from "@/components/common/BuilderStepNavigation";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { cn } from "@/lib/utils";
import { contactInfoQuery, packagesQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { submitCustomPackageRequest } from "@/lib/umrah-builder.functions";
import {
  BUDGET_LEVELS,
  CONTACT_PREFERENCES,
  MADINAH_AREAS,
  MAKKAH_AREAS,
  ROOM_TYPES,
  calculateTotalNights,
  earliestDepartureISO,
  latestDepartureISO,
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
  rebalanceNights,
  saveDraft,
  stepValid,
  totalTripNights,
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
  RouteVisualizer,
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

  const { data: officialPackages } = useQuery(packagesQuery("umrah"));
  const sortedOfficialTrips = (officialPackages ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [index, setIndex] = useState(0);
  /**
   * Highest step the visitor has validated. Going back to review an earlier
   * answer must not re-lock the steps they already completed, so the stepper
   * unlocks up to this marker rather than to the current index.
   */
  const [furthest, setFurthest] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ reference: string } | null>(null);
  /** Guards against a second submit slipping through before `sending` renders. */
  const inFlight = useRef(false);

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
        if (state.departureDate < earliestDepartureISO())
          return t("umrahBuilder.validation.datePast");
        if (state.departureDate > latestDepartureISO())
          return t("umrahBuilder.validation.dateHorizon");
        if (state.returnDate === state.departureDate) return t("umrahBuilder.validation.minStay");
        return t("umrahBuilder.validation.dateOrder");
      case "flights":
        if (
          state.flightPreference === "stopover" &&
          state.additionalDestination.trim().length < 2
        ) {
          return t("umrahBuilder.validation.destinationRequired");
        }
        return t("umrahBuilder.validation.flights");
      case "travellers":
        return t("umrahBuilder.validation.adults");
      case "makkah":
        if (state.makkahMode === "custom_hotel" && state.makkahHotelName.trim().length < 2) {
          return t("umrahBuilder.validation.hotelRequired");
        }
        return t("umrahBuilder.validation.stay");
      case "madinah":
        if (state.madinahMode === "custom_hotel" && state.madinahHotelName.trim().length < 2) {
          return t("umrahBuilder.validation.hotelRequired");
        }
        return t("umrahBuilder.validation.stay");
      case "room":
        if (!state.roomType) return t("umrahBuilder.validation.room");
        return t("umrahBuilder.validation.nights");
      case "contact":
        if (state.name.trim().length < 2) return t("umrahBuilder.validation.name");
        if (!/^[+()\d\s-]{6,32}$/.test(state.phone.trim()))
          return t("umrahBuilder.validation.phone");
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
      const next = index + 1;
      setIndex(next);
      setFurthest((f) => Math.max(f, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void send();
    }
  };

  const goBack = () => {
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  };

  /** Maps a server error onto a translated, actionable message. */
  function submitErrorMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    if (raw.includes("HOTEL_UNAVAILABLE")) return t("umrahBuilder.errors.hotelUnavailable");
    if (raw.includes("HOTEL_LOOKUP_FAILED")) return t("umrahBuilder.errors.hotelLookup");
    if (/too many requests|rate/i.test(raw)) return t("umrahBuilder.errors.rateLimited");
    return t("umrahBuilder.errors.submit");
  }

  async function send() {
    // Double-tap protection: the ref flips synchronously, before React re-renders
    // the disabled button, so a second tap cannot create a duplicate request.
    if (inFlight.current) return;
    inFlight.current = true;
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
          flightPreference: state.flightPreference || undefined,
          transitHub: state.transitHub?.trim() || undefined,
          additionalDestination: state.additionalDestination?.trim() || undefined,
          destinationTiming: state.destinationTiming || undefined,
          makkahNights: state.makkahNights,
          makkahHotelId: state.makkahHotelId,
          makkahHotelName: state.makkahHotelName?.trim() || undefined,
          makkahArea: state.makkahArea || undefined,
          makkahPreference: state.makkahPreference || undefined,
          madinahNights: state.madinahNights,
          madinahHotelId: state.madinahHotelId,
          madinahHotelName: state.madinahHotelName?.trim() || undefined,
          madinahArea: state.madinahArea || undefined,
          madinahPreference: state.madinahPreference || undefined,
          adults: state.adults,
          children: state.children,
          infants: state.infants,
          roomType: state.roomType || undefined,
          notes: state.notes.trim(),
        },
      });
      // Success is shown only after the row is persisted and a real reference
      // comes back. The draft is cleared only at that point, so a failed
      // submission always leaves the visitor's work intact.
      setResult({ reference: res.reference });
      clearDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[umrah-builder] submission failed", err);
      setError(submitErrorMessage(err));
    } finally {
      inFlight.current = false;
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

  const nights = totalTripNights(state);

  const currentStepSummary = (() => {
    switch (step) {
      case "dates":
        if (state.packageTitle) {
          return `${state.packageTitle} (14 ${t("umrahBuilder.summary.nights", "ليلة")})`;
        }
        if (state.departureDate && state.returnDate) {
          return `${state.departureDate} → ${state.returnDate} (${nights} ${t("umrahBuilder.summary.nights", "ليلة")})`;
        }
        return null;
      case "flights":
        if (state.flightPreference) {
          const prefLabel = t(`umrahBuilder.flights.preferences.${state.flightPreference}`);
          const route =
            state.departureAirport && state.returnAirport
              ? ` · ${state.departureAirport} → ${state.returnAirport}`
              : "";
          return `${prefLabel}${route}`;
        }
        return null;
      case "travellers":
        return `${state.adults} ${t("umrahBuilder.travellers.adults")}${
          state.children > 0 ? ` · ${state.children} ${t("umrahBuilder.travellers.children")}` : ""
        }${state.infants > 0 ? ` · ${state.infants} ${t("umrahBuilder.travellers.infants")}` : ""}`;
      case "makkah":
        if (state.makkahNights === 0) return t("umrahBuilder.stay.skipped", "تخطي مكة");
        if (state.makkahHotelName) {
          return `${state.makkahHotelName} (${state.makkahNights} ${t("umrahBuilder.summary.nights", "ليالٍ")})`;
        }
        if (state.makkahArea) {
          return `${areaLabel("makkah", state.makkahArea)} (${state.makkahNights} ${t("umrahBuilder.summary.nights", "ليالٍ")})`;
        }
        return null;
      case "madinah":
        if (state.madinahNights === 0) return t("umrahBuilder.stay.skipped", "تخطي المدينة");
        if (state.madinahHotelName) {
          return `${state.madinahHotelName} (${state.madinahNights} ${t("umrahBuilder.summary.nights", "ليالٍ")})`;
        }
        if (state.madinahArea) {
          return `${areaLabel("madinah", state.madinahArea)} (${state.madinahNights} ${t("umrahBuilder.summary.nights", "ليالٍ")})`;
        }
        return null;
      case "room":
        if (state.roomType) {
          return `${t("umrahBuilder.room.title", "الغرفة")}: ${roomLabel}`;
        }
        return null;
      case "contact":
        if (state.name.trim()) {
          return `${state.name.trim()}${state.phone.trim() ? ` · ${state.phone.trim()}` : ""}`;
        }
        return null;
      default:
        return null;
    }
  })();

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
            furthest={furthest}
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
              <StepShell
                title={t("umrahBuilder.dates.title")}
                subtitle={t("umrahBuilder.dates.subtitle")}
              >
                {sortedOfficialTrips.length > 0 && (
                  <div className="space-y-3 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-small font-bold text-foreground">
                        رحلات موسم العمرة الرسمي 2026–2027
                      </p>
                      <span className="text-caption font-semibold text-primary">
                        14 يوم (14 يوماً)
                      </span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {sortedOfficialTrips.map((pkg) => {
                        const isSelected =
                          state.packageId === pkg.id ||
                          (state.departureDate === pkg.departure_date &&
                            state.returnDate === pkg.return_date &&
                            state.flightRoute === pkg.flight_route);
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => {
                              const from = pkg.departure_date || "";
                              const to = pkg.return_date || "";
                              const isMadinahFirst = pkg.arrival_airport === "Madinah";
                              const m = isMadinahFirst ? 6 : 8;
                              const d = isMadinahFirst ? 8 : 6;

                              patch({
                                packageId: pkg.id,
                                packageTitle: pkg.title,
                                departureDate: from,
                                returnDate: to,
                                departureAirport: "TUN",
                                arrivalAirport: pkg.arrival_airport || "Jeddah",
                                returnAirport: pkg.departure_airport || "Madinah",
                                flightRoute: pkg.flight_route || "",
                                packagePrice: Number(pkg.price) || 0,
                                packageNotes: pkg.notes || "",
                                makkahNights: m,
                                madinahNights: d,
                              });
                            }}
                            className={cn(
                              "flex flex-col items-start p-3.5 rounded-2xl border text-start transition-all",
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40"
                                : "border-border-subtle bg-card hover:border-primary/40",
                            )}
                          >
                            <div className="flex w-full items-center justify-between gap-1">
                              <span className="text-small font-bold text-foreground">
                                {pkg.title}
                              </span>
                              <span className="text-caption font-bold text-primary">
                                {pkg.price} TND
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                              <span>
                                {pkg.departure_date} → {pkg.return_date}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-foreground/90">
                                {pkg.flight_route}
                              </span>
                            </div>
                            {pkg.notes && pkg.notes !== "-" && (
                              <span className="mt-1.5 inline-flex rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                {pkg.notes}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border-subtle" />
                      </div>
                      <span className="relative bg-card px-3 text-caption text-muted-foreground">
                        أو حدد تواريخ مخصصة بالتقويم
                      </span>
                    </div>
                  </div>
                )}

                <DateRangeField
                  from={state.departureDate}
                  to={state.returnDate}
                  onChange={(from, to) => {
                    const newTotal = calculateTotalNights(from, to);
                    if (newTotal > 0) {
                      const currentTotal = state.makkahNights + state.madinahNights;
                      let m = state.makkahNights;
                      let d = state.madinahNights;
                      if (currentTotal !== newTotal || m > newTotal) {
                        if (currentTotal > 0) {
                          m = Math.min(
                            newTotal,
                            Math.max(1, Math.round((state.makkahNights / currentTotal) * newTotal)),
                          );
                          d = newTotal - m;
                        } else {
                          m = Math.max(1, Math.ceil(newTotal * 0.6));
                          d = newTotal - m;
                        }
                      }
                      patch({
                        departureDate: from,
                        returnDate: to,
                        makkahNights: m,
                        madinahNights: d,
                      });
                    } else {
                      patch({ departureDate: from, returnDate: to });
                    }
                  }}
                  labelFrom={t("umrahBuilder.dates.from")}
                  labelTo={t("umrahBuilder.dates.to")}
                  placeholder={t("umrahBuilder.dates.placeholder")}
                />
                {nights > 0 && (
                  <div className="space-y-2">
                    <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-caption font-semibold text-primary">
                      <CalendarDays className="h-4 w-4" />
                      {t("umrahBuilder.dates.duration", { count: nights })}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {t("umrahBuilder.stay.allocationRule", { count: nights })}
                    </p>
                  </div>
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
                      /* Without this the custom-airport affordance rendered
                         `flightRequest.useCustom.undefined` — the Flights
                         rebuild made the prop required and this caller was
                         missed. */
                      direction="from"
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
                      direction="to"
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

                {/* Flight Itinerary Preference: Direct, Transit, Stopover */}
                <div className="space-y-4 border-t border-border-subtle pt-5">
                  <div className="space-y-1">
                    <h3 className="text-small font-bold text-foreground">
                      {t("umrahBuilder.flights.preferenceTitle")}
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {t("umrahBuilder.flights.preferenceSubtitle")}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <ChoiceCard
                      selected={state.flightPreference === "direct"}
                      icon={<Plane className="h-5 w-5" />}
                      title={t("umrahBuilder.flights.preferences.direct")}
                      description={t("umrahBuilder.flights.preferences.directDesc")}
                      onClick={() =>
                        patch({
                          flightPreference: "direct",
                          transitHub: "",
                          additionalDestination: "",
                        })
                      }
                    />
                    <ChoiceCard
                      selected={state.flightPreference === "transit"}
                      icon={<Compass className="h-5 w-5" />}
                      title={t("umrahBuilder.flights.preferences.transit")}
                      description={t("umrahBuilder.flights.preferences.transitDesc")}
                      onClick={() =>
                        patch({
                          flightPreference: "transit",
                          additionalDestination: "",
                        })
                      }
                    />
                    <ChoiceCard
                      selected={state.flightPreference === "stopover"}
                      icon={<Sparkles className="h-5 w-5" />}
                      title={t("umrahBuilder.flights.preferences.stopover")}
                      description={t("umrahBuilder.flights.preferences.stopoverDesc")}
                      onClick={() =>
                        patch({
                          flightPreference: "stopover",
                          transitHub: "",
                        })
                      }
                    />
                  </div>

                  {/* Transit Progressive Disclosure & Guidance */}
                  {state.flightPreference === "transit" && (
                    <div className="space-y-3.5 rounded-3xl border border-sky-200/60 bg-sky-50/50 p-5 dark:border-sky-900/40 dark:bg-sky-950/20">
                      <p className="text-caption font-semibold leading-relaxed text-sky-900 dark:text-sky-300">
                        {t("umrahBuilder.flights.differenceNote")}
                      </p>
                      <TextField
                        id="builder-transit-hub"
                        label={t("umrahBuilder.flights.transitHubLabel")}
                        placeholder={t("umrahBuilder.flights.transitHubPlaceholder")}
                        value={state.transitHub}
                        onChange={(transitHub) => patch({ transitHub })}
                      />
                    </div>
                  )}

                  {/* Stopover Progressive Disclosure & Guidance */}
                  {state.flightPreference === "stopover" && (
                    <div className="space-y-4 rounded-3xl border border-amber-200/60 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <p className="text-caption font-semibold leading-relaxed text-amber-900 dark:text-amber-300">
                        {t("umrahBuilder.flights.differenceNote")}
                      </p>
                      <TextField
                        id="builder-stopover-dest"
                        label={t("umrahBuilder.flights.stopoverCityLabel")}
                        placeholder={t("umrahBuilder.flights.stopoverCityPlaceholder")}
                        value={state.additionalDestination}
                        onChange={(additionalDestination) => patch({ additionalDestination })}
                        required
                      />

                      <div className="space-y-2">
                        <label className="text-caption font-semibold text-muted-foreground">
                          {t("umrahBuilder.flights.stopoverTimingLabel")}
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ChoiceCard
                            selected={state.destinationTiming === "after_umrah"}
                            title={t("umrahBuilder.flights.stopoverTiming.after_umrah")}
                            onClick={() => patch({ destinationTiming: "after_umrah" })}
                          />
                          <ChoiceCard
                            selected={state.destinationTiming === "before_umrah"}
                            title={t("umrahBuilder.flights.stopoverTiming.before_umrah")}
                            onClick={() => patch({ destinationTiming: "before_umrah" })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visual Itinerary Route Preview */}
                  <div className="space-y-2 rounded-2xl border border-border-subtle bg-surface-sunken/40 p-4">
                    <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
                      {t("umrahBuilder.flights.itineraryPreview")}
                    </p>
                    <RouteVisualizer state={state} />
                  </div>

                  <p className="text-caption text-muted-foreground">
                    {t("umrahBuilder.flights.note")}
                  </p>
                </div>
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
              <StepShell
                title={t("umrahBuilder.room.title")}
                subtitle={t("umrahBuilder.room.subtitle")}
              >
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
              <p
                role="alert"
                className="rounded-2xl bg-destructive/10 p-4 text-small text-destructive"
              >
                {error}
              </p>
            )}

            {/* Persistent Step Navigation */}
            <BuilderStepNavigation
              onBack={goBack}
              onNext={goNext}
              backDisabled={index === 0}
              nextDisabled={sending}
              isSubmitting={sending}
              isFinalStep={index === BUILDER_STEPS.length - 1}
              selectedSummary={currentStepSummary}
              className="sm:rounded-2xl sm:border sm:border-border-subtle sm:bottom-4"
            />
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

  const totalNights = totalTripNights(state);
  const nights = city === "makkah" ? state.makkahNights : state.madinahNights;
  const mode = city === "makkah" ? state.makkahMode : state.madinahMode;
  const hotelId = city === "makkah" ? state.makkahHotelId : state.madinahHotelId;
  const customHotelName = city === "makkah" ? state.makkahHotelName : state.madinahHotelName;
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

  const isHotelMode = mode === "hotel" || mode === "custom_hotel" || mode === "";

  return (
    <StepShell
      title={t(`umrahBuilder.${city}.title`)}
      subtitle={t(`umrahBuilder.${city}.subtitle`)}
    >
      {/* Night Allocation Summary Card */}
      <div className="space-y-3 rounded-3xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/70 pb-3">
          <div>
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {t("umrahBuilder.stay.totalTripLabel")}
            </span>
            <p className="text-body font-bold text-foreground">
              {totalNights > 0
                ? t("umrahBuilder.stay.totalTripNights", { count: totalNights })
                : t("umrahBuilder.summary.nightsCount", { count: nights })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-caption font-bold transition-colors",
                city === "makkah"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-sunken text-foreground/80",
              )}
            >
              {t("umrahBuilder.stay.makkahNightsSummary", { count: state.makkahNights })}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-caption font-bold transition-colors",
                city === "madinah"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-sunken text-foreground/80",
              )}
            >
              {t("umrahBuilder.stay.madinahNightsSummary", { count: state.madinahNights })}
            </span>
          </div>
        </div>

        <p className="text-caption leading-relaxed text-muted-foreground">
          {city === "makkah"
            ? t("umrahBuilder.stay.makkahHint")
            : t("umrahBuilder.stay.madinahHint")}
        </p>
      </div>

      <Counter
        label={t("umrahBuilder.stay.nights")}
        hint={t("umrahBuilder.stay.autoAdjusted")}
        value={nights}
        min={0}
        max={totalNights > 0 ? totalNights : 60}
        onChange={(v) => {
          if (totalNights > 0) {
            const balanced = rebalanceNights(totalNights, state.makkahNights, city, v);
            patch(balanced);
          } else {
            set({ nights: v });
          }
        }}
      />

      {nights === 0 ? (
        <p className="rounded-2xl bg-surface-sunken/60 p-4 text-small text-muted-foreground">
          {t("umrahBuilder.stay.skipped")}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              selected={isHotelMode}
              title={t("umrahBuilder.stay.modeHotel")}
              description={t("umrahBuilder.stay.modeHotelDesc")}
              onClick={() =>
                set({ mode: mode === "custom_hotel" ? "custom_hotel" : "hotel", area: "" })
              }
            />
            <ChoiceCard
              selected={mode === "area"}
              title={t("umrahBuilder.stay.modeArea")}
              description={t("umrahBuilder.stay.modeAreaDesc")}
              onClick={() => set({ mode: "area", hotelId: null, hotelName: "" })}
            />
          </div>

          {isHotelMode && (
            <HotelSelector
              city={city}
              selectedId={hotelId}
              customHotelName={customHotelName}
              mode={mode === "custom_hotel" ? "custom_hotel" : "hotel"}
              nights={nights}
              from={state.departureDate}
              to={state.returnDate}
              onSelect={(hotel, name) => set({ mode: "hotel", hotelId: hotel.id, hotelName: name })}
              onSelectCustom={(name) =>
                set({ mode: "custom_hotel", hotelId: null, hotelName: name })
              }
              onFallback={() => set({ mode: "area", hotelId: null, hotelName: "" })}
              onStaleSelection={() => set({ hotelId: null, hotelName: "" })}
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

  const whatsappNumber = (info?.find((c) => c.key === "whatsapp")?.value ?? "").replace(
    /[^\d]/g,
    "",
  );
  const phone = info?.find((c) => c.key === "phone" || c.key === "mobile")?.value ?? "";
  const message = buildWhatsAppMessage(state, t, {
    date: (v) => longDate(v),
    // City-aware: Makkah and Madinah use different area codes.
    area: (city, v) => (v ? t(`umrahBuilder.areas.${city}.${v}`, { defaultValue: v }) : ""),
    budget: (v) => (v ? t(`umrahBuilder.budgets.${v}`, { defaultValue: v }) : ""),
  });
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`${reference}\n\n${message}`)}`
    : null;

  const steps = [
    t("umrahBuilder.success.next.review"),
    t("umrahBuilder.success.next.contact"),
    t("umrahBuilder.success.next.offer"),
  ];

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

      {/* What happens next — ordered because the agency works through it in order. */}
      <div className="w-full rounded-3xl border border-border-subtle bg-card p-6 text-start">
        <h2 className="text-small font-bold">{t("umrahBuilder.success.next.title")}</h2>
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 break-words text-small text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {whatsappHref && (
          <Button asChild size="lg">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="me-2 h-5 w-5 shrink-0" />
              {t("umrahBuilder.success.whatsapp")}
            </a>
          </Button>
        )}
        {/* Always leave a way to reach the agency, even without WhatsApp configured. */}
        {phone && (
          <Button asChild variant={whatsappHref ? "outline" : "default"} size="lg">
            <a href={`tel:${phone.replace(/\s+/g, "")}`} dir="ltr">
              <Phone className="me-2 h-5 w-5 shrink-0" />
              {t("umrahBuilder.success.call")}
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
