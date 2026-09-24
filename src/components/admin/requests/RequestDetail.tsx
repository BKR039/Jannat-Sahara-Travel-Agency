import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  UserRound,
  XCircle,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { getPassportSignedUrl } from "@/lib/admin/admin.functions";
import { updateRequest } from "@/lib/admin/command.functions";
import { statusLabelKey, type RequestKind } from "@/lib/admin/request-status";
import {
  stageActionKey,
  stageLabelKey,
  stageOf,
  stageOptions,
  type StageAction,
} from "@/lib/admin/request-workflow";
import { cabinLabel } from "@/lib/flight-request.labels";
import type { CabinClass } from "@/lib/flight-request.schema";
import { money, shortDate } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CustomOfferPanel } from "./CustomOfferPanel";
import { FlightOfferPanel } from "./FlightOfferPanel";
import { RequestActivity } from "./RequestActivity";

/**
 * One request, as the person handling it needs to read it.
 *
 * What this replaces: the drawer used to print `Object.entries(detail)` — the
 * first eighteen database columns of whatever table the request came from,
 * labelled with their own column names ("customer_key", "airport_flexible",
 * "handled") and truncated to one line each. Everything was on screen and
 * nothing was answered. Alongside it sat every status the lifecycle allowed as
 * an equally weighted button, so the operator had to know the model to know
 * what to press.
 *
 * The order here follows the job instead of the schema: who is asking, what
 * they want, what we are offering them, what we noted internally, and then the
 * one decision to make. Fields a request does not carry are omitted; fields
 * that exist but tell an operator nothing (locale, customer_key, handled) are
 * not shown at all. None of them are removed from the database, and the
 * detailed status is still printed under the buttons so the underlying
 * lifecycle stays legible.
 */

export interface UnifiedRequest {
  id: string;
  kind: RequestKind;
  reference: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  customerKey: string;
  departureDate: string | null;
  travellers: number | null;
  lastContactAt: string | null;
  summary: string;
  detail: Record<string, string | number | boolean | null>;
  status: string;
  created_at: string;
}

/** Exactly what this view is allowed to write, mirroring `updateRequest`. */
interface StatusPatch {
  id: string;
  kind: RequestKind;
  status?: string;
  internal_notes?: string;
  markContacted?: boolean;
}

/* ------------------------------------------------------------------ pieces */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border-subtle bg-surface-sunken/40 p-4">
      <h3 className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** One fact. Renders nothing at all when the request does not carry it. */
function Fact({
  label,
  value,
  wide,
  ltr,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
  ltr?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd
        dir={ltr ? "ltr" : undefined}
        className={cn("break-words text-small", wide && "whitespace-pre-wrap leading-relaxed")}
      >
        {value}
      </dd>
    </div>
  );
}

const str = (row: UnifiedRequest, key: string): string => {
  const v = row.detail[key];
  return v === null || v === undefined || v === "" ? "" : String(v);
};

const int = (row: UnifiedRequest, key: string): number => {
  const v = Number(row.detail[key]);
  return Number.isFinite(v) ? v : 0;
};

/*
 * Umrah wire values -> words.
 *
 * `room_type`, `makkah_area` and `makkah_preference` are stored as the stable
 * codes the builder submits ("family", "haram_close", "premium"). The request
 * view printed them raw, so an operator read "family \u00b7 haram_close \u00b7 premium"
 * in the middle of an Arabic page. The builder already owns translations for
 * every one of them; these resolve against the same catalogue, through the
 * shared i18n instance because those keys live in the `common` namespace while
 * this screen reads from `admin`. An unknown code falls back to itself rather
 * than to a blank.
 */
const umrahLabel = (path: string, value: string): string =>
  value ? i18n.t(`umrahBuilder.${path}.${value}`, { defaultValue: value }) : "";

/* ------------------------------------------------------------- facts by kind */

