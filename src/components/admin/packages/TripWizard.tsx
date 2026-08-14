/**
 * Janna Sahara — "New trip" wizard.
 * A 3-step, low-friction creation flow. Technical fields (slug, SEO, status,
 * sort order…) are generated automatically; anything else lives behind
 * "Advanced options" or the full editor.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  Loader2,
  Plane,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldGrid, ImageField, TextField } from "@/components/admin/settings/parts";
import { Disclosure, money } from "@/components/admin/kit";
import { cn } from "@/lib/utils";
import { emptyForm, slugify, toPayload, type PackageCategory, type PackageForm } from "./model";

type TripType = "umrah" | "flight" | "tour" | "other";

const TRIP_TYPES: { key: TripType; label: string; hint: string; icon: typeof Plane }[] = [
  { key: "umrah", label: "Umrah", hint: "Makkah & Madinah package", icon: BedDouble },
  { key: "tour", label: "Tour", hint: "Organised trip abroad", icon: Building2 },
  { key: "flight", label: "Flight", hint: "Handled as requests", icon: Plane },
  { key: "other", label: "Other", hint: "Visa & services", icon: CalendarDays },
];

const CATEGORY_OF: Record<TripType, PackageCategory> = {
  umrah: "umrah",
  tour: "trip",
  flight: "flight",
  other: "visa",
};

type Hotel = { city: string; hotel: string; nights: string };

type Draft = {
  type: TripType;
  title: string;
  cover: string;
  destination: string;
  short_description: string;
  duration: string;
  departure_date: string;
  return_date: string;
  price: string;
  seats: string;
  hotels: Hotel[];
  from_city: string;
  to_city: string;
  airline: string;
  flight_number: string;
  /* advanced */
  description: string;
  child_price: string;
  infant_price: string;
  discount_price: string;
  title_fr: string;
  short_description_fr: string;
};

function emptyDraft(): Draft {
  return {
    type: "umrah",
    title: "",
    cover: "",
    destination: "",
    short_description: "",
    duration: "",
    departure_date: "",
    return_date: "",
    price: "",
    seats: "",
    hotels: [],
    from_city: "",
    to_city: "",
    airline: "",
    flight_number: "",
    description: "",
    child_price: "",
    infant_price: "",
    discount_price: "",
    title_fr: "",
    short_description_fr: "",
  };
}

const STEPS = ["Basics", "Trip details", "Review & publish"] as const;

