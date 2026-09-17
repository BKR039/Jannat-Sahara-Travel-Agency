import { Suspense, lazy, memo, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { submitContactMessage } from "@/lib/public.functions";
import { toast } from "sonner";
import {
  MapPin,
  Phone,
  PhoneCall,
  Mail,
  Clock,
  Navigation,
  Star,
  MessageCircle,
  Facebook,
  Instagram,
  Youtube,
  Copy,
  Send,
  Check,
  Building2,
  Sparkles,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconBadge } from "@/components/common/IconBadge";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { useLocalized } from "@/lib/localize";

import { branchesQuery, contactInfoQuery, type Branch, type ContactInfo } from "@/lib/queries";
import { jsonLd as jsonLdScript } from "@/lib/seo";

const BranchesMap = lazy(() => import("./BranchesMap"));

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Sparkles,
  whatsapp: MessageCircle,
};

/**
 * wa.me needs a country code. Branch numbers are stored exactly as the agency
 * records them, which for Tunisian lines is the bare 8-digit local number, so
 * prefix 216 in the link only. The stored value is never rewritten.
 */
function whatsappHref(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

/** Turns a raw wa.me link (or any digits) into a readable +216 55 123 456. */
function prettyPhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("216") && digits.length >= 11) {
    const local = digits.slice(3);
    return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)}`;
  }
  return `+${digits}`;
}

function mapsHref(branch: Branch) {
  return (
    branch.google_maps_url ??
    `https://www.google.com/maps/search/?api=1&query=${Number(branch.latitude)},${Number(
      branch.longitude,
    )}`
  );
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
}

/* ------------------------------------------------------------------ atoms */

function MapSkeleton() {
  return (
    <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-muted/40">
      <Loader2 className="h-7 w-7 animate-spin text-primary/70" />
    </div>
  );
}

/* --------------------------------------------------- branch list tile */

const BranchTile = memo(function BranchTile({
  branch,
  active,
  onSelect,
  refStore,
  index,
}: {
  branch: Branch;
  active: boolean;
  onSelect: (id: string) => void;
  refStore: React.MutableRefObject<Record<string, HTMLElement | null>>;
  index: number;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();

  return (
    <article
      ref={(el) => {
        refStore.current[branch.id] = el;
      }}
      tabIndex={0}
      role="button"
      aria-pressed={active}
      onClick={() => onSelect(branch.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(branch.id);
        }
      }}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
      className={cn(
        "group ds-reveal relative flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-start transition-all duration-base ease-standard",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "border-primary/50 bg-primary/8 shadow-md shadow-primary/10"
          : "border-border/50 bg-background/50 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-base ease-standard",
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
            : "bg-primary/10 text-primary group-hover:scale-105",
        )}
      >
        {branch.is_main_branch ? (
          <Star className={cn("h-4 w-4", active && "fill-current")} />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
      </span>

      {/*
       * Real branch names run to ~45 characters of Arabic
       * ("وكالة جنة الصحراء للاسفار فرع المروج تونس"), so nothing here may
       * truncate: the name wraps, and the address clamps to two lines with the
       * full value always shown in the panel below.
       */}
      <div className="min-w-0 flex-1">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-primary/80">
          {branch.is_main_branch ? t("branches.mainBranch") : t("branches.office")} ·{" "}
          {L(branch, "city", "base")}
        </p>
        <h3 className="mt-0.5 text-small font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
          {L(branch, "name", "base")}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {L(branch, "address", "base")}
        </p>
        {/* Plain text, not a link: the card itself is the control. */}
        {branch.phone && (
          <p
            dir="ltr"
            className="mt-1.5 inline-flex items-center gap-1.5 text-caption font-semibold text-foreground/80"
          >
            <Phone className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {branch.phone}
          </p>
        )}
      </div>

      {active && (
        <span className="mt-1 shrink-0 rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground">
          {t("branches.active")}
        </span>
      )}
    </article>
  );
});

/* ------------------------------------------- active branch detail panel */

const ACTION_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

function ActiveBranchPanel({ branch }: { branch: Branch }) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const hours = L(branch, "working_hours", "empty");
  const address = L(branch, "address", "base");
  const name = L(branch, "name", "base");

  // Address and name are rendered in the identity block, not as facts, so the
  // hierarchy reads type → name → address → phone → actions. Whatever the
  // agency has not filled in simply drops out; the layout does not assume a
  // fixed number of facts the way the old five-track grid did.
  const facts = [
    branch.phone
      ? {
          key: "phone",
          icon: Phone,
          label: t("branches.info.phone"),
          value: branch.phone,
          ltr: true,
        }
      : null,
    branch.email
      ? {
          key: "email",
          icon: Mail,
          label: t("branches.info.email"),
          value: branch.email,
          ltr: true,
        }
      : null,
    hours ? { key: "hours", icon: Clock, label: t("branches.info.hours"), value: hours } : null,
  ].filter(Boolean) as {
    key: string;
    icon: typeof Clock;
    label: string;
    value: string;
    ltr?: boolean;
  }[];

  return (
    <div
      key={branch.id}
      className="ds-reveal border-t border-border/50 bg-gradient-to-r from-primary/8 via-card/60 to-card/40 px-4 py-3 md:px-5"
    >
      {/*
       * Always stacked. This used to switch to a single row at the `lg`
       * *viewport* breakpoint, which stopped describing reality once the panel
       * moved inside the explorer's map column: at 1440 that column is roughly
       * 400px, so three tracks on one row squeezed the identity block to a few
       * pixels and `overflow-wrap: anywhere` broke the Arabic branch name one
       * character per line. A column is the honest layout for this container.
       */}
      <div className="flex flex-col gap-4">
        {/* identity: icon + type · city → name → address */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            {branch.is_main_branch ? (
              <Star className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <MapPin className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary/80">
              {branch.is_main_branch ? t("branches.mainBranch") : t("branches.office")} ·{" "}
              {L(branch, "city", "base")}
            </p>
            <h3 className="mt-1 text-card-title font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
              {name}
            </h3>
            <p className="mt-1.5 flex items-start gap-2 text-small leading-relaxed text-muted-foreground">
              <Building2 className="ds-icon-lead text-primary" aria-hidden="true" />
              {/* Never clamped: the address is the whole point of the card. */}
              <span className="min-w-0 [overflow-wrap:anywhere]">{address}</span>
            </p>
          </div>
        </div>

        {/* facts — wrap onto as many rows as they need */}
        {facts.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-3">
            {facts.map((f) => (
              <div key={f.key} className="flex min-w-0 items-center gap-2.5">
                <IconBadge icon={f.icon} size="sm" tone="accent" />
                <div className="min-w-0">
                  <p className="text-caption font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {f.label}
                  </p>
                  <p
                    dir={f.ltr ? "ltr" : undefined}
                    className={cn(
                      "mt-0.5 text-small font-semibold leading-snug text-foreground [overflow-wrap:anywhere]",
                      f.ltr && "text-start",
                    )}
                  >
                    {f.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* actions — always a separate group, never shrink into the text */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {branch.phone && (
            <>
              <a
                href={whatsappHref(branch.phone)}
                target="_blank"
                rel="noopener noreferrer"
                title={t("branches.whatsapp")}
                aria-label={t("branches.whatsapp")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                title={t("branches.call")}
                aria-label={t("branches.call")}
                className={ACTION_BTN}
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
              </a>
            </>
          )}
          <a
            href={mapsHref(branch)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("branches.directions")}
            aria-label={t("branches.directions")}
            className={ACTION_BTN}
          >
            <Navigation className="h-5 w-5" aria-hidden="true" />
          </a>
          <button
            type="button"
            title={t("branches.copyAddress")}
            aria-label={t("branches.copyAddress")}
            onClick={() => copyToClipboard(`${name} — ${address}`, t("branches.addressCopied"))}
            className={ACTION_BTN}
          >
            <Copy className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- contact form */

const fieldBase =
  "peer h-14 w-full rounded-lg border border-border/60 bg-background/60 px-4 pt-5 pb-1.5 text-input text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-base ease-standard placeholder:text-transparent hover:border-primary/40 focus:border-primary focus:bg-background focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_14%,transparent)] user-invalid:border-destructive user-invalid:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-destructive)_12%,transparent)]";
const labelBase =
  "pointer-events-none absolute start-4 top-4 text-small text-muted-foreground transition-all duration-base ease-standard peer-focus:top-1.5 peer-focus:text-caption peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-caption peer-user-invalid:text-destructive";

function Field({
  name,
  label,
  type = "text",
  required,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={`cf-${name}`}
        name={name}
        type={type}
        required={required}
        placeholder=" "
        className={fieldBase}
      />
      <label htmlFor={`cf-${name}`} className={labelBase}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
    </div>
  );
}

function ContactForm({
  branches,
  info,
  defaultBranchId,
}: {
  branches: Branch[];
  info: ContactInfo[];
  defaultBranchId?: string | null;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const whatsappItem = info.find((i) => i.key === "whatsapp");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [branchId, setBranchId] = useState<string>("");
  const sendMessage = useServerFn(submitContactMessage);

  useEffect(() => {
    if (defaultBranchId) setBranchId(defaultBranchId);
  }, [defaultBranchId]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    // Localized through the same helper the branch UI uses, so the subject
    // matches the language the visitor is actually reading.
    const selectedBranch = branches.find((b) => b.id === branchId);
    const branchName = selectedBranch ? L(selectedBranch, "name", "base") : "";
    const subjectRaw = String(form.get("subject") ?? "");
    const subject = branchName ? `[${branchName}] ${subjectRaw}` : subjectRaw;
    setLoading(true);
    try {
      await sendMessage({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          subject,
          message: String(form.get("message") ?? ""),
        },
      });
    } catch (err) {
      console.error(err);
      toast.error(t("contact.error"));
      return;
    } finally {
      setLoading(false);
    }
    setSent(true);
    formEl.reset();
    setTimeout(() => setSent(false), 5000);
    toast.success(t("contact.success"));
  };

  return (
    <div className="ds-reveal relative h-full overflow-hidden rounded-card-lg border border-border-subtle bg-card p-5 md:p-7">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-28 start-[-10%] h-64 w-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          {t("branches.contactKicker")}
        </p>
        <h3 className="mt-1 text-h4 font-bold leading-snug text-foreground">
          {t("branches.form.title")}
        </h3>
        <p className="mt-1 max-w-md text-small leading-relaxed text-muted-foreground">
          {t("branches.form.subtitle")}
        </p>
      </div>

      {sent && (
        <div className="ds-reveal relative mt-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3.5 text-primary">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </span>
          <p className="text-small font-semibold">{t("branches.form.thanks")}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="name" label={t("contact.name")} required />
        <Field name="phone" label={t("contact.phone")} required />
        <Field name="email" label={t("contact.email")} type="email" required />
        <Field name="subject" label={t("contact.subject")} />

        {branches.length > 0 && (
          <div className="sm:col-span-2">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger
                aria-label={t("branches.form.selectBranch")}
                className="h-14 w-full rounded-lg border border-border/60 bg-background/60 px-4 text-input transition-[border-color,box-shadow] duration-base ease-standard hover:border-primary/40 focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_14%,transparent)]"
              >
                <SelectValue placeholder={t("branches.form.selectBranch")} />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {L(b, "name", "base")} — {L(b, "city", "base")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative sm:col-span-2">
          <textarea
            id="cf-message"
            name="message"
            required
            rows={5}
            placeholder=" "
            className="peer block w-full resize-none rounded-lg border border-border/60 bg-background/60 px-4 pb-3.5 pt-6 text-input leading-relaxed text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-base ease-standard placeholder:text-transparent hover:border-primary/40 focus:border-primary focus:bg-background focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_14%,transparent)] user-invalid:border-destructive user-invalid:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-destructive)_12%,transparent)]"
          />
          <label htmlFor="cf-message" className={labelBase}>
            {t("contact.message")}
            <span className="text-primary"> *</span>
          </label>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-6 sm:flex-1 text-button font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <Send className="h-4 w-4 shrink-0 transition-transform duration-base ease-standard group-hover:-translate-y-0.5" />
            )}
            {loading ? t("common.loading") : t("contact.send")}
          </button>
          {whatsappItem && (
            <a
              href={whatsappHref(whatsappItem.value)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full border border-border/60 bg-background/60 px-5 text-small font-semibold text-foreground/80 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {t("branches.form.whatsappInstead")}
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------- section */

export function BranchesSection() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data, isLoading } = useQuery(branchesQuery());
  const { data: infoData } = useQuery(contactInfoQuery());
  const branches = useMemo(() => data ?? [], [data]);
  const info = useMemo(() => infoData ?? [], [infoData]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const { ref: mapRef, inView: mapInView } = useInView<HTMLDivElement>({
    rootMargin: "250px 0px",
  });

  useEffect(() => setMounted(true), []);

  /** city id = base column value (stable), label = localized value */
  const cities = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) {
      if (b.city && !map.has(b.city)) map.set(b.city, L(b, "city", "base"));
    }
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [branches, L]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) => {
      const cityOk = city === "all" || b.city === city;
      const qOk =
        !q ||
        [
          b.name,
          b.name_fr,
          b.name_en,
          b.city,
          b.city_fr,
          b.city_en,
          b.address,
          b.address_fr,
          b.address_en,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      return cityOk && qOk;
    });
  }, [branches, search, city]);

  /* keep an active branch at all times so the detail panel is never empty */
  useEffect(() => {
    if (!filtered.length) return;
    if (activeId && filtered.some((b) => b.id === activeId)) return;
    setActiveId((filtered.find((b) => b.is_main_branch) ?? filtered[0]).id);
  }, [filtered, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const el = cardRefs.current[activeId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  if (!isLoading && branches.length === 0) return null;

  const jsonLd = branches.map((b) => ({
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: b.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address,
      addressLocality: b.city,
      addressCountry: "TN",
    },
    telephone: b.phone ?? undefined,
    email: b.email ?? undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
    },
    openingHours: b.working_hours ?? undefined,
    url: b.google_maps_url ?? undefined,
  }));

  const activeBranch = branches.find((b) => b.id === activeId) ?? null;

  return (
    <section
      id="branches"
      aria-labelledby="branches-heading"
      className="relative isolate overflow-hidden py-16 md:py-20"
    >
      {jsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        />
      )}

      {/* ---------- ambient background ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/25 to-background" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--color-border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-border) 55%, transparent) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 20%, transparent 75%)",
          }}
        />
        <div className="absolute -top-40 start-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/*
       * The composition grows with the screen instead of stopping at one cap.
       * On a 1920 display the old fixed 86rem left ~270px of empty page on each
       * side while the branch list inside was too narrow to read; the wider cap
       * and the roomier gutters spend that space on the content.
       */}
      <div className="relative mx-auto flex w-full max-w-[86rem] flex-col gap-6 px-4 md:px-6 lg:px-8 2xl:max-w-[104rem] 2xl:px-12">
        {/* ---------- header ---------- */}
        <header className="ds-reveal flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-caption font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {t("branches.kicker")}
          </span>
          <h2
            id="branches-heading"
            className="max-w-2xl text-h1 font-bold leading-[1.15] tracking-tight text-foreground"
          >
            {t("branches.title")}
          </h2>
          <p className="max-w-xl text-body leading-relaxed text-muted-foreground">
            {t("branches.subtitle")}
          </p>
        </header>

        {/*
         * One row, two experiences: where we are, and how to reach us.
         *
         * The standalone "general contact information" card that used to sit
         * beside the form is gone — it restated the branch phone, e-mail and
         * head-office address that the selected branch already shows, so the
         * section asked the visitor to read the same details twice and pushed
         * the form below the fold. Those values are unchanged in the database
         * and still render inside the selected-branch panel and the footer.
         *
         * The map leads at 1.15fr because it carries the photography-like
         * weight; `items-start` keeps both cards on the same top edge whatever
         * their natural heights.
         */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)] lg:gap-6 xl:grid-cols-[minmax(0,2.05fr)_minmax(380px,1fr)] 2xl:grid-cols-[minmax(0,2.6fr)_minmax(420px,1fr)]">
          {/* ---------- where we are: one branch explorer ---------- */}
          <div className="ds-reveal flex h-full flex-col overflow-hidden rounded-card-lg border border-border-subtle bg-card">
            {/*
             * Search and the city filters span the whole card, above the split.
             *
             * They used to live inside the branch-picker column, which is the
             * narrowest part of the layout: at 1440 the chip row needed 431px
             * and had 297px, so two of the four cities were scrolled out of
             * sight with nothing saying so. No width the picker column can
             * reasonably take would fit them — the controls belong to the whole
             * explorer, not to one of its two panes, and up here they get the
             * card's full width. The picker keeps the space it used to spend on
             * a header for branch tiles instead.
             */}
            <div className="flex flex-col gap-2.5 border-b border-border/50 bg-muted/30 px-4 py-3 md:px-5 md:py-3.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("branches.ourBranches")}
                </p>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-caption font-bold text-primary">
                  {filtered.length} {t("branches.branchesCount")}
                </span>
                <div className="relative ms-auto w-full sm:w-64 xl:w-72">
                  <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label={t("branches.searchPlaceholder")}
                    placeholder={t("branches.searchPlaceholder")}
                    className="h-11 w-full rounded-full border border-border/60 bg-background/70 ps-10 pe-4 text-small text-foreground outline-none transition-all duration-base ease-standard placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_12%,transparent)]"
                  />
                </div>
              </div>
              {cities.length > 1 && (
                /*
                 * Wraps rather than scrolls. A chip row that overflows its
                 * container hides options behind an edge with nothing to say so;
                 * wrapping shows every city at every width, and the toolbar is
                 * now wide enough that it stays one line on desktop anyway.
                 */
                <div
                  role="group"
                  aria-label={t("branches.allCities")}
                  className="flex flex-wrap gap-2"
                >
                  {[{ id: "all", label: t("branches.allCities") }, ...cities].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCity(c.id)}
                      aria-pressed={city === c.id}
                      className={cn(
                        "h-11 shrink-0 rounded-full border px-4 text-caption font-semibold transition-all duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        city === c.id
                          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/*
             * The explorer owns its own two-column layout: the map takes the
             * larger share and the branch picker sits beside it, sharing one
             * outer surface. Below `md` they stack — map, selected branch, then
             * the picker — because a side-by-side pair at phone width leaves
             * both halves too narrow to use.
             */}
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(250px,1.05fr)] lg:grid-cols-[minmax(0,1.68fr)_minmax(275px,1.05fr)] xl:grid-cols-[minmax(0,1.62fr)_minmax(310px,1.05fr)] lg:min-h-[400px]">
              {/* map + the selected branch's live details */}
              <div className="order-1 flex min-w-0 flex-col">
                {/* map — chunk + tiles load only once the panel nears the viewport */}
                <div
                  ref={mapRef}
                  className="relative h-[320px] sm:h-[380px] md:h-auto md:min-h-[310px] md:flex-1"
                >
                  <Suspense fallback={<MapSkeleton />}>
                    {mounted && mapInView && filtered.length > 0 ? (
                      <BranchesMap branches={filtered} activeId={activeId} onSelect={setActiveId} />
                    ) : (
                      <MapSkeleton />
                    )}
                  </Suspense>

                  <div className="pointer-events-none absolute top-4 start-4 z-[500] hidden max-w-xs rounded-lg border border-border/50 bg-background/85 px-4 py-3 shadow-xl backdrop-blur-xl md:block">
                    <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
                      {activeBranch ? L(activeBranch, "city", "base") : t("branches.ourBranches")}
                    </p>
                    <p className="mt-0.5 text-small font-bold leading-snug text-foreground">
                      {activeBranch
                        ? L(activeBranch, "name", "base")
                        : `${filtered.length} ${t("branches.branchesCount")}`}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted-foreground">
                      {activeBranch ? L(activeBranch, "address", "base") : t("branches.selectHint")}
                    </p>
                  </div>
                </div>

                {/* live details for the selected branch */}
                {activeBranch && <ActiveBranchPanel branch={activeBranch} />}
              </div>
              {/*
               * Side by side, the picker must take the row's height rather than
               * set it. A grid item is sized by its content even with
               * `min-height: 0`, so the tile list made the row as tall as every
               * branch stacked up and the map sat in a column padded with empty
               * space. Taking the scroller out of flow (`md:absolute inset-0`)
               * leaves the row height to the map column and lets the tiles
               * scroll inside exactly that height, so both halves end level.
               * Below `md` the two are stacked, so it goes back in flow.
               */}
              <div className="order-2 flex min-w-0 flex-col border-t border-border/50 md:relative md:border-t-0 md:border-s">
                <div className="flex max-h-[320px] min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:absolute md:inset-0 md:max-h-none md:p-3.5">
                  {isLoading ? (
                    [0, 1, 2].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
                    ))
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center">
                      <MapPin className="mx-auto h-7 w-7 text-muted-foreground/60" />
                      <p className="mt-3 text-small font-semibold text-foreground">
                        {t("branches.noResults")}
                      </p>
                    </div>
                  ) : (
                    filtered.map((b, i) => (
                      <BranchTile
                        key={b.id}
                        branch={b}
                        index={i}
                        active={b.id === activeId}
                        onSelect={setActiveId}
                        refStore={cardRefs}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ---------- how to reach us ---------- */}
          <ContactForm branches={branches} info={info} defaultBranchId={activeId} />
        </div>
      </div>
    </section>
  );
}
