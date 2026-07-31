import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Compass, FileText, Loader2, Plane, Sparkles, Stamp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SkeletonGrid } from "@/components/common/SkeletonGrid";
import { packagesQuery, type Package, type PackageCategory } from "@/lib/queries";
import { submitBooking } from "@/lib/booking.functions";
import {
  computeTotal,
  money,
  syncPassengers,
  type Counts,
  type Passenger,
  type ServiceKey,
} from "./model";
import {
  CounterRow,
  PackageOption,
  PassengerForm,
  ServiceGrid,
  StepIndicator,
  SummaryPanel,
} from "./parts";

const DRAFT_KEY = "janat-booking-draft-v1";
const SERVICES: ServiceKey[] = ["umrah", "trip", "flight", "visa"];

const SERVICE_ICONS: Record<ServiceKey, React.ReactNode> = {
  umrah: <Sparkles className="h-6 w-6" />,
  trip: <Compass className="h-6 w-6" />,
  flight: <Plane className="h-6 w-6" />,
  visa: <Stamp className="h-6 w-6" />,
};

interface Draft {
  step: number;
  service: ServiceKey | null;
  packageId: string | null;
  counts: Counts;
  passengers: Passenger[];
  communication: string;
  notes: string;
}

interface Props {
  initialService?: ServiceKey | null;
  initialPackageSlug?: string | null;
}

