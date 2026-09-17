import { type ReactNode, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  Mail,
  Plane,
  LayoutDashboard,
  LayoutGrid,
  Package as PackageIcon,
  Inbox,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Newspaper,
  Star,
  HelpCircle,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  Bell,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "./context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localize";
import { TERMINAL_STATUSES } from "@/lib/admin/request-status";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superOnly?: boolean;
  badge?: "requests" | "notifications";
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

/**
 * Navigation follows the daily workflow of the agency:
 * what needs an answer today, then the catalogue, then the website, then setup.
 */
function buildNavGroups(t: (key: string) => string): NavGroup[] {
  return [
    {
      group: t("shell.nav.groups.today"),
      items: [
        { to: "/admin", label: t("shell.nav.commandCenter"), icon: LayoutDashboard },
        { to: "/admin/requests", label: t("shell.nav.requests"), icon: Inbox, badge: "requests" },
        // Both screens existed and were fully built but had no navigation
        // entry, so they were only reachable by typing a URL (A-04). They sit
        // beside Requests because they are the same daily inbox work.
        { to: "/admin/flight-requests", label: t("shell.nav.flightRequests"), icon: Plane },
        { to: "/admin/messages", label: t("shell.nav.messages"), icon: Mail },
        { to: "/admin/bookings", label: t("shell.nav.bookings"), icon: Calendar },
      ],
    },
    {
      group: t("shell.nav.groups.business"),
      items: [
        { to: "/admin/packages", label: t("shell.nav.trips"), icon: PackageIcon },
        { to: "/admin/hotels", label: t("shell.nav.hotels"), icon: Building2 },
        { to: "/admin/customers", label: t("shell.nav.customers"), icon: Users },
        { to: "/admin/reports", label: t("shell.nav.reports"), icon: BarChart3 },
        { to: "/admin/branches", label: t("shell.nav.branches"), icon: MapPin },
      ],
    },
    {
      group: t("shell.nav.groups.website"),
      items: [
        { to: "/admin/services", label: t("shell.nav.services"), icon: LayoutGrid },
        { to: "/admin/features", label: t("shell.nav.features"), icon: BadgeCheck },
        { to: "/admin/gallery", label: t("shell.nav.gallery"), icon: ImageIcon },
        { to: "/admin/blog", label: t("shell.nav.blog"), icon: Newspaper },
        { to: "/admin/testimonials", label: t("shell.nav.testimonials"), icon: Star },
        { to: "/admin/faq", label: t("shell.nav.faq"), icon: HelpCircle },
      ],
    },
    {
      group: t("shell.nav.groups.setup"),
      items: [
        {
          to: "/admin/notifications",
          label: t("shell.nav.notifications"),
          icon: Bell,
          badge: "notifications",
        },
        { to: "/admin/settings", label: t("shell.nav.settings"), icon: Settings },
        { to: "/admin/admins", label: t("shell.nav.team"), icon: ShieldCheck, superOnly: true },
      ],
    },
  ];
}

function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread"] as const,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useOpenRequestCount() {
  return useQuery({
    queryKey: ["admin-open-requests"] as const,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [flights, bookings, messages, custom] = await Promise.all([
        supabase
          .from("flight_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("handled", false),
        // Custom Umrah requests still needing a decision (Phase 7.2). Counted
        // in the database with `head: true` — no rows travel to the browser.
        supabase
          .from("custom_package_requests")
          .select("id", { count: "exact", head: true })
          .not("status", "in", `(${[...TERMINAL_STATUSES].join(",")})`),
      ]);
      return (
        (flights.count ?? 0) + (bookings.count ?? 0) + (messages.count ?? 0) + (custom.count ?? 0)
      );
    },
  });
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "shell.greeting.morning";
  if (h < 18) return "shell.greeting.afternoon";
  return "shell.greeting.evening";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("admin");
  const { date } = useLocalized();
  const { user, isSuperAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const unread = useUnreadCount();
  const openRequests = useOpenRequestCount();

  const navGroups = useMemo(() => buildNavGroups(t), [t]);
  const groups = useMemo(
    () =>
      navGroups
        .map((g) => ({
          ...g,
          items: g.items.filter((n) => (n.superOnly ? isSuperAdmin : true)),
        }))
        .filter((g) => g.items.length > 0),
    [navGroups, isSuperAdmin],
  );

  const firstName = (user.email ?? "").split("@")[0] ?? "";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function badgeValue(kind: NavItem["badge"]): number {
    if (kind === "requests") return openRequests.data ?? 0;
    if (kind === "notifications") return unread.data ?? 0;
    return 0;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate({ to: "/admin/customers", search: { q } as never });
  }

  return (
    // Direction is set on <html> by LanguageProvider; the shell must inherit it.
    <div className="min-h-screen bg-surface-sunken/60">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/*
       * Off-canvas by inset, not by transform.
       *
       * This panel has now lost the same cascade fight twice. `translate-x-*`
       * needs an `rtl:` variant to know which way "off-screen" is, and that
       * variant compiles to an attribute selector — `[dir="rtl"]` — which
       * outranks the plain `translate-x-0` that is supposed to bring the panel
       * back. Scoping it to `max-lg` fixed the desktop rail but left the mobile
       * drawer broken in Arabic: measured at 390px, opening it left the panel
       * at `translate: 100%`, so an Arabic admin got the dimmed overlay and no
       * reachable navigation at all.
       *
       * `inset-inline-start` already knows which edge is the start, so there is
       * no `rtl:` variant to lose the cascade to: closed is `-start-72`, open
       * is `start-0`, and `lg:start-0` pins the desktop rail. One property,
       * direction-correct by construction, and it still animates.
       */}
      <aside
        className={cn(
          "fixed inset-y-0 z-50 flex w-72 flex-col border-e border-border-subtle bg-card",
          "transition-[inset-inline-start] duration-200 ease-standard",
          mobileOpen ? "start-0" : "-start-72 lg:start-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
          {/* The brand mark is a way home, not a navigation state — without
              exact matching the Router marked it as the current page on every
              /admin/* route. */}
          <Link to="/admin" activeOptions={{ exact: true }} onClick={() => setMobileOpen(false)}>
            <Logo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label={t("shell.closeNavigation")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.group} className="mb-2 space-y-0.5 last:mb-0">
              <p className="px-3 pb-2 pt-3 text-caption font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.group}
              </p>
              {group.items.map((item) => {
                // Exact match, or a real child segment. A bare `startsWith`
                // would also light up a sibling whose path merely begins with
                // this one (`/admin/blog` vs a future `/admin/blogs`).
                const path = location.pathname.replace(/\/+$/, "") || "/admin";
                const active =
                  item.to === "/admin"
                    ? path === "/admin"
                    : path === item.to || path.startsWith(item.to + "/");
                const Icon = item.icon;
                const count = badgeValue(item.badge);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    /*
                     * The Router sets its own `aria-current` and matches
                     * fuzzily, so `/admin` counted as current on every
                     * `/admin/*` page and three links announced themselves as
                     * the current page at once. Exact matching makes the
                     * Router agree with the `active` value used for styling.
                     */
                    activeOptions={{ exact: true }}
                    // Announced to assistive tech; the tint alone is not a state.
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group relative flex min-h-11 items-center gap-3 rounded-input px-3 py-2 text-small font-medium",
                      "transition-colors duration-fast ease-standard",
                      // Start-edge marker: mirrors with the writing direction,
                      // so selection is not carried by tint alone.
                      "before:absolute before:start-0 before:top-1/2 before:h-5 before:w-0.5",
                      "before:-translate-y-1/2 before:rounded-full before:transition-colors",
                      active
                        ? "bg-primary/10 text-primary before:bg-primary"
                        : "text-foreground/70 before:bg-transparent hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border-subtle p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-2 rounded-input px-3 py-2 text-small text-muted-foreground hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" /> {t("shell.viewPublicSite")}
          </a>
          <div className="mt-2 rounded-card border border-border-subtle bg-surface-sunken/60 p-3">
            <p className="text-caption text-muted-foreground">{t("shell.signedInAs")}</p>
            <p className="truncate text-small font-medium">{user.email}</p>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={signOut}>
              <LogOut className="me-2 h-4 w-4" /> {t("shell.signOut")}
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-subtle bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t("shell.openNavigation")}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-small font-semibold capitalize">
              {t(greetingKey())}, {firstName}
            </p>
            <p className="truncate text-caption text-muted-foreground">{date(new Date())}</p>
          </div>
          {/*
           * `min-w-0 flex-1` rather than `w-full`: a percentage width on a flex
           * item that cannot shrink is one bad sibling away from overflowing
           * the row. Measured at 390px the header fits either way — this is
           * defensive, not a fix for an observed break.
           */}
          <form onSubmit={submitSearch} className="ms-auto min-w-0 flex-1 sm:max-w-xs">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("shell.search.placeholder")}
              aria-label={t("shell.search.ariaLabel")}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-small outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </form>
          <Link
            to="/admin/notifications"
            className="relative rounded-xl p-2 hover:bg-accent"
            aria-label={t("shell.notificationsAriaLabel")}
          >
            <Bell className="h-4 w-4" />
            {(unread.data ?? 0) > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unread.data}
              </span>
            )}
          </Link>
          <LanguageSwitcher />
        </header>
        {/*
         * The measure lives here rather than inside each screen. It used to sit
         * inside `kit/Page`, so the screens that opened with a bare
         * `PageHeader` ran edge to edge on a wide display while the ones using
         * `Page` stopped at 1400px — two page widths in the same product.
         */}
        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
