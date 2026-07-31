import { type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package as PackageIcon,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Newspaper,
  MessageSquare,
  Star,
  HelpCircle,
  Users,
  Mail,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superOnly?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Operations",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/bookings", label: "Bookings", icon: Calendar },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { to: "/admin/packages", label: "Packages", icon: PackageIcon },
      { to: "/admin/branches", label: "Branches", icon: MapPin },
    ],
  },
  {
    group: "Website",
    items: [
      { to: "/admin/gallery", label: "Gallery", icon: ImageIcon },
      { to: "/admin/blog", label: "Blog", icon: Newspaper },
      { to: "/admin/testimonials", label: "Testimonials", icon: Star },
      { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/settings", label: "Settings", icon: Settings },
      { to: "/admin/admins", label: "Admins", icon: ShieldCheck, superOnly: true },
    ],
  },
];


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

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const unread = useUnreadCount();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((n) => (n.superOnly ? isSuperAdmin : true)),
  })).filter((g) => g.items.length > 0);


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div dir="ltr" className="min-h-screen bg-muted/30">
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link to="/admin" onClick={() => setMobileOpen(false)}>
            <Logo />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visible.map((item) => {
            const active =
              item.to === "/admin"
                ? location.pathname === "/admin" || location.pathname === "/admin/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-small font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.to === "/admin/notifications" && (unread.data ?? 0) > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground">
                    {unread.data}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-small text-muted-foreground hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" /> View public site
          </a>
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-caption text-muted-foreground">Signed in as</p>
            <p className="truncate text-small font-medium">{user.email}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={signOut}
            >
              <LogOut className="me-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Link
            to="/admin/notifications"
            className="relative rounded-md p-2 hover:bg-accent"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {(unread.data ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unread.data}
              </span>
            )}
          </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
