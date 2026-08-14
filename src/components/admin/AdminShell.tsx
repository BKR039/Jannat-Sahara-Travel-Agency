import { type ReactNode, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
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
        { to: "/admin/bookings", label: t("shell.nav.bookings"), icon: Calendar },
      ],
    },
    {
      group: t("shell.nav.groups.business"),
      items: [
        { to: "/admin/packages", label: t("shell.nav.trips"), icon: PackageIcon },
        { to: "/admin/customers", label: t("shell.nav.customers"), icon: Users },
        { to: "/admin/reports", label: t("shell.nav.reports"), icon: BarChart3 },
        { to: "/admin/branches", label: t("shell.nav.branches"), icon: MapPin },
      ],
    },
    {
      group: t("shell.nav.groups.website"),
      items: [
        { to: "/admin/gallery", label: t("shell.nav.gallery"), icon: ImageIcon },
        { to: "/admin/blog", label: t("shell.nav.blog"), icon: Newspaper },
        { to: "/admin/testimonials", label: t("shell.nav.testimonials"), icon: Star },
        { to: "/admin/faq", label: t("shell.nav.faq"), icon: HelpCircle },
      ],
    },
    {
      group: t("shell.nav.groups.setup"),
      items: [
        { to: "/admin/notifications", label: t("shell.nav.notifications"), icon: Bell, badge: "notifications" },
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
      const [flights, bookings, messages] = await Promise.all([
        supabase.from("flight_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
      ]);
      return (flights.count ?? 0) + (bookings.count ?? 0) + (messages.count ?? 0);
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
      navGroups.map((g) => ({
        ...g,
        items: g.items.filter((n) => (n.superOnly ? isSuperAdmin : true)),
      })).filter((g) => g.items.length > 0),
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
    <div dir="ltr" className="min-h-screen bg-surface-sunken/60">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border-subtle bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
          <Link to="/admin" onClick={() => setMobileOpen(false)}>
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
            <div key={group.group} className="mb-4 space-y-0.5 last:mb-0">
              <p className="px-3 pb-1 pt-1 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                {group.group}
              </p>
              {group.items.map((item) => {
                const active =
                  item.to === "/admin"
                    ? location.pathname === "/admin" || location.pathname === "/admin/"
                    : location.pathname.startsWith(item.to);
                const Icon = item.icon;
                const count = badgeValue(item.badge);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-small font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground",
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
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-small text-muted-foreground hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" /> {t("shell.viewPublicSite")}
          </a>
          <div className="mt-2 rounded-xl border border-border-subtle bg-surface-sunken/60 p-3">
            <p className="text-caption text-muted-foreground">{t("shell.signedInAs")}</p>
            <p className="truncate text-small font-medium">{user.email}</p>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={signOut}>
              <LogOut className="me-2 h-4 w-4" /> {t("shell.signOut")}
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
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
            <p className="truncate text-caption text-muted-foreground">
              {date(new Date())}
            </p>
          </div>
          <form onSubmit={submitSearch} className="ms-auto w-full max-w-xs">
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
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unread.data}
              </span>
            )}
          </Link>
          <LanguageSwitcher />
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
