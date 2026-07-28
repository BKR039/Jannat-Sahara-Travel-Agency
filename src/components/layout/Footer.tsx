import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/common/Logo";
import { contactInfoQuery } from "@/lib/queries";
import { DynamicIcon } from "@/components/common/DynamicIcon";

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
  { key: "visa", to: "/visa" as const },
];

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const { data: info } = useQuery(contactInfoQuery());

  return (
    <footer className="mt-24 bg-brand-green text-brand-green-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="space-y-4">
          <div className="rounded-xl bg-background/10 p-3 backdrop-blur w-fit">
            <Logo className="[&_span]:text-brand-green-foreground" />
          </div>
          <p className="text-sm opacity-80 max-w-xs">{t("brand.tagline")}</p>
          <div className="flex gap-3">
            {info
              ?.filter((c) => ["facebook", "instagram", "whatsapp"].includes(c.key))
              .map((c) => (
                <a
                  key={c.id}
                  href={c.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={c.label ?? c.key}
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
                >
                  <DynamicIcon name={c.icon} className="h-4 w-4" />
                </a>
              ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
            {t("footer.quickLinks")}
          </h3>
          <ul className="space-y-2 text-sm opacity-80">
            {QUICK_LINKS.map((l) => (
              <li key={l.key}>
                <Link to={l.to} className="hover:text-primary transition-colors">
                  {t(`nav.${l.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
            {t("footer.services")}
          </h3>
          <ul className="space-y-2 text-sm opacity-80">
            {SERVICE_LINKS.map((l) => (
              <li key={l.key}>
                <Link to={l.to} className="hover:text-primary transition-colors">
                  {t(`nav.${l.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
            {t("footer.contact")}
          </h3>
          <ul className="space-y-3 text-sm opacity-80">
            {info
              ?.filter((c) => ["address", "phone", "mobile", "email", "hours"].includes(c.key))
              .map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <DynamicIcon name={c.icon} className="h-4 w-4 mt-0.5 shrink-0" />
                  <span dir={["phone", "mobile", "email"].includes(c.key) ? "ltr" : undefined}>
                    {c.value}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs opacity-70 md:flex-row md:px-6">
          <p>
            © {year} {t("brand.name")}. {t("footer.rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
