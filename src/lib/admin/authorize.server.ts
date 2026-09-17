/**
 * The single authoritative server-side authorization policy.
 *
 * Every privileged server function — anything that reaches for the service-role
 * client and therefore bypasses RLS — must gate on `requireAdmin` or
 * `requireSuperAdmin` from this module. Nothing else may define its own notion
 * of "admin": divergent helpers are how a weaker check ends up guarding a
 * stronger capability.
 *
 * The role model this encodes (see docs/04-auth-and-permissions.md):
 *
 *   super_admin  full dashboard access + team/role management
 *   admin        full dashboard access
 *   staff        NO dashboard and NO service-role access. Staff permissions are
 *                granted exclusively by RLS on the tables they may touch
 *                (`booking_passengers`, `customer_notes`), which they reach with
 *                their own token through the browser client.
 *
 * This mirrors the SQL predicates `public.is_admin()` / `public.is_super_admin()`
 * and the client gate `hasAdminRole()` / `isSuperAdmin()`. If the role model ever
 * changes, all four must change together.
 *
 * Server-only: never import this from a component. Pull it in with a dynamic
 * `await import()` inside a server-function handler.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/** Roles that may reach privileged (service-role) operations. */
export const ADMIN_ROLES: readonly AppRole[] = ["super_admin", "admin"] as const;

/** Roles that may manage team membership and other super-admin-only operations. */
export const SUPER_ADMIN_ROLES: readonly AppRole[] = ["super_admin"] as const;

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Fails closed: a lookup error is treated as "not authorized", never as a pass.
 */
async function hasAnyRole(userId: string, roles: readonly AppRole[]): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roles as AppRole[])
    .limit(1);

  if (error) {
    console.error("[authorize] role lookup failed", error.message);
    throw new AuthorizationError("Failed to verify permissions");
  }

  return (data?.length ?? 0) > 0;
}

/** Gate for every privileged server function. Throws unless the caller is admin or super_admin. */
export async function requireAdmin(userId: string): Promise<void> {
  if (!(await hasAnyRole(userId, ADMIN_ROLES))) {
    throw new AuthorizationError("Forbidden: admin required");
  }
}

/** Gate for team/role management. Throws unless the caller is super_admin. */
export async function requireSuperAdmin(userId: string): Promise<void> {
  if (!(await hasAnyRole(userId, SUPER_ADMIN_ROLES))) {
    throw new AuthorizationError("Forbidden: super admin required");
  }
}
