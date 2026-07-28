import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/hooks/useAuth";

export interface AdminContextValue {
  user: User;
  roles: AppRole[];
  isSuperAdmin: boolean;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminContext");
  return ctx;
}
