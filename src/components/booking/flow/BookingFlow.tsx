import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { normalizeLang } from "@/lib/i18n";
import { ArrowLeft, ArrowRight, Compass, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { packageBySlugQuery, type Package } from "@/lib/queries";
import { submitBooking } from "@/lib/booking.functions";
import { useLocalized } from "@/lib/localize";
import { computeTotal, money, syncPassengers, type Counts, type Passenger } from "./model";
import { CounterRow, PassengerForm, PassportUpload, StepIndicator, SummaryPanel } from "./parts";
import { BuilderStepNavigation } from "@/components/common/BuilderStepNavigation";

const DRAFT_KEY = "janat-booking-draft-v2";

interface Draft {
  slug: string;
  step: number;
  counts: Counts;
  passengers: Passenger[];
  communication: string;
  notes: string;
}

interface Props {
  packageSlug?: string | null;
}

export function BookingFlow({ packageSlug = null }: Props) {
  const { t, i18n } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const submit = useServerFn(submitBooking);
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Counts>({ adults: 1, children: 0, infants: 0 });
  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    syncPassengers([], { adults: 1, children: 0, infants: 0 }),
  );
  const [communication, setCommunication] = useState("phone");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const pkgQuery = useQuery({
    ...packageBySlugQuery(packageSlug ?? ""),
    enabled: Boolean(packageSlug),
  });
  const selectedPackage: Package | null = pkgQuery.data ?? null;
  const total = computeTotal(selectedPackage, counts);

  /* ---------- draft restore (scoped to this package) */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw && packageSlug) {
        const d = JSON.parse(raw) as Draft;
        if (d?.slug === packageSlug && Array.isArray(d.passengers) && d.passengers.length) {
          setStep(Math.min(d.step ?? 0, 2));
          setCounts(d.counts ?? { adults: 1, children: 0, infants: 0 });
          setPassengers(d.passengers);
          setCommunication(d.communication ?? "phone");
          setNotes(d.notes ?? "");
        }
      }
    } catch {
      /* ignore malformed drafts */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- draft autosave */
  useEffect(() => {
    if (!hydrated || !packageSlug) return;
    const draft: Draft = { slug: packageSlug, step, counts, passengers, communication, notes };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full or unavailable */
    }
  }, [hydrated, packageSlug, step, counts, passengers, communication, notes]);

  /* ---------- keep passenger forms in sync with counts */
  useEffect(() => {
    setPassengers((list) => syncPassengers(list, counts));
  }, [counts]);

  const steps = [
    t("bookingFlow.steps.details"),
    t("bookingFlow.steps.passports"),
    t("bookingFlow.steps.review"),
  ];

  const goTo = useCallback((i: number) => {
    setStep(i);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const departure = useMemo(
    () =>
      selectedPackage?.departure_date
        ? new Date(selectedPackage.departure_date).toLocaleDateString(i18n.language, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : null,
    [selectedPackage, i18n.language],
  );

  function validate(current: number): boolean {
    if (current === 0) {
      if (passengers.some((p) => !p.fullName.trim())) {
        toast.error(t("bookingFlow.errors.passengerName"));
        return false;
      }
      const primary = passengers[0];
      if (!primary?.phone.trim() || !primary?.email.trim()) {
        toast.error(t("bookingFlow.errors.primaryContact"));
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validate(step)) return;
    goTo(Math.min(2, step + 1));
  }

  function updatePassenger(id: string, patch: Partial<Passenger>) {
    setPassengers((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function onConfirm() {
    if (submitting) return;
    if (!terms) {
      toast.error(t("bookingFlow.errors.terms"));
      return;
    }
    if (!validate(0) || !selectedPackage) return;

    setSubmitting(true);
    try {
      const result = await submit({
        data: {
          packageId: selectedPackage.id,
          packageTitle: selectedPackage.title,
          packageCategory: selectedPackage.category,
          adults: counts.adults,
          children: counts.children,
          infants: counts.infants,
          totalPrice: total,
          currency: selectedPackage.currency,
          communicationPreference: communication,
          locale: normalizeLang(i18n.language),
          notes: notes.trim() || null,
          passengers: passengers.map((p, i) => ({
            type: p.type,
            isPrimary: i === 0,
            fullName: p.fullName.trim(),
            gender: p.gender || null,
            phone: i === 0 ? p.phone.trim() : null,
            email: i === 0 ? p.email.trim() : null,
            passportPath: p.passportPath,
            notes: p.notes.trim() || null,
          })),
        },
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      navigate({ to: "/booking-success", search: { id: result.id } });
    } catch (err) {
      console.error(err);
      toast.error(t("bookingFlow.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- no package chosen: send the user back to browsing */
  if (!packageSlug || (!pkgQuery.isLoading && !selectedPackage)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-h2 font-extrabold">{t("bookingFlow.missing.title")}</h1>
        <p className="mt-3 text-body text-muted-foreground">{t("bookingFlow.missing.desc")}</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/" hash="packages">
            {t("bookingFlow.missing.cta")}
          </Link>
        </Button>
      </div>
    );
  }

  if (pkgQuery.isLoading) {
    return <BookingFlowSkeleton />;
  }

  return (
    <div ref={topRef} className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-12 pb-36 sm:pb-24">
      <header className="mb-6 max-w-2xl sm:mb-8">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          {t("bookingFlow.eyebrow")}
        </p>
        <h1 className="mt-2 text-h1 font-extrabold">{t("bookingFlow.title")}</h1>
        <p className="mt-2 text-body text-muted-foreground sm:mt-3">{t("bookingFlow.subtitle")}</p>
      </header>

      <div className="mb-8 sm:mb-10">
        <StepIndicator steps={steps} current={step} onJump={goTo} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* ---------------- selected package (chosen on the landing page) */}
          {selectedPackage && (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-card shadow-sm transition-shadow duration-base sm:flex sm:items-center sm:gap-4 sm:p-4">
              {selectedPackage.cover && (
                <div className="relative aspect-[21/9] w-full overflow-hidden bg-surface-sunken sm:aspect-[16/10] sm:h-24 sm:w-36 sm:shrink-0 sm:rounded-lg">
                  <img
                    src={selectedPackage.cover}
                    alt={L(selectedPackage, "title")}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2.5 start-2.5 sm:hidden">
                    <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-caption font-semibold text-primary-foreground shadow-xs">
                      {t(`categories.${selectedPackage.category}`)}
                    </span>
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1 p-4 sm:p-0">
                <div className="hidden sm:block">
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-semibold text-primary">
                    {t(`categories.${selectedPackage.category}`)}
                  </span>
                </div>
                {!selectedPackage.cover && (
                  <div className="mb-2 sm:hidden">
                    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-semibold text-primary">
                      {t(`categories.${selectedPackage.category}`)}
                    </span>
                  </div>
                )}
                {/* Critical text must NEVER be clipped: allowed to wrap gracefully */}
                <h2 className="mt-1 text-body font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-h5">
                  {L(selectedPackage, "title")}
                </h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                  {[
                    L(selectedPackage, "destination", "empty"),
                    L(selectedPackage, "duration", "empty"),
                    departure,
                  ]
                    .filter(Boolean)
                    .map((item, idx, arr) => (
                      <span key={item} className="inline-flex items-center gap-1.5">
                        <span>{item}</span>
                        {idx < arr.length - 1 && (
                          <span className="text-muted-foreground/50" aria-hidden="true">
                            •
                          </span>
                        )}
                      </span>
                    ))}
                </p>

                {/* Mobile action bar inside card */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3 sm:mt-2 sm:border-0 sm:pt-0 sm:justify-start">
                  <Link
                    to="/packages/$slug"
                    params={{ slug: selectedPackage.slug }}
                    className="inline-flex min-h-[40px] items-center text-small font-semibold text-primary hover:underline"
                  >
                    {t("actions.viewDetails")}
                  </Link>
                  <Link
                    to="/"
                    hash="packages"
                    className="inline-flex min-h-[40px] items-center text-small font-semibold text-muted-foreground hover:underline"
                  >
                    {t("bookingFlow.actions.changePackage")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- step 1: passenger information */}
          {step === 0 && (
            <section className="ds-reveal space-y-8">
              <SectionTitle
                title={t("bookingFlow.travellers.formsTitle")}
                desc={t("bookingFlow.travellers.formsDesc")}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <CounterRow
                  label={t("bookingFlow.travellers.adults")}
                  hint={t("bookingFlow.travellers.adultsHint")}
                  value={counts.adults}
                  min={1}
                  max={20}
                  onChange={(v) => setCounts((c) => ({ ...c, adults: v }))}
                />
                <CounterRow
                  label={t("bookingFlow.travellers.children")}
                  hint={t("bookingFlow.travellers.childrenHint")}
                  value={counts.children}
                  min={0}
                  max={20}
                  onChange={(v) => setCounts((c) => ({ ...c, children: v }))}
                />
                <CounterRow
                  label={t("bookingFlow.travellers.infants")}
                  hint={t("bookingFlow.travellers.infantsHint")}
                  value={counts.infants}
                  min={0}
                  max={10}
                  onChange={(v) => setCounts((c) => ({ ...c, infants: v }))}
                />
              </div>

              <div className="space-y-5">
                {passengers.map((p, i) => (
                  <PassengerForm
                    key={p.id}
                    passenger={p}
                    index={passengers.filter((x, xi) => x.type === p.type && xi < i).length}
                    isPrimary={i === 0}
                    onChange={(patch) => updatePassenger(p.id, patch)}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-border-subtle bg-card p-6">
                <h3 className="text-h5 font-bold">{t("bookingFlow.fields.comm")}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["phone", "whatsapp", "email"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCommunication(c)}
                      className={`rounded-full px-4 py-2 text-small font-semibold transition-colors duration-fast ${
                        communication === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {t(`bookingFlow.fields.comm_${c}`)}
                    </button>
                  ))}
                </div>
                <div className="mt-5 grid gap-2">
                  <label htmlFor="booking-notes" className="text-small font-semibold">
                    {t("bookingFlow.fields.bookingNotes")}
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-sm border border-input bg-background px-3 py-2 text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
              </div>
            </section>
          )}

          {/* ---------------- step 2: passport upload */}
          {step === 1 && (
            <section className="ds-reveal space-y-6">
              <SectionTitle
                title={t("bookingFlow.passports.title")}
                desc={t("bookingFlow.passports.desc")}
              />
              <div className="space-y-4">
                {passengers.map((p, i) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border-subtle bg-card p-6 shadow-sm"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-h5 font-bold">
                        {p.fullName || t(`bookingFlow.travellers.${p.type}`)}{" "}
                        <span className="text-caption font-medium text-muted-foreground">
                          ({t(`bookingFlow.travellers.${p.type}`)})
                        </span>
                      </h3>
                      {i === 0 && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
                          {t("bookingFlow.travellers.primaryBadge")}
                        </span>
                      )}
                    </div>
                    <PassportUpload
                      passenger={p}
                      onChange={(patch) => updatePassenger(p.id, patch)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------------- step 3: review & confirm */}
          {step === 2 && (
            <section className="ds-reveal space-y-6">
              <SectionTitle
                title={t("bookingFlow.review.title")}
                desc={t("bookingFlow.review.desc")}
              />
              <div className="rounded-xl border border-border-subtle bg-card p-6">
                <h3 className="text-h5 font-bold">{t("bookingFlow.review.packageBlock")}</h3>
                <p className="mt-2 text-body font-semibold">{L(selectedPackage, "title")}</p>
                <p className="text-small text-muted-foreground">
                  {[
                    L(selectedPackage, "destination", "empty"),
                    L(selectedPackage, "duration", "empty"),
                    departure,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>

              <div className="space-y-4">
                {passengers.map((p, i) => (
                  <div key={p.id} className="rounded-xl border border-border-subtle bg-card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body font-bold">
                        {p.fullName || "—"}{" "}
                        <span className="text-caption font-medium text-muted-foreground">
                          ({t(`bookingFlow.travellers.${p.type}`)})
                        </span>
                      </p>
                      {i === 0 && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold text-primary">
                          {t("bookingFlow.travellers.primaryBadge")}
                        </span>
                      )}
                    </div>
                    <dl className="mt-4 grid gap-2 text-small sm:grid-cols-2">
                      <ReviewRow
                        k={t("bookingFlow.fields.gender")}
                        v={p.gender ? t(`bookingFlow.fields.${p.gender}`) : ""}
                      />

                      {i === 0 && (
                        <>
                          <ReviewRow k={t("bookingFlow.fields.phone")} v={p.phone} />
                          <ReviewRow k={t("bookingFlow.fields.email")} v={p.email} />
                        </>
                      )}
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">
                          {p.passportName ?? t("bookingFlow.review.noPassport")}
                        </span>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              {notes.trim() && (
                <div className="rounded-xl border border-border-subtle bg-card p-6">
                  <h3 className="text-h5 font-bold">{t("bookingFlow.fields.bookingNotes")}</h3>
                  <p className="mt-2 whitespace-pre-line text-small text-muted-foreground">
                    {notes}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border-subtle bg-card p-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-body font-bold">{t("bookingFlow.summary.total")}</span>
                  <span className="text-h3 font-extrabold text-primary">
                    {selectedPackage ? money(total, selectedPackage.currency) : "—"}
                  </span>
                </div>
                <p className="mt-3 text-small text-muted-foreground">
                  {t("bookingFlow.confirm.noPayment")}
                </p>
                <label className="mt-6 flex items-start gap-3 text-small">
                  <Checkbox
                    checked={terms}
                    onCheckedChange={(v) => setTerms(v === true)}
                    aria-label={t("bookingFlow.review.termsLabel")}
                  />
                  <span className="text-muted-foreground">{t("bookingFlow.review.terms")}</span>
                </label>
              </div>
            </section>
          )}

          {/* ---------------- Persistent step nav */}
          <BuilderStepNavigation
            onBack={step > 0 ? () => goTo(Math.max(0, step - 1)) : undefined}
            onNext={step < 2 ? next : onConfirm}
            backDisabled={step === 0 || submitting}
            nextDisabled={submitting}
            isSubmitting={submitting}
            isFinalStep={step === 2}
            backLabel={t("bookingFlow.actions.back")}
            nextLabel={step < 2 ? t("bookingFlow.actions.next") : t("bookingFlow.actions.submit")}
            submittingLabel={t("bookingFlow.actions.submitting")}
            selectedSummary={
              step === 0
                ? t("bookingFlow.summary.travellersCount", { count: passengers.length })
                : step === 1
                  ? communication
                    ? t(`bookingFlow.options.${communication}`, communication)
                    : null
                  : selectedPackage
                    ? money(total, selectedPackage.currency)
                    : null
            }
            className="sm:rounded-2xl sm:border sm:border-border-subtle sm:bottom-4"
          />
        </div>

        {/* ---------------- sticky summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SummaryPanel pkg={selectedPackage} counts={counts} total={total} />
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-h3 font-extrabold">{title}</h2>
      <p className="mt-1.5 text-small text-muted-foreground">{desc}</p>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v || "—"}</dd>
    </div>
  );
}

function BookingFlowSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="جاري تحميل الحجز"
      className="mx-auto max-w-7xl animate-pulse space-y-8 px-3 py-6 motion-reduce:animate-none sm:px-6 sm:py-12"
    >
      <div className="max-w-2xl space-y-3">
        <div className="h-3.5 w-24 rounded bg-surface-sunken" />
        <div className="h-8 w-60 rounded-md bg-surface-sunken" />
        <div className="h-4 w-80 max-w-full rounded bg-surface-sunken" />
      </div>

      {/* Stepper skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-full bg-surface-sunken" />
            {i < 3 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* Selected package card skeleton */}
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-card shadow-sm sm:flex sm:items-center sm:gap-4 sm:p-4">
            <div className="aspect-[21/9] w-full bg-surface-sunken sm:aspect-auto sm:h-24 sm:w-36 sm:shrink-0 sm:rounded-lg" />
            <div className="space-y-2 p-4 sm:min-w-0 sm:flex-1 sm:p-0">
              <div className="h-5 w-20 rounded-full bg-surface-sunken" />
              <div className="h-5 w-48 max-w-full rounded bg-surface-sunken" />
              <div className="h-3.5 w-64 max-w-full rounded bg-surface-sunken" />
              <div className="flex gap-4 pt-1">
                <div className="h-4 w-16 rounded bg-surface-sunken" />
                <div className="h-4 w-20 rounded bg-surface-sunken" />
              </div>
            </div>
          </div>

          {/* Form section skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-44 rounded bg-surface-sunken" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-border-subtle bg-card p-4">
                  <div className="h-4 w-16 rounded bg-surface-sunken" />
                  <div className="mt-2 h-3 w-24 rounded bg-surface-sunken" />
                </div>
              ))}
            </div>
            <div className="h-64 rounded-xl border border-border-subtle bg-card p-6">
              <div className="h-5 w-32 rounded bg-surface-sunken" />
              <div className="mt-6 space-y-3">
                <div className="h-10 w-full rounded bg-surface-sunken" />
                <div className="h-10 w-full rounded bg-surface-sunken" />
              </div>
            </div>
          </div>
        </div>

        {/* Aside summary skeleton */}
        <div className="hidden lg:block">
          <div className="space-y-4 rounded-xl border border-border-subtle bg-card p-6">
            <div className="h-5 w-28 rounded bg-surface-sunken" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full rounded bg-surface-sunken" />
              <div className="h-4 w-full rounded bg-surface-sunken" />
              <div className="h-4 w-full rounded bg-surface-sunken" />
            </div>
            <div className="border-t border-border pt-4">
              <div className="h-7 w-32 rounded bg-surface-sunken" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
