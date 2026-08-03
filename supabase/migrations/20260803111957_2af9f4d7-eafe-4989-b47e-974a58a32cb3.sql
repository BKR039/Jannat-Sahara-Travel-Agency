CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null default '',
  group_name text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_admin_write" ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value, group_name) VALUES
  ('brand_tagline', 'رحلتك تبدأ من هنا', 'brand'),
  ('brand_logo_url', '', 'brand'),
  ('brand_favicon_url', '', 'brand'),
  ('brand_primary_color', '#EE5A24', 'brand'),
  ('brand_accent_color', '#C9982E', 'brand'),
  ('seo_site_title', 'Janat Sahara Travel — عمرة ورحلات وتأشيرات', 'seo'),
  ('seo_meta_description', 'وكالة جنات صحارى للسفر: باقات عمرة، رحلات منظمة، تذاكر طيران وخدمات تأشيرات.', 'seo'),
  ('seo_keywords', 'عمرة, رحلات, تأشيرات, طيران, تونس', 'seo'),
  ('seo_og_image', '', 'seo'),
  ('seo_canonical_base', '', 'seo'),
  ('seo_indexing_enabled', 'true', 'seo'),
  ('seo_google_verification', '', 'seo'),
  ('email_owner_recipient', '', 'email'),
  ('email_cc_recipient', '', 'email'),
  ('email_from_name', 'Janat Sahara Travel', 'email'),
  ('email_reply_to', '', 'email'),
  ('email_subject_prefix', '[Booking]', 'email'),
  ('email_booking_enabled', 'true', 'email'),
  ('notify_new_booking', 'true', 'notifications'),
  ('notify_new_message', 'true', 'notifications'),
  ('notify_newsletter', 'false', 'notifications'),
  ('notify_daily_digest', 'false', 'notifications'),
  ('security_require_2fa', 'false', 'security'),
  ('security_session_hours', '24', 'security'),
  ('security_audit_logging', 'true', 'security')
ON CONFLICT (key) DO NOTHING;