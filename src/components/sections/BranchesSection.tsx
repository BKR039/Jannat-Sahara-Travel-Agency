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
  Share2,
  Send,
  Check,
  Building2,
  Sparkles,
  Search,
  Loader2,
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
import { branchesQuery, contactInfoQuery, type Branch } from "@/lib/queries";

const BranchesMap = lazy(() => import("./BranchesMap"));

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Sparkles,
  whatsapp: MessageCircle,
};

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
}

/* ---------------------------------------------------------------- atoms */

function MapSkeleton() {
  return (
    <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-xl bg-muted/40">
      <Loader2 className="h-7 w-7 animate-spin text-primary/70" />
    </div>
  );
}

function IconAction({
  label,
  href,
  onClick,
  children,
  external,
}: {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground/70 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  if (href) {
    return (
      <a
        href={href}
        aria-label={label}
        title={label}
        onClick={(e) => e.stopPropagation()}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cls}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* --------------------------------------------------------- branch card */

function BranchCard({
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
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
      className={cn(
        "group ds-reveal relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-6 text-start backdrop-blur-xl",
        "transition-[transform,box-shadow,border-color] duration-moderate ease-standard",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "-translate-y-1 scale-[1.01] border-primary/70 bg-card shadow-2xl shadow-primary/20"
          : "border-border/50 bg-card/70 shadow-sm hover:-translate-y-1.5 hover:scale-[1.01] hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10",
      )}
    >
      {/* luxury lighting */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 end-[-20%] h-56 w-56 rounded-full bg-primary/15 blur-3xl transition-opacity duration-slow",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-70",
        )}
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary/80">
            {branch.is_main_branch ? t("branches.mainBranch") : t("branches.office")} · {branch.city}
          </p>
          <h3 className="mt-1.5 text-h4 font-bold leading-tight text-foreground">{branch.name}</h3>
        </div>
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-all duration-base ease-standard",
            active
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              : "bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:scale-110",
          )}
        >
          {branch.is_main_branch ? (
            <Star className={cn("h-5 w-5", active && "fill-current")} />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </span>
      </header>

      <dl className="relative mt-5 space-y-3 text-small">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
          <dd className="leading-relaxed text-muted-foreground">{branch.address}</dd>
        </div>
        {branch.working_hours && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
            <dd className="text-muted-foreground">{branch.working_hours}</dd>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
            <dd className="font-medium text-foreground/85" dir="ltr">
              {branch.phone}
            </dd>
          </div>
        )}
        {branch.email && (
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
            <dd className="truncate text-muted-foreground">{branch.email}</dd>
          </div>
        )}
      </dl>

      <footer className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-border/50 pt-5">
        {branch.google_maps_url && (
          <a
            href={branch.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-10 flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full bg-primary px-5 text-button font-semibold text-primary-foreground transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Navigation className="h-4 w-4" />
            {t("branches.directions")}
          </a>
        )}
        {branch.phone && (
          <>
            <IconAction label={t("branches.call")} href={`tel:${branch.phone.replace(/\s+/g, "")}`}>
              <Phone className="h-4 w-4" />
            </IconAction>
            <IconAction label={t("branches.whatsapp")} href={whatsappHref(branch.phone)} external>
              <MessageCircle className="h-4 w-4" />
            </IconAction>
          </>
        )}
        <IconAction
          label={t("branches.copyAddress")}
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(`${branch.name} — ${branch.address}`, t("branches.addressCopied"));
          }}
        >
          <Copy className="h-4 w-4" />
        </IconAction>
        <IconAction
          label={t("branches.share")}
          onClick={(e) => {
            e.stopPropagation();
            const url = branch.google_maps_url ?? "";
            if (navigator.share) {
              navigator
                .share({ title: branch.name, text: branch.address, url: url || undefined })
                .catch(() => {});
            } else if (url) {
              copyToClipboard(url, t("branches.linkCopied"));
            } else {
              copyToClipboard(branch.address, t("branches.addressCopied"));
            }
          }}
        >
          <Share2 className="h-4 w-4" />
        </IconAction>
      </footer>
    </article>
  );
}

/* -------------------------------------------------------- contact cards */

