-- Migration: 20260921110000_remediate_crm_and_installments_rls.sql
-- Description: SEC-02 & SEC-03: Remediate overly permissive RLS on customer_profiles and installments.
-- Replaces insecure `FOR ALL TO authenticated USING (true) WITH CHECK (true)` with strict admin-only policies.

-- ============================================================
-- 1. Revoke public/anonymous access
-- ============================================================
REVOKE ALL ON public.customer_profiles FROM anon;
REVOKE ALL ON public.installments FROM anon;

-- Ensure authenticated role has standard DML privileges (subject to RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;

-- Service role retains full administrative privileges
GRANT ALL ON public.customer_profiles TO service_role;
GRANT ALL ON public.installments TO service_role;

-- ============================================================
-- 2. Drop insecure policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage customer_profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage installments" ON public.installments;

-- Also clean up any legacy permissive variants
DROP POLICY IF EXISTS "customer_profiles_admin_all" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_admin_select" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_admin_insert" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_admin_update" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_admin_delete" ON public.customer_profiles;

DROP POLICY IF EXISTS "installments_admin_all" ON public.installments;
DROP POLICY IF EXISTS "installments_admin_select" ON public.installments;
DROP POLICY IF EXISTS "installments_admin_insert" ON public.installments;
DROP POLICY IF EXISTS "installments_admin_update" ON public.installments;
DROP POLICY IF EXISTS "installments_admin_delete" ON public.installments;

-- ============================================================
-- 3. Ensure service-role full access policies exist
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customer_profiles' AND policyname = 'Service role full access on customer_profiles'
  ) THEN
    CREATE POLICY "Service role full access on customer_profiles"
      ON public.customer_profiles
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'installments' AND policyname = 'Service role full access on installments'
  ) THEN
    CREATE POLICY "Service role full access on installments"
      ON public.installments
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 4. Create strict, granular policies for public.customer_profiles
-- Anonymous: DENIED (no policy, revokes in place)
-- Ordinary authenticated user: DENIED (is_admin returns false)
-- Admins: ALLOWED for SELECT, INSERT, UPDATE, DELETE
-- ============================================================
CREATE POLICY "customer_profiles_admin_select"
  ON public.customer_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "customer_profiles_admin_insert"
  ON public.customer_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "customer_profiles_admin_update"
  ON public.customer_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "customer_profiles_admin_delete"
  ON public.customer_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 5. Create strict, granular policies for public.installments
-- Anonymous: DENIED
-- Ordinary authenticated user: DENIED
-- Unauthorized staff: DENIED (is_admin covers super_admin & admin)
-- Admins: ALLOWED for SELECT, INSERT, UPDATE, DELETE
-- ============================================================
CREATE POLICY "installments_admin_select"
  ON public.installments
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "installments_admin_insert"
  ON public.installments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "installments_admin_update"
  ON public.installments
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "installments_admin_delete"
  ON public.installments
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
