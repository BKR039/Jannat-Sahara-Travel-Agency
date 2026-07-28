import { useTranslation } from "react-i18next";
import { Facebook, Instagram, MapPin, Phone, Mail } from "lucide-react";
import { Logo } from "@/components/common/Logo";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-brand-green text-brand-green-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="space-y-4">
          <div className="rounded-xl bg-background/10 p-3 backdrop-blur w-fit">
            <Logo className="[&_span]:text-brand-green-foreground" />
          </div>
          <p className="text-sm opacity-80 max-w-xs">{t("brand.tagline")}</p>
          <div className="flex gap-3">
            <a href="#" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Instagram" className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
            {t("footer.quickLinks")}
          </h3>
          <ul className="space-y-2 text-sm opacity-80">
            {["home", "about", "trips", "contact"].map((k) => (
              <li key={k}>
                <a href={k === "home" ? "/" : `#${k}`} className="hover:text-primary transition-colors">
                  {t(`nav.${k}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
            {t("footer.services")}
          </h3>
          <ul className="space-y-2 text-sm opacity-80">
            {["umrah", "flights", "visas", "trips"].map((k) => (
              <li key={k}>
                <a href={`#${k}`} className="hover:text-primary transition-colors">
                  {t(`nav.${k}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
            {t("footer.contact")}
          </h3>
          <ul className="space-y-3 text-sm opacity-80">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("footer.address")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span dir="ltr">+216 52 123 456</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span dir="ltr">contact@janatsahara.tn</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs opacity-70 md:flex-row md:px-6">
          <p>© {year} {t("brand.name")}. {t("footer.rights")}.</p>
        </div>
      </div>
    </footer>
  );
}
