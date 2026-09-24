import { useEffect, useState, useMemo } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type AppRole,
  type PermissionKey,
  computeEffectivePermissions,
  hasPermissionInList,
  hasAnyPermissionInList,
} from "@/lib/admin/permissions";

export type { AppRole, PermissionKey };

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading, isAuthenticated: !!user };
}

export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_roles", userId ?? "anon"] as const,
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

/**
 * Loads user roles and custom overrides, providing instant permission checking.
 */
export function useUserPermissions(userId: string | undefined) {
  const rolesQuery = useUserRoles(userId);

  const overridesQuery = useQuery({
    queryKey: ["user_permissions", userId ?? "anon"] as const,
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission, granted")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        permission: r.permission,
        granted: r.granted,
      }));
    },
  });

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const overrides = useMemo(() => overridesQuery.data ?? [], [overridesQuery.data]);

  const effectiveSet = useMemo(() => {
    return computeEffectivePermissions(roles, overrides);
  }, [roles, overrides]);

  const effectiveArray = useMemo(() => Array.from(effectiveSet), [effectiveSet]);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");

  const hasPermission = (key: PermissionKey) => hasPermissionInList(effectiveSet, key);
  const hasAnyPermission = (keys: readonly PermissionKey[]) =>
    hasAnyPermissionInList(effectiveSet, keys);

  return {
    isLoading: rolesQuery.isLoading || overridesQuery.isLoading,
    isError: rolesQuery.isError || overridesQuery.isError,
    roles,
    permissions: effectiveArray,
    isSuperAdmin,
    isAdmin,
    isStaff,
    hasPermission,
    hasAnyPermission,
  };
}

/** Check whether user has access to the admin console (super_admin, admin, staff) */
export function hasAdminConsoleAccess(roles: AppRole[] | undefined): boolean {
  if (!roles) return false;
  return roles.includes("super_admin") || roles.includes("admin") || roles.includes("staff");
}

export function hasAdminRole(roles: AppRole[] | undefined): boolean {
  if (!roles) return false;
  return roles.includes("super_admin") || roles.includes("admin");
}

export function isSuperAdmin(roles: AppRole[] | undefined): boolean {
  return !!roles?.includes("super_admin");
}
