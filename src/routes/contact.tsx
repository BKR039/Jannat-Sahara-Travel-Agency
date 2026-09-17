import { createFileRoute, Link } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Mail, MapPin, MessageCircle, Phone, Send, Loader2, ArrowRight, Check } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Section, Container } from "@/components/common/Section";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { submitContactMessage } from "@/lib/public.functions";
import { branchesQuery, contactInfoQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { BranchCard } from "@/components/branches/BranchCard";
import { canonical } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.contact.title") },
      { name: "description", content: i18n.t("seo.contact.description") },
      { property: "og:title", content: i18n.t("seo.contact.title") },
      { property: "og:description", content: i18n.t("seo.contact.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [canonical("/contact")],
  }),
  component: ContactPage,
});

/** wa.me needs a country code; Tunisian numbers are stored as 8 bare digits. */
function whatsappHref(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

/**
 * Labelled form field.
 *
 * The previous form was placeholder-only: no `<label>` anywhere, so a screen
 * reader announced five unnamed text boxes and the hint vanished the moment
 * the visitor started typing.
 */
function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 text-small font-semibold text-foreground"
      >
        {label}
        <span className="text-caption font-normal text-muted-foreground">
          {required ? t("contact.required") : t("contact.optional")}
        </span>
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ContactPage() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data: info } = useQuery(contactInfoQuery());
  const { data: branches = [] } = useQuery(branchesQuery());
  /* The query already sorts main-first, but the flag is what decides the
     layout — a dataset with no main branch simply renders the even grid. */
  const mainBranch = branches.find((b) => b.is_main_branch) ?? null;
  const otherBranches = branches.filter((b) => b !== mainBranch);
  const [loading, setLoading] = useState(false);
  const sendMessage = useServerFn(submitContactMessage);
  const uid = useId();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await sendMessage({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          subject: String(form.get("subject") ?? ""),
          message: String(form.get("message") ?? ""),
        },
      });
      toast.success(t("contact.success"));
      formEl.reset();
    } catch (err) {
      console.error(err);
      toast.error(t("contact.error"));
    } finally {
      setLoading(false);
    }
  };

  const row = (key: string) => info?.find((c) => c.key === key);
  const value = (key: string) => {
    const r = row(key);
    return r ? L(r, "value", "base") : "";
  };
  /*
   * Labels come from the row itself — the agency types them in Settings →
   * Contact and they are localized like any other content column. Only the
   * WhatsApp card, which is derived rather than stored, needs a UI string.
   */
  const label = (key: string, fallback: string) => {
    const r = row(key);
    return (r ? L(r, "label", "base") : "") || fallback;
  };
  const address = value("address");
  const phone = value("phone");
  const email = value("email");

  /*
   * Only channels the agency has actually confirmed. The seeded e-mail, social
   * links and opening hours were cleared as unverified, so this list is
   * genuinely short — the layout adapts rather than padding it out with
   * labelled empty cards, which is what the previous version did.
   */
  const methods = [
    address && {
      key: "address",
      icon: MapPin,
      label: label("address", t("branches.info.headquarters")),
      value: address,
    },
    phone && {
      key: "phone",
      icon: Phone,
      label: label("phone", t("branches.info.phone")),
      value: phone,
      href: `tel:${phone.replace(/\s+/g, "")}`,
      ltr: true,
      action: t("contact.callNow"),
    },
    phone && {
      key: "whatsapp",
      icon: MessageCircle,
      label: t("contact.whatsapp"),
      value: phone,
      href: whatsappHref(phone),
      external: true,
      ltr: true,
      brand: true,
    },
    email && {
      key: "email",
      icon: Mail,
      label: label("email", t("branches.info.email")),
      value: email,
      href: `mailto:${email}`,
      ltr: true,
    },
  ].filter(Boolean) as {
    key: string;
    icon: typeof MapPin;
    label: string;
    value: string;
    href?: string;
    external?: boolean;
    ltr?: boolean;
    brand?: boolean;
    action?: string;
  }[];

  return (
    <SiteLayout>
      {/* Compact intro — the old one gave a single heading a full py-16 band. */}
      <Section space="sm" tone="sunken">
        <SectionHeading
          eyebrow={t("contact.eyebrow")}
          icon={Send}
          title={t("contact.title")}
          as="h1"
          description={t("contact.subtitle")}
          align="center"
        />
      </Section>

      <Section space="md">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.35fr] lg:gap-10">
          {/* ---------- contact methods ---------- */}
          <div className="space-y-3">
            <h2 className="text-h5 font-bold text-foreground">{t("contact.methodsTitle")}</h2>

            {methods.map((m, i) => {
              const inner = (
                <>
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-input border transition-colors duration-fast ease-standard",
                      m.brand
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border-subtle bg-surface-sunken/60 text-muted-foreground",
                    )}
                  >
                    <m.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-caption font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {m.label}
                    </span>
                    <span
                      dir={m.ltr ? "ltr" : undefined}
                      className={cn(
                        "mt-0.5 block font-semibold leading-relaxed text-foreground [overflow-wrap:anywhere]",
                        m.ltr && "text-start",
                      )}
                    >
                      {m.value}
                    </span>
                  </span>
                  {m.href && (
                    /* Trailing affordance for the whole two-line block, so it
                       centres on the card rather than on the first line. */
                    <ArrowRight
                      className="h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform duration-base ease-standard group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                      aria-hidden="true"
                    />
                  )}
                </>
              );

              const shell =
                "group ds-reveal flex items-start gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-card p-4 transition-all duration-base ease-standard";

              return m.href ? (
                <a
                  key={m.key}
                  href={m.href}
                  target={m.external ? "_blank" : undefined}
                  rel={m.external ? "noopener noreferrer" : undefined}
                  aria-label={`${m.label}: ${m.value}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={cn(
                    shell,
                    "hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  {inner}
                </a>
              ) : (
                <div key={m.key} style={{ animationDelay: `${i * 60}ms` }} className={shell}>
                  {inner}
                </div>
              );
            })}

            {/*
             * Reassurance, stated from what the flow actually does. The
             * message reaches the agency's inbox and a person answers it —
             * nothing about volumes, ratings or how fast that will be.
             */}
            <ul className="ds-reveal space-y-2 rounded-card border border-border-subtle bg-surface-sunken/50 p-5">
              {["realOffices", "personAnswers", "noObligation"].map((k) => (
                <li
                  key={k}
                  className="flex gap-2 text-caption leading-relaxed text-muted-foreground"
                >
                  <Check className="ds-icon-lead text-brand-green" aria-hidden="true" />
                  <span>{t(`contact.reassurance.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- form ---------- */}
          <form
            onSubmit={onSubmit}
            noValidate={false}
            className="rounded-card border border-border-subtle bg-surface p-5 sm:p-7"
          >
            <h2 className="text-h5 font-bold text-foreground">{t("contact.formTitle")}</h2>
            <p className="mt-1 text-small text-muted-foreground">{t("contact.formHint")}</p>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${uid}-name`} label={t("contact.name")} required>
                  <Input
                    id={`${uid}-name`}
                    name="name"
                    required
                    autoComplete="name"
                    className="h-11"
                  />
                </Field>
                <Field id={`${uid}-phone`} label={t("contact.phone")}>
                  <Input
                    id={`${uid}-phone`}
                    name="phone"
                    type="tel"
                    dir="ltr"
                    autoComplete="tel"
                    className="h-11 text-start"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${uid}-email`} label={t("contact.email")} required>
                  <Input
                    id={`${uid}-email`}
                    name="email"
                    type="email"
                    required
                    dir="ltr"
                    autoComplete="email"
                    className="h-11 text-start"
                  />
                </Field>
                <Field id={`${uid}-subject`} label={t("contact.subject")}>
                  <Input id={`${uid}-subject`} name="subject" className="h-11" />
                </Field>
              </div>

              <Field id={`${uid}-message`} label={t("contact.message")} required>
                <Textarea id={`${uid}-message`} name="message" required rows={5} />
              </Field>

              <Button type="submit" size="lg" fullWidth disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {t("contact.send")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Section>

      {/*
       * The offices, on the page rather than behind a link to the homepage.
       *
       * These are the agency's strongest trust signal precisely because they
       * are real places a visitor can walk into, and sending someone to an
       * anchor on another page to see them was throwing that away. Every value
       * comes from the `branches` table; the main office leads.
       */}
      {branches.length > 0 && (
        <Section space="md" tone="sunken">
          <SectionHeading
            eyebrow={t("branches.kicker")}
            icon={MapPin}
            title={t("branches.ourBranches")}
            description={t("contact.branchesCtaDesc")}
            align="center"
          />
          {/*
           * The head office leads on its own line, the rest follow in an even
           * grid. Mixing them produced a ragged 3+1 layout in which the tall
           * featured card left a hole beside it, and the office that matters
           * most read as just another tile.
           */}
          <div className="mt-8 space-y-4">
            {mainBranch && <BranchCard branch={mainBranch} featured />}
            {otherBranches.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherBranches.map((b) => (
                  <BranchCard key={b.id} branch={b} />
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
    </SiteLayout>
  );
}
