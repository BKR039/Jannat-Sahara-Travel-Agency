
-- ============================================================
-- 1. Rebuild enums to add super_admin/staff and sold_out
-- ============================================================

-- Drop dependent policies first
DROP POLICY IF EXISTS bookings_admin_delete ON public.bookings;
DROP POLICY IF EXISTS bookings_admin_select ON public.bookings;
DROP POLICY IF EXISTS bookings_admin_update ON public.bookings;
DROP POLICY IF EXISTS contact_messages_admin_delete ON public.contact_messages;
DROP POLICY IF EXISTS contact_messages_admin_select ON public.contact_messages;
DROP POLICY IF EXISTS contact_messages_admin_update ON public.contact_messages;
DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;
DROP POLICY IF EXISTS packages_public_read ON public.packages;
DROP POLICY IF EXISTS passports_admin_read ON storage.objects;
DROP POLICY IF EXISTS passports_admin_delete ON storage.objects;
DROP POLICY IF EXISTS passports_admin_insert ON storage.objects;
DROP POLICY IF EXISTS passports_admin_update ON storage.objects;

-- Drop functions that depend on the enum types
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Convert enum columns to text temporarily
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.packages  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.packages  ALTER COLUMN status TYPE text USING status::text;

-- Drop and recreate enums
DROP TYPE public.app_role;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff');

DROP TYPE public.package_status;
CREATE TYPE public.package_status AS ENUM ('draft', 'published', 'archived', 'sold_out');

-- Convert back
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;
ALTER TABLE public.packages  ALTER COLUMN status TYPE public.package_status USING status::public.package_status;
ALTER TABLE public.packages  ALTER COLUMN status SET DEFAULT 'draft'::public.package_status;

-- Recreate has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::public.app_role
  )
$$;

-- ============================================================
-- 2. Expand packages table
-- ============================================================
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS departure_date date,
  ADD COLUMN IF NOT EXISTS return_date date,
  ADD COLUMN IF NOT EXISTS hotel_rating integer,
  ADD COLUMN IF NOT EXISTS transport text,
  ADD COLUMN IF NOT EXISTS meeting_point text,
  ADD COLUMN IF NOT EXISTS required_documents jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brochure_pdf text,
  ADD COLUMN IF NOT EXISTS discount_price numeric,
  ADD COLUMN IF NOT EXISTS total_seats integer,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_packages_category      ON public.packages (category);
CREATE INDEX IF NOT EXISTS idx_packages_status        ON public.packages (status);
CREATE INDEX IF NOT EXISTS idx_packages_featured      ON public.packages (featured);
CREATE INDEX IF NOT EXISTS idx_packages_sort          ON public.packages (sort_order);
CREATE INDEX IF NOT EXISTS idx_bookings_status        ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at    ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_email         ON public.bookings (email);
CREATE INDEX IF NOT EXISTS idx_bookings_phone         ON public.bookings (phone);
CREATE INDEX IF NOT EXISTS idx_articles_published     ON public.articles (published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_active_sort    ON public.gallery_items (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_branches_active_sort   ON public.branches (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_contact_messages_handled ON public.contact_messages (handled, created_at DESC);

-- ============================================================
-- 3. Audit logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY audit_logs_admin_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND (actor_id IS NULL OR actor_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity  ON public.audit_logs (entity, entity_id);

-- ============================================================
-- 4. Notifications (admin center)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  entity text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_admin_all ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON public.notifications (read_at) WHERE read_at IS NULL;

-- Trigger to insert notification on new booking
CREATE OR REPLACE FUNCTION public.tg_notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (kind, title, body, entity, entity_id)
  VALUES (
    'booking',
    'New booking request',
    COALESCE(NEW.name, 'Guest') || ' — ' || COALESCE(NEW.package_title, 'General inquiry'),
    'bookings',
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_booking();

CREATE OR REPLACE FUNCTION public.tg_notify_new_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (kind, title, body, entity, entity_id)
  VALUES (
    'contact',
    'New contact message',
    COALESCE(NEW.name, 'Visitor') || ' — ' || COALESCE(NEW.subject, 'no subject'),
    'contact_messages',
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_contact_message ON public.contact_messages;
CREATE TRIGGER trg_notify_new_contact_message
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_contact_message();

-- ============================================================
-- 5. Auto-grant super_admin to the founder email
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_super_admin_for_founder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND lower(NEW.email) = 'boubakar.hamedsghaier@gmail.com'
     AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_super_admin_on_created ON auth.users;
CREATE TRIGGER trg_grant_super_admin_on_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_for_founder();

DROP TRIGGER IF EXISTS trg_grant_super_admin_on_confirmed ON auth.users;
CREATE TRIGGER trg_grant_super_admin_on_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.grant_super_admin_for_founder();

-- Backfill in case the founder already signed up + confirmed before this migration
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'boubakar.hamedsghaier@gmail.com'
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 6. Recreate policies (bookings, contact_messages, user_roles, packages read)
-- ============================================================

-- Packages public read
CREATE POLICY packages_public_read ON public.packages
  FOR SELECT TO public
  USING (status = 'published'::public.package_status OR status = 'sold_out'::public.package_status);

-- Bookings
CREATE POLICY bookings_admin_select ON public.bookings
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY bookings_admin_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY bookings_admin_delete ON public.bookings
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Contact messages
CREATE POLICY contact_messages_admin_select ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY contact_messages_admin_update ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY contact_messages_admin_delete ON public.contact_messages
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- User roles
CREATE POLICY user_roles_self_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY user_roles_super_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY user_roles_super_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY user_roles_super_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ============================================================
-- 7. Admin write on all content tables
-- ============================================================
CREATE POLICY packages_admin_all ON public.packages
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY articles_admin_all ON public.articles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY services_admin_all ON public.services
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY features_admin_all ON public.features
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY testimonials_admin_all ON public.testimonials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY gallery_items_admin_all ON public.gallery_items
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY faqs_admin_all ON public.faqs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY site_content_admin_all ON public.site_content
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY site_stats_admin_all ON public.site_stats
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY contact_info_admin_all ON public.contact_info
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY branches_admin_all ON public.branches
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 8. Storage policies for the `media` bucket (created via tool)
-- Public read for the bucket; admins can write/update/delete.
-- (passports bucket stays admin-only via signed URLs from service role.)
-- ============================================================

-- These will succeed only if the `media` bucket exists; safe if repeated.
DROP POLICY IF EXISTS "media public read" ON storage.objects;
DROP POLICY IF EXISTS "media admin write" ON storage.objects;
DROP POLICY IF EXISTS "media admin update" ON storage.objects;
DROP POLICY IF EXISTS "media admin delete" ON storage.objects;

CREATE POLICY "media public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'media');

CREATE POLICY "media admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_admin(auth.uid()));

CREATE POLICY "media admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'media' AND public.is_admin(auth.uid()));

CREATE POLICY "media admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin(auth.uid()));

-- Passports admin read via storage RLS (in addition to signed URLs generated server-side)
DROP POLICY IF EXISTS "passports admin read" ON storage.objects;
CREATE POLICY "passports admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'passports' AND public.is_admin(auth.uid()));
