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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeading } from "@/components/common/SectionHeading";
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

function MapSkeleton() {
  return (
    <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl bg-muted/40">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
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

function BranchCard({
  branch,
  active,
  onSelect,
  cardRef,
}: {
  branch: Branch;
  active: boolean;
  onSelect: (id: string) => void;
  cardRef?: (el: HTMLElement | null) => void;
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
      className={`group relative cursor-pointer rounded-xl border bg-card/80 p-5 backdrop-blur-xl transition-all duration-moderate focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
        ${
          active
            ? "-translate-y-1 border-primary shadow-2xl shadow-primary/25 ring-1 ring-primary/40"
            : "border-border/60 shadow-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
        }`}
    >
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-gradient-to-br from-primary/15 to-primary/5 text-primary"
            }`}
          >
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-bold leading-tight">{branch.name}</h3>
            <p className="text-caption text-muted-foreground">{branch.city}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {branch.is_main_branch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-caption font-bold text-primary">
              <Star className="h-3 w-3 fill-primary" />
              {t("branches.mainBranch")}
            </span>
          )}
          {active && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground">
              <Check className="h-3 w-3" />
              {t("branches.active")}
            </span>
          )}
        </div>
      </div>

      <p className="relative mt-3 text-small text-muted-foreground">{branch.address}</p>

      <div className="relative mt-3 space-y-1.5 text-caption">
        {branch.phone && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span dir="ltr">{branch.phone}</span>
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-2 truncate text-foreground/80">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{branch.email}</span>
          </div>
        )}
        {branch.working_hours && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{branch.working_hours}</span>
          </div>
        )}
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {branch.google_maps_url && (
          <Button
            size="sm"
            asChild
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => e.stopPropagation()}
          >
            <a href={branch.google_maps_url} target="_blank" rel="noopener noreferrer">
              <Navigation className="me-1.5 h-3.5 w-3.5" />
              {t("branches.directions")}
            </a>
          </Button>
        )}
        {branch.phone && (
          <>
            <Button
              size="sm"
              variant="outline"
              asChild
              onClick={(e) => e.stopPropagation()}
              aria-label={t("branches.call")}
            >
              <a href={`tel:${branch.phone.replace(/\s+/g, "")}`}>
                <Phone className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              asChild
              onClick={(e) => e.stopPropagation()}
              aria-label={t("branches.whatsapp")}
            >
              <a href={whatsappHref(branch.phone)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        )}
        {branch.google_maps_url && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator
                  .share({ title: branch.name, text: branch.address, url: branch.google_maps_url! })
                  .catch(() => {});
              } else {
                copyToClipboard(branch.google_maps_url!, t("branches.linkCopied"));
              }
            }}
            aria-label={t("branches.share")}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}

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
  };

  const cards: Card[] = [];
  if (phones[0]) {
    cards.push({
      key: "phone",
      icon: Phone,
      title: t("branches.info.phone"),
      value: phones[0].value,
      href: `tel:${phones[0].value.replace(/\s+/g, "")}`,
      copy: phones[0].value,
    });
  }
  if (whatsapp) {
    cards.push({
      key: "whatsapp",
      icon: MessageCircle,
      title: t("branches.info.whatsapp"),
      value: whatsapp.value,
      href: whatsappHref(whatsapp.value),
      copy: whatsapp.value,
    });
  }
  if (emails[0]) {
    cards.push({
      key: "email",
      icon: Mail,
      title: t("branches.info.email"),
      value: emails[0].value,
      href: `mailto:${emails[0].value}`,
      copy: emails[0].value,
    });
  }
  if (address) {
    cards.push({
      key: "hq",
      icon: Building2,
      title: t("branches.info.headquarters"),
      value: address.value,
    });
  }
  if (hours) {
    cards.push({
      key: "hours",
      icon: Clock,
      title: t("branches.info.hours"),
      value: hours.value,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.key}
          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-moderate hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary transition-transform group-hover:scale-110">
            <c.icon className="h-5 w-5" />
          </div>
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {c.title}
          </p>
          {c.href ? (
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="mt-1 block truncate text-small font-bold text-foreground hover:text-primary"
              dir={c.key === "phone" || c.key === "whatsapp" ? "ltr" : undefined}
            >
              {c.value}
            </a>
          ) : (
            <p className="mt-1 text-small font-bold text-foreground">{c.value}</p>
          )}
          {c.copy && (
            <button
              type="button"
              onClick={() => copyToClipboard(c.copy!, t("branches.copied"))}
              className="mt-3 inline-flex items-center gap-1 text-caption font-medium text-muted-foreground transition-colors hover:text-primary"
              aria-label={t("branches.copy")}
            >
              <Copy className="h-3 w-3" />
              {t("branches.copy")}
            </button>
          )}
        </div>
      ))}

      {socials.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/70 to-card/60 p-5 shadow-sm backdrop-blur-xl sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <p className="mb-3 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {t("branches.contactCard.follow")}
          </p>
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.key] ?? Sparkles;
              return (
                <a
                  key={s.id}
                  href={s.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label ?? s.key}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/70 text-primary transition-all duration-base ease-standard hover:scale-110 hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      )}
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
    setTimeout(() => setSent(false), 4000);
    toast.success(t("contact.success"));
  };

  return (
    <div className="grid gap-6 rounded-xl border border-border/60 bg-card/70 p-6 shadow-xl shadow-primary/5 backdrop-blur-xl md:p-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h3 className="text-h3 font-bold">{t("branches.form.title")}</h3>
        <p className="mt-2 text-small text-muted-foreground">{t("branches.form.subtitle")}</p>
        {whatsappItem && (
          <a
            href={whatsappHref(whatsappItem.value)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-small font-semibold text-primary transition-all duration-base ease-standard hover:bg-primary hover:text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            {t("branches.form.whatsappInstead")}
          </a>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4 lg:col-span-3">
        {sent && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-primary ds-reveal">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-small font-semibold">{t("branches.form.thanks")}</div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="name" required placeholder={t("contact.name")} />
          <Input name="phone" required placeholder={t("contact.phone")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="email" type="email" required placeholder={t("contact.email")} />
          <Input name="subject" placeholder={t("contact.subject")} />
        </div>
        {branches.length > 0 && (
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger>
              <SelectValue placeholder={t("branches.form.selectBranch")} />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} — {b.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Textarea name="message" required rows={5} placeholder={t("contact.message")} />
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="me-2 h-4 w-4" />
          {loading ? t("common.loading") : t("contact.send")}
        </Button>
      </form>
    </div>
  );
}

export function BranchesSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(branchesQuery());
  const branches = useMemo(() => data ?? [], [data]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => setMounted(true), []);

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

  return (
    <section
      id="branches"
      aria-labelledby="branches-heading"
      className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-28"
    >
      {jsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 end-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 start-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          eyebrow="✦"
          title={t("branches.title")}
          description={t("branches.subtitle")}
        />

        {/* Map + branch list */}
        <div className="mt-12 flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-8">
          {/* Branch list — desktop: left column 40%, mobile: horizontal rail (order-2) */}
          <div className="order-2 lg:order-1 lg:col-span-2">
            {/* Desktop vertical list */}
            <div className="hidden max-h-[560px] flex-col gap-3 overflow-y-auto pr-1 lg:flex">
              {isLoading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/50" />
                  ))
                : branches.map((b) => (
                    <BranchCard
                      key={b.id}
                      branch={b}
                      active={b.id === activeId}
                      onSelect={setActiveId}
                      cardRef={(el) => {
                        cardRefs.current[b.id] = el;
                      }}
                    />
                  ))}
            </div>

            {/* Mobile horizontal rail */}
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:hidden">
              {isLoading
                ? [0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-52 w-[85%] shrink-0 animate-pulse rounded-xl bg-muted/50"
                    />
                  ))
                : branches.map((b) => (
                    <div
                      key={b.id}
                      className="w-[85%] shrink-0 snap-center"
                    >
                      <BranchCard
                        branch={b}
                        active={b.id === activeId}
                        onSelect={setActiveId}
                        cardRef={(el) => {
                          cardRefs.current[b.id] = el;
                        }}
                      />
                    </div>
                  ))}
            </div>
          </div>

          {/* Map — desktop: right 60%, mobile: on top (order-1) */}
          <div className="order-1 lg:order-2 lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50 p-1.5 shadow-2xl shadow-primary/10 backdrop-blur">
              <Suspense fallback={<MapSkeleton />}>
                {mounted && branches.length > 0 ? (
                  <BranchesMap
                    branches={branches}
                    activeId={activeId}
                    onSelect={setActiveId}
                  />
                ) : (
                  <MapSkeleton />
                )}
              </Suspense>
            </div>
          </div>
        </div>

        {/* General contact info */}
        <div className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h3 className="text-h3 font-bold ">
                {t("branches.info.title")}
              </h3>
              <p className="mt-1 text-small text-muted-foreground">
                {t("branches.info.subtitle")}
              </p>
            </div>
          </div>
          <ContactInfoGrid />
        </div>

        {/* Contact form */}
        <div className="mt-12">
          <ContactForm branches={branches} />
        </div>
      </div>
    </section>
  );
}
