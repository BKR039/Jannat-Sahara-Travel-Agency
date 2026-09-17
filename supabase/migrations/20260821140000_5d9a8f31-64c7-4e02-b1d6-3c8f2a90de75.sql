-- Supabase integration — create the storage buckets the application requires.
--
-- The access policies for `passports` and `media` were written in
-- 20260728113306 and 20260728122029, but nothing ever created the buckets
-- themselves. Policies on storage.objects do not imply a bucket exists, so on a
-- freshly provisioned project every upload fails with "Bucket not found" while
-- the policies look perfectly correct.
--
-- Limits mirror the application's own validation so the database refuses
-- anything the server would have refused:
--   media     -> ALLOWED_MEDIA_TYPES / MAX_MEDIA_BYTES      (src/lib/admin/media.ts)
--   passports -> ALLOWED_PASSPORT_MIME / MAX_PASSPORT_UPLOAD_BYTES
--                                                        (src/lib/security.server.ts)

-- ---------------------------------------------------------------------------
-- media — public read. Logos, covers, gallery images, article images.
-- Nothing personal is ever stored here.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- passports — PRIVATE. Identity documents attached to bookings.
--
-- `public` must stay false: a public bucket would make every passport scan
-- readable by anyone who can guess or obtain the object path. Admins reach
-- these files exclusively through short-lived signed URLs minted server-side
-- (see src/lib/booking.functions.ts).
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passports',
  'passports',
  false,
  8388608, -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false, -- never widened by a re-run, whatever the row said before
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Passport read/delete were gated on has_role(uid,'admin'), which excludes
-- super_admin — the role model says super_admin has at least an admin's access
-- (src/lib/admin/authorize.server.ts, docs/04-auth-and-permissions.md). The
-- owner of the agency could not open a passport scan. `is_admin()` covers both
-- roles and is what every other admin policy in this schema uses.
--
-- This narrows nothing: staff and anon were excluded before and still are.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "passports_admin_read" ON storage.objects;
CREATE POLICY "passports_admin_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'passports' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "passports_admin_delete" ON storage.objects;
CREATE POLICY "passports_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'passports' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "passports_admin_update" ON storage.objects;
CREATE POLICY "passports_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'passports' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'passports' AND public.is_admin(auth.uid()));