export function BookingFlow({ initialService = null, initialPackageSlug = null }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useServerFn(submitBooking);
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [service, setService] = useState<ServiceKey | null>(initialService);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({ adults: 1, children: 0, infants: 0 });
  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    syncPassengers([], { adults: 1, children: 0, infants: 0 }),
  );
  const [communication, setCommunication] = useState("phone");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* ---------- data */
  const allPackages = useQuery(packagesQuery());
  const packages = useMemo(
    () => (allPackages.data ?? []).filter((p) => !service || p.category === service),
    [allPackages.data, service],
  );
  const counted = useMemo(() => {
    const map = {} as Record<ServiceKey, number>;
    SERVICES.forEach((s) => {
      map[s] = (allPackages.data ?? []).filter((p) => p.category === s).length;
    });
    return map;
  }, [allPackages.data]);

  const selectedPackage: Package | null = useMemo(
    () => (allPackages.data ?? []).find((p) => p.id === packageId) ?? null,
    [allPackages.data, packageId],
  );
  const total = computeTotal(selectedPackage, counts);

  /* ---------- draft restore */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        if (d && Array.isArray(d.passengers) && d.passengers.length) {
          setStep(Math.min(d.step ?? 0, 4));
          setService(initialService ?? d.service ?? null);
          setPackageId(d.packageId ?? null);
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

  /* ---------- deep link by package slug */
  useEffect(() => {
    if (!initialPackageSlug || !allPackages.data) return;
    const match = allPackages.data.find((p) => p.slug === initialPackageSlug);
    if (match) {
      setService(match.category as ServiceKey);
      setPackageId(match.id);
      setStep((s) => (s < 2 ? 2 : s));
    }
  }, [initialPackageSlug, allPackages.data]);

  /* ---------- draft autosave */
  useEffect(() => {
    if (!hydrated) return;
    const draft: Draft = { step, service, packageId, counts, passengers, communication, notes };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full or unavailable */
    }
  }, [hydrated, step, service, packageId, counts, passengers, communication, notes]);

  /* ---------- keep passenger forms in sync with counts */
  useEffect(() => {
    setPassengers((list) => syncPassengers(list, counts));
  }, [counts]);

  const steps = [
    t("bookingFlow.steps.service"),
    t("bookingFlow.steps.package"),
    t("bookingFlow.steps.travellers"),
    t("bookingFlow.steps.review"),
    t("bookingFlow.steps.confirm"),
  ];

  const goTo = useCallback((i: number) => {
    setStep(i);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function validate(current: number): boolean {
    if (current === 0 && !service) {
      toast.error(t("bookingFlow.errors.selectService"));
      return false;
    }
    if (current === 1 && !selectedPackage) {
      toast.error(t("bookingFlow.errors.selectPackage"));
      return false;
    }
    if (current === 2) {
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
    goTo(Math.min(4, step + 1));
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
    if (!validate(2) || !selectedPackage) return;

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
          notes: notes.trim() || null,
          passengers: passengers.map((p, i) => ({
            type: p.type,
            isPrimary: i === 0,
            fullName: p.fullName.trim(),
            passportNumber: p.passportNumber.trim() || null,
            nationality: p.nationality.trim() || null,
            gender: p.gender || null,
            dateOfBirth: p.dateOfBirth || null,
            passportExpiry: p.passportExpiry || null,
            phone: i === 0 ? p.phone.trim() : null,
            email: i === 0 ? p.email.trim() : null,
            emergencyContact: p.emergencyContact.trim() || null,
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

  return (
    <div ref={topRef} className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 max-w-2xl">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          {t("bookingFlow.eyebrow")}
        </p>
        <h1 className="mt-2 text-h1 font-extrabold">{t("bookingFlow.title")}</h1>
        <p className="mt-3 text-body text-muted-foreground">{t("bookingFlow.subtitle")}</p>
      </header>

      <div className="mb-10">
        <StepIndicator steps={steps} current={step} onJump={goTo} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* ---------------- step 1 */}
          {step === 0 && (
            <section className="ds-reveal space-y-6">
              <SectionTitle
                title={t("bookingFlow.service.title")}
                desc={t("bookingFlow.service.desc")}
              />
              <ServiceGrid
                services={SERVICES.map((s) => ({
                  key: s,
                  icon: SERVICE_ICONS[s],
                  count: counted[s] ?? 0,
                }))}
                value={service}
                onChange={(k) => {
                  setService(k);
                  setPackageId(null);
                  goTo(1);
                }}
              />
            </section>
          )}

          {/* ---------------- step 2 */}
          {step === 1 && (
            <section className="ds-reveal space-y-6">
              <SectionTitle
                title={t("bookingFlow.package.title")}
                desc={t("bookingFlow.package.desc")}
              />
              {allPackages.isLoading ? (
                <SkeletonGrid count={4} />
              ) : packages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-small text-muted-foreground">
                  {t("bookingFlow.package.empty")}
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {packages.map((p) => (
                    <PackageOption
                      key={p.id}
                      pkg={p}
                      active={p.id === packageId}
                      onSelect={() => {
                        setPackageId(p.id);
                        goTo(2);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ---------------- step 3 */}
          {step === 2 && (
            <section className="ds-reveal space-y-8">
              <SectionTitle
                title={t("bookingFlow.travellers.title")}
                desc={t("bookingFlow.travellers.desc")}
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
                <SectionTitle
                  title={t("bookingFlow.travellers.formsTitle")}
                  desc={t("bookingFlow.travellers.formsDesc")}
                />
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

          {/* ---------------- step 4 */}
          {step === 3 && (
            <section className="ds-reveal space-y-6">
              <SectionTitle
                title={t("bookingFlow.review.title")}
                desc={t("bookingFlow.review.desc")}
              />
              <div className="rounded-xl border border-border-subtle bg-card p-6">
                <h3 className="text-h5 font-bold">{t("bookingFlow.review.packageBlock")}</h3>
                <p className="mt-2 text-body font-semibold">{selectedPackage?.title}</p>
                <p className="text-small text-muted-foreground">
                  {[
                    selectedPackage?.destination,
                    selectedPackage?.duration,
                    selectedPackage?.departure_date
                      ? new Date(selectedPackage.departure_date).toLocaleDateString()
                      : null,
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
                      <ReviewRow k={t("bookingFlow.fields.passportNumber")} v={p.passportNumber} />
                      <ReviewRow k={t("bookingFlow.fields.nationality")} v={p.nationality} />
                      <ReviewRow
                        k={t("bookingFlow.fields.gender")}
                        v={p.gender ? t(`bookingFlow.fields.${p.gender}`) : ""}
                      />
                      <ReviewRow k={t("bookingFlow.fields.dob")} v={p.dateOfBirth} />
                      <ReviewRow k={t("bookingFlow.fields.passportExpiry")} v={p.passportExpiry} />
                      <ReviewRow k={t("bookingFlow.fields.emergency")} v={p.emergencyContact} />
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
            </section>
          )}

          {/* ---------------- step 5 */}
          {step === 4 && (
            <section className="ds-reveal space-y-6">
              <SectionTitle
                title={t("bookingFlow.confirm.title")}
                desc={t("bookingFlow.confirm.desc")}
              />
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

          {/* ---------------- nav */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(Math.max(0, step - 1))}
              disabled={step === 0 || submitting}
            >
              <ArrowRight className="me-2 h-4 w-4 rtl:hidden" />
              <ArrowLeft className="me-2 hidden h-4 w-4 ltr:inline-block" />
              {t("bookingFlow.actions.back")}
            </Button>

            {step < 4 ? (
              <Button type="button" size="lg" onClick={next}>
                {t("bookingFlow.actions.next")}
              </Button>
            ) : (
              <Button type="button" size="lg" onClick={onConfirm} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("bookingFlow.actions.submitting")}
                  </>
                ) : (
                  t("bookingFlow.actions.submit")
                )}
              </Button>
            )}
          </div>
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

export type { PackageCategory };
