import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Send,
  Loader2,
  Phone,
  Mail,
  MessageCircle,
  ArrowUpRight,
  ExternalLink,
  Building2,
  Compass,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { subscribeNewsletter } from "@/lib/public.functions";
import { contactInfoQuery, branchesQuery, type Branch } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import type { SupportedLanguage } from "@/lib/i18n";
import { usePrivacyConsent } from "@/components/privacy";

const EXPLORE_LINKS = [
  { key: "home", to: "/" as const },
  { key: "about", to: "/about" as const },
  { key: "umrah", to: "/umrah" as const },
  { key: "trips", to: "/trips" as const },
  { key: "flights", to: "/flights" as const },
  { key: "gallery", to: "/gallery" as const },
  { key: "blog", to: "/blog" as const },
];

const HELP_LINKS = [
  { key: "faq", to: "/faq" as const, labelKey: "nav.faq" },
  { key: "contact", to: "/contact" as const, labelKey: "nav.contact" },
  { key: "booking", to: "/booking" as const, labelKey: "footer.booking" },
  { key: "customUmrah", to: "/umrah/builder" as const, labelKey: "footer.customUmrah" },
];

const LEGAL_LINKS = [
  { key: "privacy", to: "/legal/privacy" as const },
  { key: "terms", to: "/legal/terms" as const },
];

/** Formats a bare 8-digit Tunisian phone or international number nicely for display. */
function prettyPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return raw;
  if (digits.length === 8) {
    return `+216 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
  }
  if (digits.startsWith("216") && digits.length >= 11) {
    const local = digits.slice(3);
    return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)}`;
  }
  return raw.startsWith("+") ? raw : `+${raw}`;
}

/** Prepares a tel: href with Tunisia's country code for 8-digit numbers. */
function telHref(raw: string | null | undefined): string {
  if (!raw) return "#";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 8) return `tel:+216${digits}`;
  return `tel:+${digits}`;
}

/** Resolves an official WhatsApp wa.me link from configuration or falls back to agency phone. */
function getWhatsAppHref(whatsappValue?: string | null, fallbackPhone?: string | null): string {
  if (whatsappValue && whatsappValue.trim()) {
    const val = whatsappValue.trim();
    if (val.startsWith("http://") || val.startsWith("https://")) {
      return val;
    }
    const digits = val.replace(/[^\d]/g, "");
    if (digits) {
      return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
    }
  }
  if (fallbackPhone && fallbackPhone.trim()) {
    const digits = fallbackPhone.replace(/[^\d]/g, "");
    if (digits) {
      return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
    }
  }
  return "https://wa.me/21696888888";
}