function ContactInfoGrid() {
  const { t } = useTranslation();
  const { data } = useQuery(contactInfoQuery());
  const items = data ?? [];

  const phones = items.filter((i) => i.key === "phone" || i.key === "mobile");
  const emails = items.filter((i) => i.key === "email");
  const whatsapp = items.find((i) => i.key === "whatsapp");
  const hours = items.find((i) => i.key === "hours" || i.key === "working_hours");
  const address = items.find((i) => i.key === "address" || i.key === "headquarters");
  const socials = items.filter((i) =>
    ["facebook", "instagram", "youtube", "twitter", "tiktok"].includes(i.key),
  );

  type Card = {
    key: string;
    icon: typeof Phone;
    title: string;
    value: string;
    href?: string;
    copy?: string;
    ltr?: boolean;
  };

  const cards: Card[] = [];
  if (phones[0])
    cards.push({
      key: "phone",
      icon: Phone,
      title: t("branches.info.phone"),
      value: phones[0].value,
      href: `tel:${phones[0].value.replace(/\s+/g, "")}`,
      copy: phones[0].value,
      ltr: true,
    });
  if (whatsapp)
    cards.push({
      key: "whatsapp",
      icon: MessageCircle,
      title: t("branches.info.whatsapp"),
      value: whatsapp.value,
      href: whatsappHref(whatsapp.value),
      copy: whatsapp.value,
      ltr: true,
    });
  if (emails[0])
    cards.push({
      key: "email",
      icon: Mail,
      title: t("branches.info.email"),
      value: emails[0].value,
      href: `mailto:${emails[0].value}`,
      copy: emails[0].value,
      ltr: true,
    });
  if (address)
    cards.push({
      key: "hq",
      icon: Building2,
      title: t("branches.info.headquarters"),
      value: address.value,
    });
  if (hours)
    cards.push({
      key: "hours",
      icon: Clock,
      title: t("branches.info.hours"),
      value: hours.value,
    });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => (
        <div
          key={c.key}
          style={{ animationDelay: `${i * 60}ms` }}
          className="group ds-reveal relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/85 to-card/60 p-6 shadow-sm backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-moderate ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-16 end-[-10%] h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-slow group-hover:opacity-100"
          />
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary transition-transform duration-base ease-standard group-hover:scale-110">
            <c.icon className="h-5 w-5" />
          </div>
          <p className="relative text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {c.title}
          </p>
          {c.href ? (
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              dir={c.ltr ? "ltr" : undefined}
              className="relative mt-1.5 block truncate text-body font-bold text-foreground transition-colors hover:text-primary"
            >
              {c.value}
            </a>
          ) : (
            <p className="relative mt-1.5 text-body font-bold leading-relaxed text-foreground">
              {c.value}
            </p>
          )}
          {c.copy && (
            <button
              type="button"
              onClick={() => copyToClipboard(c.copy!, t("branches.copied"))}
              className="relative mt-4 inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Copy className="h-3 w-3" />
              {t("branches.copy")}
            </button>
          )}
        </div>
      ))}

      {socials.length > 0 && (
        <div className="ds-reveal rounded-xl border border-border/50 bg-gradient-to-br from-primary/10 via-card/70 to-card/60 p-6 shadow-sm backdrop-blur-xl sm:col-span-2">
          <p className="mb-4 text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("branches.contactCard.follow")}
          </p>
          <div className="flex flex-wrap gap-3">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.key] ?? Sparkles;
              return (
                <a
                  key={s.id}
                  href={s.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label ?? s.key}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-background/70 text-primary transition-all duration-base ease-standard hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
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

function ContactForm({ branches }: { branches: Branch[] }) {
  const { t } = useTranslation();
  const { data: info } = useQuery(contactInfoQuery());
  const whatsappItem = info?.find((i) => i.key === "whatsapp");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [branchId, setBranchId] = useState<string>("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const branchName = branches.find((b) => b.id === branchId)?.name;
    const subjectRaw = String(form.get("subject") ?? "");
    const subject = branchName ? `[${branchName}] ${subjectRaw}` : subjectRaw;
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      subject,
      message: String(form.get("message") ?? ""),
    });
    setLoading(false);
    if (error) {
      toast.error(t("contact.error"));
      return;
    }
    setSent(true);
    (e.target as HTMLFormElement).reset();
    setBranchId("");
    setTimeout(() => setSent(false), 5000);
    toast.success(t("contact.success"));
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/75 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl md:p-9">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-28 start-[-10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative">
        <h3 className="text-h3 font-bold text-foreground">{t("branches.form.title")}</h3>
        <p className="mt-2 max-w-md text-small leading-relaxed text-muted-foreground">
          {t("branches.form.subtitle")}
        </p>
      </div>

      {sent && (
        <div className="ds-reveal relative mt-6 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-primary">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-5 w-5" />
          </span>
          <p className="text-small font-semibold">{t("branches.form.thanks")}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="relative mt-7 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label={t("contact.name")} required />
          <Field name="phone" label={t("contact.phone")} required />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="email" label={t("contact.email")} type="email" required />
          <Field name="subject" label={t("contact.subject")} />
        </div>

        {branches.length > 0 && (
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-14 rounded-lg border-border/60 bg-background/60 px-4 text-input">
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
        )}

        <div className="relative">
          <textarea
            id="cf-message"
            name="message"
            required
            rows={5}
            placeholder=" "
            className="peer w-full resize-none rounded-lg border border-border/60 bg-background/60 px-4 pb-3 pt-6 text-input text-foreground outline-none transition-all duration-base ease-standard placeholder:text-transparent hover:border-primary/40 focus:border-primary focus:bg-background focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_14%,transparent)]"
          />
          <label htmlFor="cf-message" className={labelBase}>
            {t("contact.message")}
            <span className="text-primary"> *</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="group inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 text-button font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
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
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-6 text-button font-semibold text-primary transition-all duration-base ease-standard hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground"
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
  const branches = useMemo(() => data ?? [], [data]);
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
      className="relative overflow-hidden py-24 md:py-32"
    >
      {jsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* ---------- ambient background ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        <div className="absolute -top-32 start-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 end-[-10%] h-[26rem] w-[26rem] rounded-full bg-primary/5 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        {/* ---------- section header ---------- */}
        <header className="ds-reveal mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-caption font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {t("branches.kicker")}
          </span>
          <h2 id="branches-heading" className="mt-6 text-h1 font-bold leading-[1.15] text-foreground">
            {t("branches.title")}
          </h2>
          <p className="mt-5 max-w-2xl text-body-lg leading-relaxed text-muted-foreground">
            {t("branches.subtitle")}
          </p>
          <span
            aria-hidden
            className="mt-8 h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent"
          />
        </header>

        {/* ---------- map centerpiece ---------- */}
        <div className="ds-reveal relative mt-14">
          <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/40 p-2 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-3">
            <div className="relative h-[380px] overflow-hidden rounded-lg sm:h-[460px] lg:h-[560px]">
              <Suspense fallback={<MapSkeleton />}>
                {mounted && filtered.length > 0 ? (
                  <BranchesMap branches={filtered} activeId={activeId} onSelect={setActiveId} />
                ) : (
                  <MapSkeleton />
                )}
              </Suspense>

              {/* floating glass status card */}
              <div className="pointer-events-none absolute top-4 start-4 z-[500] hidden max-w-xs rounded-lg border border-border/50 bg-background/75 px-5 py-4 shadow-xl backdrop-blur-xl md:block">
                <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("branches.ourBranches")}
                </p>
                <p className="mt-1 text-h5 font-bold text-foreground">
                  {activeBranch ? activeBranch.name : `${filtered.length} ${t("branches.branchesCount")}`}
                </p>
                <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
                  {activeBranch ? activeBranch.address : t("branches.selectHint")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- filters ---------- */}
        <div className="ds-reveal mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("branches.searchPlaceholder")}
              placeholder={t("branches.searchPlaceholder")}
              className="h-12 w-full rounded-full border border-border/60 bg-card/70 ps-11 pe-4 text-small text-foreground outline-none backdrop-blur transition-all duration-base ease-standard placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-orange-500)_12%,transparent)]"
            />
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {[{ id: "all", label: t("branches.allCities") }, ...cities.map((c) => ({ id: c, label: c }))].map(
              (c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCity(c.id)}
                  aria-pressed={city === c.id}
                  className={cn(
                    "h-11 shrink-0 rounded-full border px-5 text-small font-semibold transition-all duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    city === c.id
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "border-border/60 bg-card/60 text-muted-foreground backdrop-blur hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ),
            )}
          </div>
        </div>

        {/* ---------- branch cards ---------- */}
        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/50 p-12 text-center backdrop-blur">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-4 text-body font-semibold text-foreground">
                {t("branches.noResults")}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((b, i) => (
                <BranchCard
                  key={b.id}
                  branch={b}
                  index={i}
                  active={b.id === activeId}
                  onSelect={setActiveId}
                  cardRef={(el) => {
                    cardRefs.current[b.id] = el;
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------- contact experience ---------- */}
        <div className="mt-28 md:mt-32">
          <header className="ds-reveal mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-caption font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
              {t("branches.contactKicker")}
            </span>
            <h2 className="mt-6 text-h2 font-bold leading-[1.2] text-foreground">
              {t("branches.info.title")}
            </h2>
            <p className="mt-4 text-body-lg leading-relaxed text-muted-foreground">
              {t("branches.info.subtitle")}
            </p>
          </header>

          <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <ContactInfoGrid />
            </div>
            <div className="lg:col-span-7">
              <ContactForm branches={branches} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
