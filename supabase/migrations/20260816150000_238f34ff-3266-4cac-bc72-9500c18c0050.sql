-- Security fix X-02 — remove the hardcoded email-based super_admin grant.
--
-- Migration 20260728122029 installed two triggers on auth.users and a
-- SECURITY DEFINER function that inserted a super_admin role automatically
-- whenever a confirmed account matched one hardcoded personal email address.
-- That is a standing, invisible privilege-escalation path tied to a single
-- mailbox: it survives every role revocation, and it grants super_admin to
-- whoever controls that address at signup or email-confirmation time.
--
-- Bootstrap belongs in a one-off action, not a permanent trigger. After this
-- migration the only ways to obtain super_admin are:
--   1. an existing super_admin inserting the role (RLS policy
--      user_roles_super_admin_insert, gated by public.is_super_admin), or
--   2. a deliberate, manually executed statement by a database operator.
--
-- Existing role assignments in public.user_roles are NOT touched.

-- ---------------------------------------------------------------------------
-- Lockout guard: refuse to run unless a super_admin already exists.
-- Dropping the bootstrap grant while nobody holds the role would leave the
-- agency with no way to administer the team.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION
      'Aborting: no super_admin exists in public.user_roles. Grant super_admin to the owner account first, then re-run this migration.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Remove the automatic grant.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_grant_super_admin_on_created ON auth.users;
DROP TRIGGER IF EXISTS trg_grant_super_admin_on_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.grant_super_admin_for_founder();
