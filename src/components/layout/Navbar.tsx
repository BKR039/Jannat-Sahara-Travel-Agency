import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

const NAV = [
  { key: "home", to: "/" as const },
  { key: "about", to: "/about" as const },
  { key: "umrah", to: "/umrah" as const },
  { key: "trips", to: "/trips" as const },
  { key: "flights", to: "/flights" as const },
  { key: "visa", to: "/visa" as const },
  { key: "gallery", to: "/gallery" as const },
  { key: "blog", to: "/blog" as const },
  { key: "contact", to: "/contact" as const },
];

export function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild className="hidden bg-primary text-primary-foreground hover:bg-primary/90 md:inline-flex">
            <Link to="/contact">{t("actions.bookNow")}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("actions.menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {NAV.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-primary/10 text-primary" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
            <Button asChild className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/contact">{t("actions.bookNow")}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
