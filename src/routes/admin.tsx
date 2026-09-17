import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth, useUserRoles, hasAdminRole, isSuperAdmin } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminContext } from "@/components/admin/context";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { adminDocTitle } from "@/lib/admin/doc-title";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("dashboard") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useAuth();
  const rolesQuery = useUserRoles(user?.id);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  /*
   * A bare spinner centred on an empty viewport told the operator nothing and
   * made the console feel like it was failing to load. This is the shape of
   * the shell that is about to appear — sidebar rail, header bar, page block —
   * so the layout does not jump when the real thing arrives.
   */
  if (loading || (isAuthenticated && rolesQuery.isLoading)) {
    return (
      <div
        className="min-h-screen bg-surface-sunken/60"
        role="status"
        aria-label={t("shell.layout.loading")}
      >
        <div className="fixed inset-y-0 start-0 hidden w-72 border-e border-border-subtle bg-card p-4 lg:block">
          <div className="h-9 w-40 animate-pulse rounded-input bg-muted" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-input bg-muted/70" />
            ))}
          </div>
        </div>
        <div className="lg:ps-72">
          <div className="flex h-16 items-center gap-3 border-b border-border-subtle px-4 sm:px-6">
            <div className="h-9 w-48 animate-pulse rounded-input bg-muted" />
            <div className="ms-auto h-9 w-64 animate-pulse rounded-input bg-muted" />
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="h-8 w-56 animate-pulse rounded-input bg-muted" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-card border border-border-subtle bg-card"
                />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-card border border-border-subtle bg-card" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const roles = rolesQuery.data;
  if (!hasAdminRole(roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-card border border-border-subtle bg-card p-8 text-center">
          <ShieldX className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-h5 font-bold">{t("shell.layout.accessDeniedTitle")}</h1>
          <p className="mt-2 text-small text-muted-foreground">
            {t("shell.layout.accessDeniedDescription")}
          </p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              {t("shell.layout.signOut")}
            </Button>
            <Button onClick={() => navigate({ to: "/" })}>{t("shell.layout.backToSite")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider
      value={{
        user: user!,
        roles: roles!,
        isSuperAdmin: isSuperAdmin(roles),
      }}
    >
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminContext.Provider>
  );
}
