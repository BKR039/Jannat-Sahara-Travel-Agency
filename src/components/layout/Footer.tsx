import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MapPin, Clock, Send, Loader2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { subscribeNewsletter } from "@/lib/public.functions";
import { contactInfoQuery, branchesQuery, siteSettingsQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import type { SupportedLanguage } from "@/lib/i18n";

const QUICK_LINKS = [
  { key: "home", to: "/" as const },
  { key: "about", to: "/about" as const },
  { key: "gallery", to: "/gallery" as const },
  { key: "blog", to: "/blog" as const },
  { key: "contact", to: "/contact" as const },
];

const SERVICE_LINKS = [
  { key: "umrah", to: "/umrah" as const },
  { key: "trips", to: "/trips" as const },
  { key: "flights", to: "/flights" as const },
];

const LEGAL_LINKS = [
  { key: "privacy", to: "/legal/privacy" as const },
  { key: "terms", to: "/legal/terms" as const },
];

export function Footer() {
  const { t, i18n } = useTranslation();
  const { L } = useLocalized();
  const year = new Date().getFullYear();
  const { data: info } = useQuery(contactInfoQuery());
  const { data: branches } = useQuery(branchesQuery());
  const { data: settings } = useQuery(siteSettingsQuery());
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);

  const socials =
    info?.filter(
      (c) =>
        ["facebook", "instagram", "whatsapp", "youtube", "tiktok"].includes(c.key) &&
        // An unconfigured channel used to render `href=""`, which reloads the
        // page instead of going anywhere. Absent beats broken, and the URL is
        // not ours to invent.
        typeof c.value === "string" &&
        c.value.trim() !== "",
    ) ?? [];
  const contactDetails =
    info?.filter((c) => ["address", "phone", "mobile", "email"].includes(c.key)) ?? [];
  const mainBranch = branches?.find((b) => b.is_main_branch) ?? branches?.[0];
  const agencyRow = info?.find((c) => c.key === "agency_name");
  // Agency identity comes from Settings, falling back to the i18n brand copy.
  const agencyName = (agencyRow ? L(agencyRow, "value", "empty") : "") || t("brand.name");
  const tagline = settings?.brandTagline || t("brand.tagline");
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
    <footer className="relative overflow-hidden bg-surface-dark text-on-dark">
      {/* subtle top gradient line */}
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary"
        aria-hidden="true"
      />

      {/* Newsletter band */}
      <div className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between md:gap-10 sm:px-6 lg:px-8">
          <div className="max-w-md">
            <h2 className="flex items-center gap-2.5 text-h5 font-bold text-on-dark">
              <Send className="h-5 w-5 shrink-0 text-secondary" />
              {t("footer.newsletter")}
            </h2>
            <p className="mt-2 text-small leading-relaxed opacity-80">
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
              /* A placeholder is not an accessible name — it disappears on
                 focus and screen readers announced this as an unlabelled text
                 box. It is the only input in the footer of every page. */
              aria-label={t("footer.emailPlaceholder")}
              autoComplete="email"
              className="h-12 w-full rounded-sm border-white/15 bg-white/8 px-4 text-on-dark placeholder:text-white/50 hover:border-white/25 focus-visible:bg-white/10 sm:w-72"
            />
            <Button
              type="submit"
              disabled={subscribing}
              className="h-12 shrink-0 whitespace-nowrap rounded-sm bg-primary px-6 text-primary-foreground hover:bg-primary-hover hover:shadow-brand-glow disabled:opacity-60"
            >
              {subscribing ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  {t("footer.subscribing")}
                </>
              ) : (
                t("footer.subscribe")
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 lg:px-8 md:pt-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="w-fit rounded-xl bg-white/5 p-3 backdrop-blur-sm">
              <Logo className="[&_span]:text-on-dark" />
            </div>
            <p className="mt-4 max-w-xs text-small leading-relaxed opacity-80">{tagline}</p>
            {socials.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-4 text-caption font-semibold uppercase tracking-wider opacity-80">
                  {t("footer.followUs")}
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {socials.map((c) => (
                    <a
                      key={c.id}
                      href={c.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={c.label ?? c.key}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-on-dark transition-all duration-fast ease-standard hover:scale-105 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
                    >
                      <DynamicIcon name={c.icon} className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-caption font-semibold uppercase tracking-wider opacity-80">
              {t("footer.quickLinks")}
            </h3>
            <ul className="text-small">
              {QUICK_LINKS.map((l) => (
                <li key={l.key} className="flex">
                  <Link
                    to={l.to}
                    className="group inline-flex min-h-11 items-center gap-2 py-1 leading-relaxed opacity-80 transition-all duration-fast ease-standard hover:text-secondary hover:opacity-100"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                    {t(`nav.${l.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-caption font-semibold uppercase tracking-wider opacity-80">
              {t("footer.services")}
            </h3>
            <ul className="text-small">
              {SERVICE_LINKS.map((l) => (
                <li key={l.key} className="flex">
                  <Link
                    to={l.to}
                    className="group inline-flex min-h-11 items-center gap-2 py-1 leading-relaxed opacity-80 transition-all duration-fast ease-standard hover:text-secondary hover:opacity-100"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                    {t(`nav.${l.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Branches */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-caption font-semibold uppercase tracking-wider opacity-80">
              {t("footer.branches")}
            </h3>
            <ul className="text-small">
              {branches && branches.length > 0 ? (
                branches.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex">
                    <Link
                      to="/branches"
                      className="group inline-flex min-h-11 items-start gap-2 py-1.5 leading-relaxed opacity-80 transition-all duration-fast ease-standard hover:text-secondary hover:opacity-100"
                    >
                      <MapPin className="mt-[0.2em] h-4 w-4 shrink-0 text-secondary" />
                      <span>
                        {L(b, "city", "base")} — {L(b, "name", "base")}
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="opacity-60">{t("common.empty")}</li>
              )}
            </ul>
          </div>

          {/* Contact + Hours */}
          <div className="sm:col-span-2 lg:col-span-2">
            <h3 className="mb-4 text-caption font-semibold uppercase tracking-wider opacity-80">
              {t("footer.contact")}
            </h3>
            <ul className="text-small">
              {contactDetails.map((c) => (
                <li key={c.id} className="flex gap-2.5 leading-relaxed opacity-90">
                  {/* `mt-[0.2em]` was an eyeballed offset; the shared rule
                      centres the glyph on the first line at any type size. */}
                  <DynamicIcon name={c.icon} className="ds-icon-lead text-secondary" />
                  <span
                    dir={["phone", "mobile", "email"].includes(c.key) ? "ltr" : undefined}
                    className="min-w-0 break-words rtl:text-start"
                  >
                    {L(c, "value", "base")}
                  </span>
                </li>
              ))}
            </ul>
            {workingHours && (
              <div className="mt-6">
                <h3 className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-wider opacity-80">
                  <Clock className="h-4 w-4 shrink-0 text-secondary" />
                  {t("footer.workingHours")}
                </h3>
                <p className="text-small leading-relaxed opacity-80">{workingHours}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 md:flex-row sm:px-6 lg:px-8">
          <p className="text-center text-caption opacity-70 md:text-start">
            © {year} {agencyName}. {t("footer.rights")}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-caption opacity-80">
            {LEGAL_LINKS.map((l, idx) => (
              <span key={l.key} className="inline-flex items-center gap-4">
                <Link
                  to={l.to}
                  className="inline-flex min-h-11 items-center transition-colors duration-fast ease-standard hover:text-secondary"
                >
                  {t(`footer.${l.key}`)}
                </Link>
                {idx < LEGAL_LINKS.length - 1 && (
                  <span className="hidden h-3 w-px bg-white/20 md:inline-block" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