/** Returns Google Maps link for branch coordinates or URL. */
function getMapsHref(branch: Branch): string {
  if (branch.google_maps_url && branch.google_maps_url.trim()) {
    return branch.google_maps_url.trim();
  }
  if (branch.latitude && branch.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(branch.latitude)},${Number(
      branch.longitude,
    )}`;
  }
  return "https://maps.google.com";
}

export function Footer() {
  const { t, i18n } = useTranslation();
  const { L } = useLocalized();
  const { openSettings } = usePrivacyConsent();
  const year = new Date().getFullYear();

  const { data: info } = useQuery(contactInfoQuery());
  const { data: branches } = useQuery(branchesQuery());

  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);

  // Social channels with configured non-empty URLs (excluding WhatsApp which has its own dedicated primary CTA)
  const socials =
    info?.filter(
      (c) =>
        ["facebook", "instagram", "youtube", "tiktok", "linkedin", "telegram"].includes(c.key) &&
        typeof c.value === "string" &&
        c.value.trim() !== "",
    ) ?? [];

  const mainBranch = branches?.find((b) => b.is_main_branch) ?? branches?.[0];
  const agencyRow = info?.find((c) => c.key === "agency_name");
  const agencyName = (agencyRow ? L(agencyRow, "value", "empty") : "") || t("brand.name");

  // Main phone: database contact phone, or mobile, or main branch phone, or verified default
  const phoneRow = info?.find(
    (c) => c.key === "phone" && typeof c.value === "string" && c.value.trim() !== "",
  );
  const mobileRow = info?.find(
    (c) => c.key === "mobile" && typeof c.value === "string" && c.value.trim() !== "",
  );
  const mainPhone = phoneRow?.value || mobileRow?.value || mainBranch?.phone || "96888888";

  // Main email
  const emailRow = info?.find(
    (c) => c.key === "email" && typeof c.value === "string" && c.value.trim() !== "",
  );
  const mainEmail = emailRow?.value || mainBranch?.email || "";

  // WhatsApp
  const whatsappRow = info?.find(
    (c) => c.key === "whatsapp" && typeof c.value === "string" && c.value.trim() !== "",
  );
  const whatsappLink = getWhatsAppHref(whatsappRow?.value, mainPhone);

  // Working hours
  const hoursItem = info?.find((c) => c.key === "hours");
  const workingHours =
    (hoursItem ? L(hoursItem, "value", "empty") : "") ||
    (mainBranch ? L(mainBranch, "working_hours", "empty") : "");

  const onSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const res = await subscribe({
        data: { email: email.trim(), locale: i18n.language as SupportedLanguage },
      });
      if (res.duplicate) {
        toast.error(t("footer.newsletterDuplicate"));
      } else {
        toast.success(t("footer.newsletterSuccess"));
        setEmail("");
      }
    } catch (err) {
      console.error(err);
      toast.error(t("footer.newsletterError"));
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-surface-dark text-on-dark" role="contentinfo">
      {/* Decorative top gradient accent */}
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary"
        aria-hidden="true"
      />

      {/* Newsletter band */}
      <div className="relative border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10 lg:px-8">
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2.5 text-h5 font-bold text-on-dark">
              <Send className="h-5 w-5 shrink-0 text-secondary" />
              <span>{t("footer.newsletter")}</span>
            </h2>
            <p className="mt-2 text-small leading-relaxed text-white/75">
              {t("footer.newsletterDesc")}
            </p>
          </div>
          <form
            onSubmit={onSubscribe}
            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("footer.emailPlaceholder")}
              aria-label={t("footer.emailPlaceholder")}
              autoComplete="email"
              className="h-12 w-full rounded-lg border-white/15 bg-white/8 px-4 text-on-dark placeholder:text-white/50 hover:border-white/30 focus-visible:border-secondary focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-secondary sm:w-80"
            />
            <Button
              type="submit"
              variant="solid"
              size="default"
              disabled={subscribing}
              className="shrink-0"
            >
              {subscribing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("footer.subscribing")}</span>
                </span>
              ) : (
                t("footer.subscribe")
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer multi-column container */}
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        <div className="grid w-full min-w-0 gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,5.4fr)]">
          {/* Column 1: Brand, WhatsApp & Contact Stack (~25% on desktop) */}
          <div className="flex w-full min-w-0 flex-col gap-3.5 md:col-span-2 lg:col-span-1">
            {/* 1. Brand Card */}
            <div className="w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
              <Logo className="[&_span:first-child]:text-white [&_span:last-child]:text-white/70" />
            </div>

            {/* 2. WhatsApp CTA Card (Balanced proportions, matching surrounding card system) */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-emerald-200 transition-all duration-fast hover:border-emerald-500/60 hover:bg-emerald-900/40 hover:shadow-brand-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={`${t("footer.whatsappChat")} - ${prettyPhone(mainPhone)}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 transition-transform group-hover:scale-105">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-small font-bold text-white leading-tight">
                    {t("footer.whatsappChat")}
                  </p>
                  <p className="text-[11px] text-emerald-300/80 truncate leading-snug">
                    {t("footer.whatsappDesc")}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
            </a>

            {/* 3. Direct Contact Details Card (Consistent padding & icon styling) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 space-y-3">
              {mainPhone && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-secondary">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                      {t("footer.contact")}
                    </p>
                    <a
                      href={telHref(mainPhone)}
                      dir="ltr"
                      className="inline-block text-small font-semibold text-white whitespace-nowrap transition-colors hover:text-secondary"
                    >
                      {prettyPhone(mainPhone)}
                    </a>
                  </div>
                </div>
              )}

              {mainEmail && (
                <div className="flex items-center gap-2.5 border-t border-white/10 pt-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-secondary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                      {t("contact.fields.email")}
                    </p>
                    <a
                      href={`mailto:${mainEmail}`}
                      dir="ltr"
                      className="inline-block text-small font-semibold text-white truncate max-w-[200px] transition-colors hover:text-secondary"
                    >
                      {mainEmail}
                    </a>
                  </div>
                </div>
              )}

              {workingHours && (
                <div className="flex items-center gap-2.5 border-t border-white/10 pt-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-secondary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                      {t("footer.workingHours")}
                    </p>
                    <p className="text-small text-white/80 leading-snug">{workingHours}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Social channels */}
            {socials.length > 0 && (
              <div className="pt-1">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  {t("footer.followUs")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {socials.map((c) => (
                    <a
                      key={c.id}
                      href={c.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={c.label ?? c.key}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white/80 transition-all duration-fast hover:scale-105 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
                    >
                      <DynamicIcon name={c.icon} className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Explore Navigation (~15% on desktop) */}
          <div className="w-full min-w-0 md:col-span-1 lg:col-span-1">
            <h3 className="mb-4 flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-white/90">
              <Compass className="h-4 w-4 text-secondary" />
              <span>{t("footer.explore")}</span>
            </h3>
            <nav aria-label={t("footer.explore")}>
              <ul className="space-y-1 text-small">
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.key}>
                    <Link
                      to={l.to}
                      className="group inline-flex min-h-9 items-center gap-2 py-1 leading-relaxed text-white/75 transition-colors hover:text-secondary hover:text-white"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/50 opacity-0 transition-opacity group-hover:opacity-100" />
                      <span>{t(`nav.${l.key}`)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Column 3: Help & Booking Navigation (~15% on desktop) */}
          <div className="w-full min-w-0 md:col-span-1 lg:col-span-1">
            <h3 className="mb-4 flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-white/90">
              <HelpCircle className="h-4 w-4 text-secondary" />
              <span>{t("footer.helpAndBooking")}</span>
            </h3>
            <nav aria-label={t("footer.helpAndBooking")}>
              <ul className="space-y-1 text-small">
                {HELP_LINKS.map((l) => (
                  <li key={l.key}>
                    <Link
                      to={l.to}
                      className="group inline-flex min-h-9 items-center gap-2 py-1 leading-relaxed text-white/75 transition-colors hover:text-secondary hover:text-white"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/50 opacity-0 transition-opacity group-hover:opacity-100" />
                      <span>{t(l.labelKey)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Column 4: Verified Agency Branches (~45% on desktop) */}
          <div className="w-full min-w-0 md:col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-white/90">
                <Building2 className="h-4 w-4 text-secondary" />
                <span>{t("footer.branches")}</span>
                {branches && branches.length > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-secondary">
                    {branches.length}
                  </span>
                )}
              </h3>
              <Link
                to="/branches"
                className="inline-flex items-center gap-1 text-caption text-secondary/90 transition-colors hover:text-secondary hover:underline"
              >
                <span>{t("footer.allBranches")}</span>
                <ArrowUpRight className="h-3.5 w-3.5 rtl:rotate-[-90deg]" />
              </Link>
            </div>

            {/* Robust responsive grid: 2 columns on desktop xl (>=1280px), 1 comfortable column on tablet & desktop lg */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-3 [grid-template-columns:repeat(1,minmax(0,1fr))] xl:grid-cols-2 xl:[grid-template-columns:repeat(2,minmax(0,1fr))]">
              {branches && branches.length > 0 ? (
                branches.slice(0, 4).map((b) => {
                  const branchPhone = b.phone?.trim();
                  const mapsUrl = getMapsHref(b);
                  const cityName = L(b, "city", "base");
                  const branchName = L(b, "name", "base");
                  const address = L(b, "address", "base");

                  return (
                    <div
                      key={b.id}
                      className="group flex w-full min-w-0 flex-col justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5 transition-all duration-fast hover:border-secondary/40 hover:bg-white/[0.07]"
                    >
                      <div className="w-full min-w-0">
                        {/* Branch Name & Main Branch Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-small font-bold text-white transition-colors group-hover:text-secondary">
                            {cityName || branchName}
                          </h4>
                          {b.is_main_branch && (
                            <span className="shrink-0 rounded bg-secondary/20 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                              {t("footer.mainBranch")}
                            </span>
                          )}
                        </div>

                        {/* Address with Location Pin */}
                        {address && (
                          <div className="mt-2 flex items-start gap-2 text-caption text-white/70">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                            <span className="line-clamp-2 leading-relaxed">{address}</span>
                          </div>
                        )}
                      </div>

                      {/* Internal Hierarchy: Prominent Phone Number + Secondary Map Link */}
                      <div className="mt-3.5 flex w-full min-w-0 flex-col gap-2 border-t border-white/10 pt-3">
                        {branchPhone && (
                          <a
                            href={telHref(branchPhone)}
                            className="group/phone flex min-w-0 items-center gap-2 text-small font-semibold text-white transition-colors hover:text-secondary"
                            aria-label={`${cityName}: ${prettyPhone(branchPhone)}`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/8 text-secondary transition-colors group-hover/phone:bg-secondary group-hover/phone:text-primary-foreground">
                              <Phone className="h-3 w-3" />
                            </span>
                            <span
                              dir="ltr"
                              className="whitespace-nowrap font-semibold tracking-wide"
                            >
                              {prettyPhone(branchPhone)}
                            </span>
                          </a>
                        )}

                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-white/60 transition-colors hover:text-secondary"
                          aria-label={`${t("footer.viewOnMap")} - ${cityName}`}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0 text-secondary/70" />
                          <span className="truncate">{t("footer.viewOnMap")}</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-small text-white/50">{t("common.empty")}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar with legal links, copyright & SADA Media Production credit */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-center sm:text-start">
            <p className="text-caption text-white/60">
              © {year} {agencyName}. {t("footer.rights")}.
            </p>
            <span className="hidden sm:inline text-white/20" aria-hidden="true">
              ·
            </span>
            <a
              href="#"
              className="text-caption text-white/50 transition-colors duration-fast hover:text-secondary hover:underline"
            >
              Website by SADA Media Production
            </a>
          </div>

          <nav
            aria-label={t("footer.legal")}
            className="flex flex-wrap items-center justify-center gap-6 text-caption text-white/70"
          >
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.key}
                to={l.to}
                className="inline-flex min-h-8 items-center transition-colors duration-fast ease-standard hover:text-secondary hover:underline"
              >
                {t(`footer.${l.key}`)}
              </Link>
            ))}
            <button
              type="button"
              onClick={openSettings}
              className="inline-flex min-h-8 cursor-pointer items-center transition-colors duration-fast ease-standard hover:text-secondary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary"
            >
              {t("footer.privacySettings")}
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
