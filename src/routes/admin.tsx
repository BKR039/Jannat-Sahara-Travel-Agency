import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth, useUserRoles, hasAdminRole, isSuperAdmin } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminContext } from "@/components/admin/context";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Janat Sahara Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
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

  if (loading || (isAuthenticated && rolesQuery.isLoading)) {
    return (
      <div dir="ltr" className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const roles = rolesQuery.data;
  if (!hasAdminRole(roles)) {
    return (
      <div dir="ltr" className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center rounded-lg border border-border bg-card p-8 shadow-sm">
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
