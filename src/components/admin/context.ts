import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { AppRole, PermissionKey } from "@/lib/admin/permissions";

export interface AdminContextValue {
  user: User;
  roles: AppRole[];
  permissions: PermissionKey[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  hasPermission: (key: PermissionKey) => boolean;
  hasAnyPermission: (keys: readonly PermissionKey[]) => boolean;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminContext");
  return ctx;
}
