import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MapPin,
  Phone,
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { branchesQuery, contactInfoQuery, type Branch, type ContactInfo } from "@/lib/queries";

const BranchesMap = lazy(() => import("./BranchesMap"));

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Sparkles,
  whatsapp: MessageCircle,
};

const SOCIAL_KEYS = ["facebook", "instagram", "youtube", "twitter", "tiktok"];

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
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

function BranchTile({
  branch,
  active,
  onSelect,
  cardRef,
  index,
}: {
  branch: Branch;
  active: boolean;
  onSelect: (id: string) => void;
  cardRef?: (el: HTMLElement | null) => void;
  index: number;
}) {
  const { t } = useTranslation();

  return (
    <article
      ref={cardRef}
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
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-base ease-standard",
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

      <div className="min-w-0 flex-1">
        <p className="truncate text-caption font-semibold uppercase tracking-[0.16em] text-primary/80">
          {branch.is_main_branch ? t("branches.mainBranch") : t("branches.office")} · {branch.city}
        </p>
        <h3 className="mt-0.5 truncate text-small font-bold leading-snug text-foreground">
          {branch.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-caption leading-relaxed text-muted-foreground">
          {branch.address}
        </p>
      </div>

      {active && (
        <span className="mt-1 shrink-0 rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground">
          {t("branches.active")}
        </span>
      )}
    </article>
  );
}

/* ------------------------------------------- active branch detail panel */

function ActiveBranchPanel({ branch }: { branch: Branch }) {
  const { t } = useTranslation();

  const facts = [
    branch.working_hours
      ? { key: "hours", icon: Clock, label: t("branches.info.hours"), value: branch.working_hours }
      : null,
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
      ? { key: "email", icon: Mail, label: t("branches.info.email"), value: branch.email, ltr: true }
      : null,
    { key: "address", icon: Building2, label: t("branches.info.headquarters"), value: branch.address },
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
      className="ds-reveal border-t border-border/50 bg-gradient-to-r from-primary/8 via-card/60 to-card/40 px-4 py-4 md:px-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {facts.map((f) => (
            <div key={f.key} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-caption font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {f.label}
                </p>
                <p
                  dir={f.ltr ? "ltr" : undefined}
                  className="mt-0.5 line-clamp-2 text-small font-semibold leading-snug text-foreground"
                >
                  {f.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          {branch.phone && (
            <>
              <a
                href={whatsappHref(branch.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-small font-bold text-primary-foreground shadow-sm shadow-primary/25 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/35"
              >
                <MessageCircle className="h-4 w-4" />
                {t("branches.whatsapp")}
              </a>
              <a
                href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 text-small font-semibold text-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                {t("branches.call")}
              </a>
            </>
          )}
          <a
            href={mapsHref(branch)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 text-small font-semibold text-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
          >
            <Navigation className="h-4 w-4" />
            {t("branches.directions")}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <button
            type="button"
            onClick={() => copyToClipboard(`${branch.name} — ${branch.address}`, t("branches.addressCopied"))}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 text-small font-semibold text-muted-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
          >
            <Copy className="h-4 w-4" />
            {t("branches.copyAddress")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- info panel */

type InfoRow = {
  key: string;
  icon: typeof Phone;
  title: string;
  value: string;
  href?: string;
  external?: boolean;
  copy?: string;
  ltr?: boolean;
  actionLabel?: string;
};

function useContactRows(items: ContactInfo[]) {
  const { t } = useTranslation();
  const phone = items.find((i) => i.key === "phone" || i.key === "mobile");
  const whatsapp = items.find((i) => i.key === "whatsapp");
  const email = items.find((i) => i.key === "email");
  const address = items.find((i) => i.key === "address" || i.key === "headquarters");
  const hours = items.find((i) => i.key === "hours" || i.key === "working_hours");

  const rows: InfoRow[] = [];
  if (whatsapp)
    rows.push({
      key: "whatsapp",
      icon: MessageCircle,
      title: t("branches.info.whatsapp"),
      value: whatsapp.value,
      href: whatsappHref(whatsapp.value),
      external: true,
      ltr: true,
      actionLabel: t("branches.whatsapp"),
    });
  if (phone)
    rows.push({
      key: "phone",
      icon: Phone,
      title: t("branches.info.phone"),
      value: phone.value,
      href: `tel:${phone.value.replace(/\s+/g, "")}`,
      copy: phone.value,
      ltr: true,
      actionLabel: t("branches.call"),
    });
  if (email)
    rows.push({
      key: "email",
      icon: Mail,
      title: t("branches.info.email"),
      value: email.value,
      href: `mailto:${email.value}`,
      copy: email.value,
      ltr: true,
      actionLabel: t("branches.copy"),
    });
  if (address)
    rows.push({
      key: "address",
      icon: Building2,
      title: t("branches.info.headquarters"),
      value: address.value,
      copy: address.value,
      actionLabel: t("branches.copyAddress"),
    });
  if (hours)
    rows.push({
      key: "hours",
      icon: Clock,
      title: t("branches.info.hours"),
      value: hours.value,
    });
  return rows;
}

function InfoPanel({ items }: { items: ContactInfo[] }) {
  const { t } = useTranslation();
  const rows = useContactRows(items);
  const socials = items.filter((i) => SOCIAL_KEYS.includes(i.key));

  if (rows.length === 0 && socials.length === 0) return null;

  return (
    <aside className="ds-reveal relative flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-card/90 to-card/60 shadow-lg shadow-primary/5 backdrop-blur-xl">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 end-[-15%] h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative border-b border-border/50 px-5 py-4">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          {t("branches.contactKicker")}
        </p>
        <h3 className="mt-1 text-h5 font-bold leading-snug text-foreground">
          {t("branches.info.title")}
        </h3>
      </div>

      <ul className="relative flex-1 divide-y divide-border/50">
        {rows.map((r, i) => (
          <li
            key={r.key}
            style={{ animationDelay: `${i * 50}ms` }}
            className="ds-reveal group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-base ease-standard hover:bg-muted/40"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-base ease-standard group-hover:scale-105",
                r.key === "whatsapp"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-primary/10 text-primary",
              )}
            >
              <r.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {r.title}
              </p>
              {r.href ? (
                <a
                  href={r.href}
                  target={r.external ? "_blank" : undefined}
                  rel={r.external ? "noopener noreferrer" : undefined}
                  dir={r.ltr ? "ltr" : undefined}
                  className="mt-0.5 block truncate text-small font-bold text-foreground transition-colors duration-base hover:text-primary"
                >
                  {r.value}
                </a>
              ) : (
                <p className="mt-0.5 text-small font-semibold leading-relaxed text-foreground">
                  {r.value}
                </p>
              )}
            </div>
            {r.href && r.actionLabel && (
              <a
                href={r.href}
                target={r.external ? "_blank" : undefined}
                rel={r.external ? "noopener noreferrer" : undefined}
                className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-caption font-semibold text-primary transition-all duration-base ease-standard hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground sm:inline-flex"
              >
                {r.actionLabel}
              </a>
            )}
            {!r.href && r.copy && (
              <button
                type="button"
                onClick={() => copyToClipboard(r.copy!, t("branches.copied"))}
                className="hidden shrink-0 items-center gap-1 rounded-full border border-border/60 px-3 py-1.5 text-caption font-semibold text-muted-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary sm:inline-flex"
              >
                <Copy className="h-3 w-3" />
                {t("branches.copy")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {socials.length > 0 && (
        <div className="relative flex items-center justify-between gap-4 border-t border-border/50 bg-muted/30 px-5 py-3.5">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("branches.contactCard.follow")}
          </p>
          <div className="flex items-center gap-2">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.key] ?? Sparkles;
              return (
                <a
                  key={s.id}
                  href={s.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label ?? s.key}
                  title={s.label ?? s.key}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/70 text-primary transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

/* --------------------------------------------------------- contact form */

const fieldBase =
  "peer h-14 w-full rounded-lg border border-border/60 bg-background/60 px-4 pt-5 pb-1.5 text-input text-foreground outline-none transition-all duration-base ease-standard placeholder:text-transparent hover:border-primary/40 focus:border-primary focus:bg-background focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_14%,transparent)]";
const labelBase =
  "pointer-events-none absolute start-4 top-4 text-small text-muted-foreground transition-all duration-base ease-standard peer-focus:top-1.5 peer-focus:text-caption peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-caption";

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
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
  const whatsappItem = info.find((i) => i.key === "whatsapp");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [branchId, setBranchId] = useState<string>("");

  useEffect(() => {
    if (defaultBranchId) setBranchId(defaultBranchId);
  }, [defaultBranchId]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const branchName = branches.find((b) => b.id === branchId)?.name;
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
    <div className="ds-reveal relative h-full overflow-hidden rounded-xl border border-border/50 bg-card/80 p-5 shadow-xl shadow-primary/10 backdrop-blur-xl md:p-7">
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

      <form onSubmit={onSubmit} className="relative mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field name="name" label={t("contact.name")} required />
        <Field name="phone" label={t("contact.phone")} required />
        <Field name="email" label={t("contact.email")} type="email" required />
        <Field name="subject" label={t("contact.subject")} />

        {branches.length > 0 && (
          <div className="sm:col-span-2">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-14 w-full rounded-lg border-border/60 bg-background/60 px-4 text-input">
                <SelectValue placeholder={t("branches.form.selectBranch")} />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} — {b.city}
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
            rows={4}
            placeholder=" "
            className="peer w-full resize-none rounded-lg border border-border/60 bg-background/60 px-4 pb-3 pt-6 text-input text-foreground outline-none transition-all duration-base ease-standard placeholder:text-transparent hover:border-primary/40 focus:border-primary focus:bg-background focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_14%,transparent)]"
          />
          <label htmlFor="cf-message" className={labelBase}>
            {t("contact.message")}
            <span className="text-primary"> *</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-button font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 transition-transform duration-base ease-standard group-hover:-translate-y-0.5" />
            )}
            {loading ? t("common.loading") : t("contact.send")}
          </button>
          {whatsappItem && (
            <a
              href={whatsappHref(whatsappItem.value)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-background/60 px-6 py-3.5 text-small font-semibold text-foreground/80 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
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
  const { data, isLoading } = useQuery(branchesQuery());
  const { data: infoData } = useQuery(contactInfoQuery());
  const branches = useMemo(() => data ?? [], [data]);
  const info = useMemo(() => infoData ?? [], [infoData]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => setMounted(true), []);

  const cities = useMemo(
    () => Array.from(new Set(branches.map((b) => b.city).filter(Boolean))) as string[],
    [branches],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) => {
      const cityOk = city === "all" || b.city === city;
      const qOk =
        !q ||
        [b.name, b.city, b.address].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 md:px-6 lg:px-8">
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

        {/* ---------- large contact card: branches + map + live details ---------- */}
        <div className="ds-reveal overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* branch selector */}
            <div className="order-2 flex flex-col border-border/50 lg:order-1 lg:col-span-5 lg:border-e xl:col-span-4">
              <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/30 px-4 py-3.5 md:px-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
                    {t("branches.ourBranches")}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-caption font-bold text-primary">
                    {filtered.length} {t("branches.branchesCount")}
                  </span>
                </div>
                <div className="relative">
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
                {cities.length > 1 && (
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
                    {[
                      { id: "all", label: t("branches.allCities") },
                      ...cities.map((c) => ({ id: c, label: c })),
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCity(c.id)}
                        aria-pressed={city === c.id}
                        className={cn(
                          "h-9 shrink-0 rounded-full border px-3.5 text-caption font-semibold transition-all duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
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

              <div className="flex max-h-[320px] flex-col gap-2.5 overflow-y-auto p-3.5 md:p-4 lg:max-h-[372px]">
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
                      cardRef={(el) => {
                        cardRefs.current[b.id] = el;
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* map */}
            <div className="relative order-1 h-[300px] lg:order-2 lg:col-span-7 lg:h-auto lg:min-h-[480px] xl:col-span-8">
              <Suspense fallback={<MapSkeleton />}>
                {mounted && filtered.length > 0 ? (
                  <BranchesMap branches={filtered} activeId={activeId} onSelect={setActiveId} />
                ) : (
                  <MapSkeleton />
                )}
              </Suspense>

              <div className="pointer-events-none absolute top-4 start-4 z-[500] hidden max-w-xs rounded-lg border border-border/50 bg-background/85 px-4 py-3 shadow-xl backdrop-blur-xl md:block">
                <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
                  {activeBranch ? activeBranch.city : t("branches.ourBranches")}
                </p>
                <p className="mt-0.5 text-small font-bold leading-snug text-foreground">
                  {activeBranch
                    ? activeBranch.name
                    : `${filtered.length} ${t("branches.branchesCount")}`}
                </p>
                <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted-foreground">
                  {activeBranch ? activeBranch.address : t("branches.selectHint")}
                </p>
              </div>
            </div>
          </div>

          {/* live details for the selected branch */}
          {activeBranch && <ActiveBranchPanel branch={activeBranch} />}
        </div>

        {/* ---------- form + general contact information ---------- */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ContactForm branches={branches} info={info} defaultBranchId={activeId} />
          </div>
          <div className="lg:col-span-5">
            <InfoPanel items={info} />
          </div>
        </div>
      </div>
    </section>
  );
}