function RequestFacts({ row }: { row: UnifiedRequest }) {
  const { t } = useTranslation("admin");
  const getSigned = useServerFn(getPassportSignedUrl);
  const [openingPassport, setOpeningPassport] = useState(false);

  async function openPassport(path: string) {
    try {
      setOpeningPassport(true);
      const r = await getSigned({ data: { path } });
      window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open passport");
    } finally {
      setOpeningPassport(false);
    }
  }

  const adults = int(row, "adults");
  const children = int(row, "children");
  const infants = int(row, "infants");

  const party = [
    t("ops.requests.travellers.adults", { count: adults }),
    children ? t("ops.requests.travellers.children", { count: children }) : "",
    infants ? t("ops.requests.travellers.infants", { count: infants }) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (row.kind === "flight") {
    const tripType = str(row, "trip_type");
    const isRoundTrip = tripType === "round_trip";
    return (
      <div className="space-y-3">
        <Group title={t("ops.requests.sections.request")}>
          <Fact
            label={t("ops.requests.route")}
            value={`${str(row, "from_airport")} → ${str(row, "to_airport")}`}
            wide
          />
          <Fact
            label={t("ops.requests.tripType")}
            value={
              isRoundTrip
                ? t("ops.flightRequests.roundTrip", { defaultValue: "ذهاب وعودة" })
                : t("ops.flightRequests.oneWay", { defaultValue: "ذهاب فقط" })
            }
          />
          <Fact
            label={t("ops.requests.cabin")}
            value={cabinLabel(str(row, "cabin_class") as CabinClass)}
          />
          <Fact label={t("ops.requests.fields.departure")} value={str(row, "departure_date")} ltr />
          {isRoundTrip && (
            <Fact label={t("ops.requests.fields.return")} value={str(row, "return_date")} ltr />
          )}
          <Fact
            label={t("ops.requests.fields.party")}
            value={party || `${row.travellers ?? 1} مسافر`}
          />
          <Fact label={t("ops.requests.customerMessage")} value={str(row, "notes")} wide />
        </Group>
      </div>
    );
  }

  if (row.kind === "booking") {
    const price = row.detail["total_price"];
    const paymentStatus = str(row, "payment_status");
    const passportPath = str(row, "passport_path");
    const category = str(row, "package_category");

    const paymentLabel =
      paymentStatus === "paid"
        ? "مدفوع بالكامل"
        : paymentStatus === "partially_paid"
          ? "مدفوع جزئياً"
          : paymentStatus === "refunded"
            ? "مسترجع"
            : paymentStatus === "unpaid"
              ? "غير مدفوع"
              : paymentStatus;

    return (
      <div className="space-y-3">
        <Group title={t("ops.requests.sections.request")}>
          <Fact label={t("ops.requests.package")} value={str(row, "package_title")} wide />
          {category && <Fact label="نوع البرنامج" value={category.toUpperCase()} />}
          <Fact
            label={t("ops.requests.fields.party")}
            value={party || (int(row, "people") ? `${int(row, "people")} مسافر` : "")}
          />
          <Fact
            label={t("ops.requests.total")}
            value={price == null ? "" : money(Number(price), str(row, "currency") || "TND")}
            ltr
          />
          {paymentLabel && <Fact label="حالة الدفع" value={paymentLabel} />}
          <Fact label={t("ops.requests.customerMessage")} value={str(row, "notes")} wide />
        </Group>

        {passportPath && (
          <Group title="وثائق السفر المرفقة">
            <div className="flex items-center justify-between gap-3 p-3 bg-card rounded-lg border border-border/60">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-caption font-medium">جواز السفر المرفق</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={openingPassport}
                onClick={() => openPassport(passportPath)}
              >
                {openingPassport ? (
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="me-1.5 h-3.5 w-3.5" />
                )}
                <span>تحميل / عرض الجواز</span>
              </Button>
            </div>
          </Group>
        )}
      </div>
    );
  }

  if (row.kind === "contact") {
    return (
      <Group title={t("ops.requests.sections.request")}>
        <Fact label={t("ops.requests.subject")} value={str(row, "subject")} wide />
        <Fact label={t("ops.requests.customerMessage")} value={str(row, "message")} wide />
      </Group>
    );
  }

  /* custom_package — the trip the traveller designed, city by city. */
  const flexible = Boolean(row.detail["airport_flexible"]);
  const makkahNights = int(row, "makkah_nights");
  const madinahNights = int(row, "madinah_nights");
  const totalNights = makkahNights + madinahNights;

  let flightPref: {
    flightPreference?: string;
    transitHub?: string;
    additionalDestination?: string;
    destinationTiming?: string;
  } | null = null;
  const rawFlights = str(row, "proposed_flights");
  try {
    if (rawFlights && rawFlights.trim().startsWith("{")) {
      flightPref = JSON.parse(rawFlights);
    }
  } catch {
    // fallback
  }

  const flightPreferenceLabel = () => {
    if (flightPref?.flightPreference) {
      if (flightPref.flightPreference === "direct") return "رحلة مباشرة (بدون توقف)";
      if (flightPref.flightPreference === "transit") {
        return `رحلة ترانزيت${flightPref.transitHub ? ` (مطار الترانزيت: ${flightPref.transitHub})` : ""}`;
      }
      if (flightPref.flightPreference === "stopover") {
        const timing =
          flightPref.destinationTiming === "before_umrah" ? "قبل العمرة" : "بعد العمرة";
        return `وجهة إضافية (Stopover): ${flightPref.additionalDestination || "غير محددة"} — ${timing}`;
      }
      return flightPref.flightPreference;
    }
    if (rawFlights) return rawFlights;
    return null;
  };

  const makkahCustom = !row.detail["makkah_hotel_id"] && Boolean(str(row, "makkah_hotel_name"));
  const makkahHotel = str(row, "makkah_hotel_name")
    ? `${str(row, "makkah_hotel_name")}${makkahCustom ? " (طلب مخصص - غير مدرج بالكتالوج)" : ""}`
    : "غير محدد بالاسم";

  const madinahCustom = !row.detail["madinah_hotel_id"] && Boolean(str(row, "madinah_hotel_name"));
  const madinahHotel = str(row, "madinah_hotel_name")
    ? `${str(row, "madinah_hotel_name")}${madinahCustom ? " (طلب مخصص - غير مدرج بالكتالوج)" : ""}`
    : "غير محدد بالاسم";

  return (
    <div className="space-y-3">
      {/* Flight & Dates */}
      <Group
        title={t("ops.requests.sections.tripDetails", { defaultValue: "تفاصيل الرحلة والمواعيد" })}
      >
        <Fact label={t("ops.requests.fields.departure")} value={str(row, "departure_date")} ltr />
        <Fact label={t("ops.requests.fields.return")} value={str(row, "return_date")} ltr />
        <Fact
          label="إجمالي الليالي"
          value={`${totalNights} ليالٍ (مكة: ${makkahNights} · المدينة: ${madinahNights})`}
        />
        <Fact label={t("ops.requests.fields.party")} value={party} />
        <Fact
          label={t("ops.requests.fields.roomType")}
          value={umrahLabel("room.types", str(row, "room_type"))}
        />
        <Fact
          label={t("ops.requests.fields.departureAirport")}
          value={flexible ? t("ops.requests.flexibleAirport") : str(row, "departure_airport")}
        />
        <Fact
          label={t("ops.requests.fields.returnAirport")}
          value={flexible ? t("ops.requests.flexibleAirport") : str(row, "return_airport")}
        />
        {flightPreferenceLabel() && (
          <Fact label="تفضيل الطيران والمسار" value={flightPreferenceLabel()!} wide />
        )}
      </Group>

      {/* Makkah Stay */}
      <Group title={`مكة المكرمة (${makkahNights} ليالٍ)`}>
        <Fact label={t("ops.requests.fields.hotel")} value={makkahHotel} />
        <Fact
          label={t("ops.requests.fields.area")}
          value={umrahLabel("areas.makkah", str(row, "makkah_area"))}
        />
        <Fact
          label={t("ops.requests.fields.budget")}
          value={umrahLabel("budgets", str(row, "makkah_preference"))}
        />
      </Group>

      {/* Madinah Stay */}
      <Group title={`المدينة المنورة (${madinahNights} ليالٍ)`}>
        <Fact label={t("ops.requests.fields.hotel")} value={madinahHotel} />
        <Fact
          label={t("ops.requests.fields.area")}
          value={umrahLabel("areas.madinah", str(row, "madinah_area"))}
        />
        <Fact
          label={t("ops.requests.fields.budget")}
          value={umrahLabel("budgets", str(row, "madinah_preference"))}
        />
      </Group>

      {/* Customer Notes */}
      {str(row, "notes") && (
        <Group title={t("ops.requests.customerMessage")}>
          <Fact label="" value={str(row, "notes")} wide />
        </Group>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- component */

export function RequestDetail({ row }: { row: UnifiedRequest }) {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const save = useServerFn(updateRequest);

  const stage = stageOf(row.kind, row.status);
  const options = stageOptions(row.kind, row.status);
  /*
   * Only where the table actually has somewhere to put an operator note.
   * `flight_requests` and `custom_package_requests` have `internal_notes`;
   * `contact_messages` has no such column, and `bookings.notes` is the
   * CUSTOMER's note written by the public booking form — writing a staff note
   * there would overwrite what the traveller said. Those two show the
   * customer's words and no staff box, rather than a box that destroys data or
   * saves into nothing.
   */
  const supportsNotes = row.kind === "flight" || row.kind === "custom_package";
  const [notes, setNotes] = useState(String(row.detail["internal_notes"] ?? ""));
  const [pending, setPending] = useState<StageAction | "notes" | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin-flight-requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin-open-requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin-command-center"] });
    queryClient.invalidateQueries({ queryKey: ["admin-request-activity", row.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
  };

  const mutation = useMutation({
    mutationFn: (data: StatusPatch) => save({ data }),
    onSuccess: () => {
      toast.success(t("ops.requests.toastUpdated"));
      invalidate();
    },
    onError: (e: unknown) => {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      if (raw.includes("INVALID_TRANSITION")) toast.error(t("ops.requests.errorTransition"));
      else if (raw.includes("REQUEST_CONFLICT")) toast.error(t("ops.requests.errorConflict"));
      else if (raw.includes("REQUEST_CLOSED")) toast.error(t("ops.requests.errorClosed"));
      else toast.error(t("ops.requests.toastUpdateFailed"));
    },
    onSettled: () => setPending(null),
  });

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { archiveRecordFn } = await import("@/lib/admin/archive.functions");
      let subType: "booking" | "flight_request" | "custom_package_request" | "contact_message" = "booking";
      if (row.kind === "flight") subType = "flight_request";
      else if (row.kind === "custom_package") subType = "custom_package_request";
      else if (row.kind === "contact") subType = "contact_message";

      return await archiveRecordFn({
        data: {
          entityType: "request",
          subType,
          id: row.id,
          reason: "أرشفة من صفحة تفاصيل الطلب",
        },
      });
    },
    onSuccess: () => {
      toast.success("تم نقل الطلب إلى الأرشيف بنجاح");
      setIsArchiveOpen(false);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "فشل نقل الطلب إلى الأرشيف"),
  });

  const digits = (row.phone ?? "").replace(/\D/g, "");
  const whatsappNumber = str(row, "whatsapp") || row.phone || "";
  const whatsappDigits = whatsappNumber.replace(/\D/g, "");
  const contactPref = str(row, "contact_preference");

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ who, what, when */}
      <header className="rounded-card border border-primary/25 bg-primary/[0.04] p-4.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-h5 font-bold leading-tight text-foreground">{row.name}</p>
              {contactPref && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-micro font-semibold text-primary">
                  {contactPref === "whatsapp" ? "يفضّل واتساب" : "يفضّل الهاتف"}
                </span>
              )}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
              <span className="rounded-full bg-surface px-2.5 py-0.5 font-semibold text-foreground border border-border/50">
                {t(`ops.requests.kinds.${row.kind}`)}
              </span>
              {row.reference && (
                <span
                  dir="ltr"
                  className="font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded"
                >
                  {row.reference}
                </span>
              )}
              <span>{shortDate(row.created_at)}</span>
            </p>
          </div>
          <StageBadge stage={stage} />
        </div>

        {/* Reaching the customer is one tap, not a lookup. */}
        <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-border/40">
          {row.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${row.phone}`} dir="ltr">
                <Phone className="me-2 h-4 w-4 text-primary" aria-hidden="true" />
                {row.phone}
              </a>
            </Button>
          )}
          {whatsappDigits.length >= 6 && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="text-brand-green"
            >
              <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer">
                <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
                {t("ops.requests.whatsapp")}
              </a>
            </Button>
          )}
          {row.email && (
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${row.email}`} dir="ltr">
                <Mail className="me-2 h-4 w-4" aria-hidden="true" />
                {row.email}
              </a>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="ms-auto text-muted-foreground hover:text-foreground"
          >
            <Link to="/admin/customers" search={{ customer: row.customerKey }}>
              <UserRound className="me-2 h-4 w-4" aria-hidden="true" />
              {t("ops.requests.viewCustomer")}
            </Link>
          </Button>
        </div>
      </header>

      {/* ------------------------------------------------------- the request */}
      <RequestFacts row={row} />

      {/* --------------------------------------------------- price / offer */}
      {row.kind === "custom_package" && <CustomOfferPanel row={row.detail} />}
      {row.kind === "flight" && <FlightOfferPanel row={row} />}

      {/* ------------------------------------------------- internal notes */}
      {supportsNotes && (
        <section className="rounded-card border border-border-subtle bg-surface-sunken/40 p-4">
          <h3 className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {t("ops.requests.internalTitle")}
          </h3>
          <p className="mt-1 text-caption text-muted-foreground">
            {t("ops.requests.internalHint")}
          </p>
          <Textarea
            className="mt-2.5"
            rows={3}
            value={notes}
            aria-label={t("ops.requests.internalTitle")}
            placeholder={t("ops.requests.internalPlaceholder")}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            className="mt-2.5"
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => {
              setPending("notes");
              mutation.mutate({ id: row.id, kind: row.kind, internal_notes: notes });
            }}
          >
            {pending === "notes" && mutation.isPending && (
              <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {t("ops.requests.saveNotes")}
          </Button>
        </section>
      )}

      {/* -------------------------------------------------------- decision */}
      <section className="rounded-card border border-border-subtle p-4">
        <h3 className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
          {t("ops.stages.title")}
        </h3>
        {/*
         * Three moves, always in the same order and always in the same place.
         * A move the lifecycle refuses from here stays visible but disabled and
         * says why, so "not yet" never looks like "not possible".
         */}
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <Button
              key={o.action}
              size="sm"
              variant={o.current ? "default" : o.action === "declined" ? "outline" : "secondary"}
              aria-current={o.current ? "true" : undefined}
              disabled={!o.enabled || mutation.isPending}
              title={o.blockedBy === "blocked" ? t("ops.stages.blockedHint") : undefined}
              className={cn(o.current && "ring-2 ring-primary/40")}
              onClick={() => {
                if (!o.target) return;
                setPending(o.action);
                mutation.mutate({
                  id: row.id,
                  kind: row.kind,
                  status: o.target,
                  markContacted: o.action === "processing",
                });
              }}
            >
              {pending === o.action && mutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : o.action === "confirmed" ? (
                <CheckCircle2 className="me-2 h-4 w-4" aria-hidden="true" />
              ) : o.action === "declined" ? (
                <XCircle className="me-2 h-4 w-4" aria-hidden="true" />
              ) : null}
              {t(stageActionKey(o.action))}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsArchiveOpen(true)}
          >
            <Archive className="me-2 h-4 w-4" aria-hidden="true" />
            أرشفة الطلب
          </Button>
        </div>
        <p className="mt-2.5 text-caption text-muted-foreground">
          {t("ops.stages.detailedStatus", { status: t(statusLabelKey(row.status)) })}
          {options.every((o) => !o.enabled) && ` — ${t("ops.requests.closedHint")}`}
        </p>
      </section>

      {/* Confirmation Dialog for Archiving */}
      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>أرشفة الطلب / الحجز</DialogTitle>
            <DialogDescription>
              هل تريد نقل هذا الطلب إلى الأرشيف؟ سيتم إخفاؤه من قوائم العمليات النشطة مع الحفاظ الكامل على كافة السجلات والبيانات المرتبطة، ويمكنك استرجاعه في أي وقت من قسم الأرشيف.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="default"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              {archiveMutation.isPending ? "جاري الأرشفة..." : "تأكيد الأرشفة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit history is unchanged and still comes from `audit_logs`. */}
      <RequestActivity requestId={row.id} kind={row.kind} />
    </div>
  );
}

/* ------------------------------------------------------------------ badge */

const STAGE_TONE = {
  new: "bg-accent text-primary",
  processing: "bg-warning-muted text-warning",
  confirmed: "bg-mint-muted text-brand-green",
  declined: "bg-destructive/10 text-destructive",
} as const;

export function StageBadge({
  stage,
  className,
}: {
  stage: keyof typeof STAGE_TONE;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-caption font-bold",
        STAGE_TONE[stage],
        className,
      )}
    >
      {t(stageLabelKey(stage))}
    </span>
  );
}
