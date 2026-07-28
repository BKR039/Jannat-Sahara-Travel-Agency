import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth, useUserRoles, hasAdminRole, isSuperAdmin } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminContext } from "@/components/admin/context";
import { useEffect } from "react";

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
        <div className="max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <ShieldX className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have permission to access the admin dashboard. Contact your super admin
            to request access.
          </p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              Sign out
            </Button>
            <Button onClick={() => navigate({ to: "/" })}>Back to site</Button>
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