export function TripWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(emptyDraft);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }

  /* remembered values from previously created trips */
  const memory = useQuery({
    queryKey: ["trip-wizard-memory"] as const,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("destination, hotel, airline, accommodation, currency")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const destinations = new Set<string>();
      const hotels = new Set<string>();
      const airlines = new Set<string>();
      for (const row of data ?? []) {
        if (row.destination) destinations.add(row.destination);
        if (row.hotel) hotels.add(row.hotel);
        if (row.airline) airlines.add(row.airline);
        if (Array.isArray(row.accommodation)) {
          for (const raw of row.accommodation as unknown[]) {
            const h = (raw ?? {}) as Record<string, unknown>;
            if (typeof h.hotel === "string" && h.hotel) hotels.add(h.hotel);
          }
        }
      }
      return {
        destinations: [...destinations].slice(0, 20),
        hotels: [...hotels].slice(0, 30),
        airlines: [...airlines].slice(0, 20),
      };
    },
  });

  const isFlight = d.type === "flight";

  const nightsTotal = useMemo(
    () => d.hotels.reduce((sum, h) => sum + (Number(h.nights) || 0), 0),
    [d.hotels],
  );

  const step1Valid = d.title.trim().length > 1 && !isFlight;
  const step2Valid = Number(d.price) > 0;

  function buildForm(status: "draft" | "published"): PackageForm {
    const category = CATEGORY_OF[d.type];
    const base = emptyForm(category);
    const hotels = d.hotels.filter((h) => h.hotel.trim() || h.city.trim());
    const duration =
      d.duration.trim() ||
      (nightsTotal > 0 ? `${nightsTotal} nights` : "") ||
      autoDuration(d.departure_date, d.return_date);
    return {
      ...base,
      title: d.title.trim(),
      title_fr: d.title_fr.trim(),
      slug: slugify(d.title),
      status,
      category,
      cover: d.cover,
      destination: d.destination.trim(),
      short_description: d.short_description.trim(),
      short_description_fr: d.short_description_fr.trim(),
      description: d.description.trim(),
      duration,
      departure_date: d.departure_date,
      return_date: d.return_date,
      price: d.price.trim() || "0",
      discount_price: d.discount_price.trim(),
      child_price: d.child_price.trim(),
      infant_price: d.infant_price.trim(),
      seats: d.seats.trim(),
      total_seats: d.seats.trim(),
      hotel: hotels.map((h) => [h.city, h.hotel].filter(Boolean).join(" — ")).join(" · "),
      airline: d.airline.trim(),
      meeting_point: [d.from_city.trim(), d.to_city.trim()].filter(Boolean).join(" → "),
      seo_title: d.title.trim().slice(0, 60),
      seo_description: d.short_description.trim().slice(0, 160),
    };
  }

  const create = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const payload = {
        ...toPayload(buildForm(status)),
        accommodation: d.hotels
          .filter((h) => h.hotel.trim() || h.city.trim())
          .map((h) => ({ city: h.city.trim(), hotel: h.hotel.trim(), nights: Number(h.nights) || 0 })),
        transport: d.flight_number.trim()
          ? `${d.airline.trim()} ${d.flight_number.trim()}`.trim()
          : null,
      };
      const { data, error } = await supabase
        .from("packages")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id, status) => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      toast.success(status === "published" ? "Trip published" : "Draft saved");
      void navigate({ to: "/admin/packages/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-3xl pb-16">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/packages">
            <ArrowLeft className="me-2 h-4 w-4 rtl:-scale-x-100" /> Trips
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-h4 font-bold tracking-tight">New trip</h1>
          <p className="text-caption text-muted-foreground">
            Three short steps — we handle the technical details.
          </p>
        </div>
      </div>

      <Stepper step={step} />

      <div className="mt-6 space-y-5">
        {step === 0 && (
          <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm sm:p-6">
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block text-small font-semibold">Trip type</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TRIP_TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = d.type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => set("type", t.key)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl border p-3 text-start transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border-subtle hover:bg-surface-sunken/50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "mb-2 h-5 w-5",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <div className="text-small font-semibold">{t.label}</div>
                        <div className="text-caption text-muted-foreground">{t.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isFlight ? (
                <div className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-5">
                  <h2 className="text-small font-semibold">Flights work as requests</h2>
                  <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
                    You don't publish flight tickets. Travellers submit a flight request from the
                    website (from, to, dates, travellers) and it lands in your inbox — you reply with
                    the best option by email and close the request once it's done.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link to="/admin/flight-requests">Open flight requests</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <TextField
                    label="Trip title"
                    value={d.title}
                    onChange={(v) => set("title", v)}
                    placeholder="Umrah Ramadan — 12 days"
                  />
                  <Field label="Destination" hint="City or country travellers are going to">
                    <Input
                      value={d.destination}
                      onChange={(e) => set("destination", e.target.value)}
                      list="wizard-destinations"
                      placeholder="Makkah & Madinah"
                    />
                    <datalist id="wizard-destinations">
                      {(memory.data?.destinations ?? []).map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Short description" hint="One or two lines shown on the trip card">
                    <Textarea
                      rows={3}
                      value={d.short_description}
                      onChange={(e) => set("short_description", e.target.value)}
                      placeholder="Full package with flights, 4★ hotels and guided visits."
                    />
                  </Field>
                  <ImageField
                    label="Cover image"
                    value={d.cover}
                    onChange={(v) => set("cover", v)}
                    folder="packages"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm sm:p-6">
              <FieldGrid>
                <TextField
                  label="Price per person"
                  value={d.price}
                  onChange={(v) => set("price", v)}
                  type="number"
                  placeholder="4200"
                />
                <TextField
                  label="Available seats"
                  value={d.seats}
                  onChange={(v) => set("seats", v)}
                  type="number"
                  placeholder="40"
                />
                <TextField
                  label="Departure date"
                  value={d.departure_date}
                  onChange={(v) => set("departure_date", v)}
                  type="date"
                />
                <TextField
                  label="Return date"
                  value={d.return_date}
                  onChange={(v) => set("return_date", v)}
                  type="date"
                />
                <TextField
                  label="Duration"
                  hint="Leave empty and we'll compute it from the dates or nights"
                  value={d.duration}
                  onChange={(v) => set("duration", v)}
                  placeholder="12 days"
                />
              </FieldGrid>
            </div>

            {(d.type === "umrah" || d.type === "tour") && (
              <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-small font-semibold">Hotels</h2>
                    <p className="text-caption text-muted-foreground">
                      City, hotel name and number of nights.
                      {nightsTotal > 0 ? ` Total: ${nightsTotal} nights.` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      set("hotels", [...d.hotels, { city: "", hotel: "", nights: "" }])
                    }
                  >
                    <Plus className="me-2 h-4 w-4" /> Add hotel
                  </Button>
                </div>

                {d.hotels.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border-subtle p-4 text-caption text-muted-foreground">
                    No hotels yet — add one if the trip includes accommodation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {d.hotels.map((h, i) => (
                      <div
                        key={i}
                        className="grid gap-2 sm:grid-cols-[1fr_1.4fr_90px_auto] sm:items-center"
                      >
                        <Input
                          value={h.city}
                          placeholder="City (Makkah)"
                          onChange={(e) => updateHotel(i, { city: e.target.value })}
                        />
                        <Input
                          value={h.hotel}
                          placeholder="Hotel name"
                          list="wizard-hotels"
                          onChange={(e) => updateHotel(i, { hotel: e.target.value })}
                        />
                        <Input
                          value={h.nights}
                          type="number"
                          placeholder="Nights"
                          onChange={(e) => updateHotel(i, { nights: e.target.value })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remove hotel"
                          className="text-destructive"
                          onClick={() => set("hotels", d.hotels.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <datalist id="wizard-hotels">
                      {(memory.data?.hotels ?? []).map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-small font-semibold">Flight</h2>
              <FieldGrid>
                <TextField
                  label="Departure city"
                  value={d.from_city}
                  onChange={(v) => set("from_city", v)}
                  placeholder="Tunis"
                />
                <TextField
                  label="Arrival city"
                  value={d.to_city}
                  onChange={(v) => set("to_city", v)}
                  placeholder="Jeddah"
                />
                <Field label="Airline" hint="Optional">
                  <Input
                    value={d.airline}
                    list="wizard-airlines"
                    onChange={(e) => set("airline", e.target.value)}
                    placeholder="Saudia"
                  />
                  <datalist id="wizard-airlines">
                    {(memory.data?.airlines ?? []).map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </Field>
                <TextField
                  label="Flight number"
                  hint="Optional"
                  value={d.flight_number}
                  onChange={(v) => set("flight_number", v)}
                  placeholder="SV 1234"
                />
              </FieldGrid>
            </div>

            <Disclosure label="Advanced options">
              <div className="space-y-5">
                <Field label="Full description" hint="Shown on the trip page">
                  <Textarea
                    rows={5}
                    value={d.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
                <FieldGrid>
                  <TextField
                    label="Promotional price"
                    value={d.discount_price}
                    onChange={(v) => set("discount_price", v)}
                    type="number"
                  />
                  <TextField
                    label="Child price"
                    value={d.child_price}
                    onChange={(v) => set("child_price", v)}
                    type="number"
                  />
                  <TextField
                    label="Infant price"
                    value={d.infant_price}
                    onChange={(v) => set("infant_price", v)}
                    type="number"
                  />
                  <TextField
                    label="Title (French)"
                    value={d.title_fr}
                    onChange={(v) => set("title_fr", v)}
                  />
                </FieldGrid>
                <Field label="Short description (French)">
                  <Textarea
                    rows={3}
                    value={d.short_description_fr}
                    onChange={(e) => set("short_description_fr", e.target.value)}
                  />
                </Field>
                <p className="text-caption text-muted-foreground">
                  Itinerary, gallery, included/excluded items and SEO stay available in the full
                  editor once the trip is created.
                </p>
              </div>
            </Disclosure>
          </>
        )}

        {step === 2 && <ReviewCard draft={d} nights={nightsTotal} />}
      </div>

      {/* ------------------------------- footer nav ------------------------------ */}
      <div className="sticky bottom-0 mt-6 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="me-2 h-4 w-4 rtl:-scale-x-100" /> Back
        </Button>

        {step < 2 ? (
          <Button
            disabled={step === 0 ? !step1Valid : !step2Valid}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={create.isPending}
              onClick={() => create.mutate("draft")}
            >
              Save draft
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate("published")}>
              {create.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-2 h-4 w-4" />
              )}
              Publish trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  function updateHotel(i: number, patch: Partial<Hotel>) {
    set(
      "hotels",
      d.hotels.map((h, idx) => (idx === i ? { ...h, ...patch } : h)),
    );
  }
}

function autoDuration(from: string, to: string): string {
  if (!from || !to) return "";
  const days = Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000),
  );
  return days > 0 ? `${days + 1} days` : "";
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border-subtle text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-small",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            <span className="hidden h-px flex-1 bg-border-subtle sm:block" />
          </li>
        );
      })}
    </ol>
  );
}

function ReviewCard({ draft: d, nights }: { draft: Draft; nights: number }) {
  const dates = [d.departure_date, d.return_date].filter(Boolean).join(" → ");
  const duration = d.duration || (nights > 0 ? `${nights} nights` : autoDuration(d.departure_date, d.return_date));
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm">
      {d.cover ? (
        <img
          src={d.cover}
          alt={d.title || "Trip cover"}
          className="h-48 w-full object-cover sm:h-60"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-surface-sunken/60 text-caption text-muted-foreground">
          No cover image
        </div>
      )}
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-h5 font-bold">{d.title || "Untitled trip"}</h2>
          {d.destination && (
            <p className="mt-1 text-small text-muted-foreground">{d.destination}</p>
          )}
          {d.short_description && (
            <p className="mt-3 text-small leading-relaxed text-muted-foreground">
              {d.short_description}
            </p>
          )}
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          <Stat icon={CalendarDays} label="Dates" value={dates || "—"} />
          <Stat icon={CalendarDays} label="Duration" value={duration || "—"} />
          <Stat icon={Users} label="Seats" value={d.seats || "—"} />
        </dl>

        {d.hotels.some((h) => h.hotel || h.city) && (
          <div>
            <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              Hotels
            </h3>
            <ul className="space-y-1.5 text-small">
              {d.hotels
                .filter((h) => h.hotel || h.city)
                .map((h, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-primary" />
                    <span className="font-medium">{h.city || "—"}</span>
                    <span className="text-muted-foreground">
                      {h.hotel}
                      {h.nights ? ` · ${h.nights} nights` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex items-end justify-between border-t border-border-subtle pt-4">
          <span className="text-caption text-muted-foreground">Price per person</span>
          <span className="text-h5 font-bold text-primary">
            {d.price ? money(Number(d.price)) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-3">
      <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-small font-semibold">{value}</dd>
    </div>
  );
}
