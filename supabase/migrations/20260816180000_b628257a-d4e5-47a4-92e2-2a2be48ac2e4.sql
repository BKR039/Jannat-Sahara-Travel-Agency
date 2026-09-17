-- Settings wiring S-01 — restrict the public read of site_settings.
--
-- The public website now reads `site_settings` for brand and SEO values. The
-- table also holds operational configuration that no visitor should ever see:
--   email_*     notification recipients and sender identity
--   notify_*    dashboard alert preferences
--   security_*  access and session policy
--
-- The previous policy was `USING (true)`, so every one of those rows was
-- readable by any anonymous visitor. Narrowing it to the two public groups
-- closes that exposure and matches what the new public query actually selects.
--
-- Admins are unaffected: `site_settings_admin_write` is FOR ALL, and permissive
-- policies are OR-ed, so an authenticated admin still reads and writes every row.

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;

CREATE POLICY site_settings_public_read ON public.site_settings
  FOR SELECT
  USING (group_name IN ('brand', 'seo'));
