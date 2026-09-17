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
  { key: "gallery", to: "/gallery" as const },
  { key: "blog", to: "/blog" as const },
  { key: "contact", to: "/contact" as const },
];

export function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border-subtle bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          /*
           * `min-w-0` instead of `shrink-0`. Measured at 390px in Arabic the
           * lockup asked for 194px and the controls beside it for 161px, which
           * is 12px more than the padded row has — so the header overflowed
           * horizontally on every public page in the default language. A
           * `shrink-0` brand mark cannot give that 12px back; letting it shrink
           * (and truncate its own text, see `Logo`) keeps the row inside the
           * viewport without touching the controls.
           */
          className="min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Logo />
        </Link>

        {/*
         * Nine top-level items in Arabic need roughly 1200px alongside the
         * logo, the language and theme controls and the booking button. At the
         * old `lg` (1024) they did not fit: labels wrapped to two lines inside
         * their own links and the booking button was pushed off the edge. The
         * drawer covers everything below `xl`.
         */}
        <nav className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              /*
               * Active state was a filled chip that competed with the booking
               * button. An underline marks position without shouting, and
               * `aria-current` carries it for assistive tech rather than colour
               * alone.
               */
              activeProps={{
                className: "text-primary after:scale-x-100",
                "aria-current": "page",
              }}
              className="relative rounded-md px-3 py-2 text-nav text-text-secondary transition-colors duration-fast ease-standard after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary whitespace-nowrap after:transition-transform after:duration-base hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild className="hidden md:inline-flex">
            <Link to="/contact">{t("actions.bookNow")}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("actions.menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border-subtle bg-surface xl:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {NAV.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-accent text-primary" }}
                className="rounded-md px-3 py-2 text-nav text-text-secondary hover:bg-accent"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
            <Button asChild className="mt-2" fullWidth>
              <Link to="/contact">{t("actions.bookNow")}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
