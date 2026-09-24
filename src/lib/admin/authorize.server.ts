/**
 * The authoritative server-side authorization policy.
 *
 * Every privileged server function — anything that reaches for the service-role
 * client and therefore bypasses RLS — must gate on `requirePermission`,
 * `requireAdmin`, or `requireSuperAdmin` from this module.
 *
 * Server-only: never import this from a client component. Pull it in with a dynamic
 * `await import()` inside a server-function handler.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import {
  type AppRole,
  type PermissionKey,
  computeEffectivePermissions,
  hasPermissionInList,
} from "./permissions";

export { type AppRole, type PermissionKey };

/** Roles that may reach privileged operations (subject to granular permissions). */
export const ADMIN_ROLES: readonly AppRole[] = ["super_admin", "admin", "staff"] as const;

/** Roles that may manage team membership and other super-admin-only operations. */
export const SUPER_ADMIN_ROLES: readonly AppRole[] = ["super_admin"] as const;

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Verifies that the user exists and is active (not banned, not marked disabled).
 * Throws AuthorizationError if invalid, banned, or disabled.
 */
export async function assertActiveUser(
  userId: string,
): Promise<{ id: string; email: string | null }> {
  if (!userId) {
    throw new AuthorizationError("Unauthorized: Missing user session");
  }

  const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (uErr || !u?.user) {
    throw new AuthorizationError("Unauthorized: User not found");
  }

  const isBanned = !!(u.user.banned_until && new Date(u.user.banned_until) > new Date());
  const isDisabled = u.user.app_metadata?.disabled === true;
  if (isBanned || isDisabled) {
    throw new AuthorizationError("Account is disabled. Access denied.");
  }

  return { id: u.user.id, email: u.user.email ?? null };
}

/**
 * Loads the user's roles from public.user_roles and custom overrides
 * from public.user_permissions, then computes their effective permissions set.
 */
export async function getUserEffectivePermissions(userId: string): Promise<Set<PermissionKey>> {
  await assertActiveUser(userId);

  const [rolesRes, overridesRes] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("user_permissions").select("permission, granted").eq("user_id", userId),
  ]);

  if (rolesRes.error) {
    console.error("[authorize] role lookup failed", rolesRes.error.message);
    throw new AuthorizationError("Failed to verify permissions");
  }

  const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
  const overrides = (overridesRes.data ?? []).map((o) => ({
    permission: o.permission,
    granted: o.granted,
  }));

  return computeEffectivePermissions(roles, overrides);
}

/**
 * Verifies if user has a specific permission.
 */
export async function hasServerPermission(
  userId: string,
  permission: PermissionKey,
): Promise<boolean> {
  try {
    const perms = await getUserEffectivePermissions(userId);
    return hasPermissionInList(perms, permission);
  } catch {
    return false;
  }
}

/**
 * Gating function: throws AuthorizationError unless caller has the required permission.
 */
export async function requirePermission(userId: string, permission: PermissionKey): Promise<void> {
  const perms = await getUserEffectivePermissions(userId);
  if (!hasPermissionInList(perms, permission)) {
    throw new AuthorizationError(`Forbidden: Missing permission [${permission}]`);
  }
}

/**
 * Gating function: throws AuthorizationError unless caller has at least one of the permissions.
 */
export async function requireAnyPermission(
  userId: string,
  permissions: readonly PermissionKey[],
): Promise<void> {
  const perms = await getUserEffectivePermissions(userId);
  const ok = permissions.some((p) => hasPermissionInList(perms, p));
  if (!ok) {
    throw new AuthorizationError(`Forbidden: Requires one of [${permissions.join(", ")}]`);
  }
}

/**
 * Check if user has a specific role.
 */
export async function requireRole(userId: string, role: AppRole): Promise<void> {
  await assertActiveUser(userId);
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new AuthorizationError(`Forbidden: ${role} required`);
  }
}

/**
 * Gate for administrative access. Super admin and admin pass; staff requires explicit permissions.
 */
export async function requireAdmin(userId: string): Promise<void> {
  await assertActiveUser(userId);
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ADMIN_ROLES as AppRole[])
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new AuthorizationError("Forbidden: admin required");
  }
}

/**
 * Gate for super-admin-only operations.
 */
export async function requireSuperAdmin(userId: string): Promise<void> {
  await assertActiveUser(userId);
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", SUPER_ADMIN_ROLES as AppRole[])
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new AuthorizationError("Forbidden: super admin required");
  }
}
