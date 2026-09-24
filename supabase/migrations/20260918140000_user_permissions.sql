-- Migration: 20260918140000_user_permissions.sql
-- Description: Centralized granular user permissions and capability overrides.

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_perm ON public.user_permissions(permission);

-- Grants
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 1. Read policy: authenticated users can read their own permissions, admins can read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_read') THEN
    CREATE POLICY user_permissions_read ON public.user_permissions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- 2. Insert policy: Super Admin only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_super_admin_insert') THEN
    CREATE POLICY user_permissions_super_admin_insert ON public.user_permissions
      FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- 3. Update policy: Super Admin only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_super_admin_update') THEN
    CREATE POLICY user_permissions_super_admin_update ON public.user_permissions
      FOR UPDATE TO authenticated
      USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- 4. Delete policy: Super Admin only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_super_admin_delete') THEN
    CREATE POLICY user_permissions_super_admin_delete ON public.user_permissions
      FOR DELETE TO authenticated
      USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;
