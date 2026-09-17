-- Public-site fix P-03 — make the category hero images agency-managed.
--
-- /umrah, /trips and /visa previously rendered hardcoded Unsplash URLs compiled
-- into the bundle. They now read their hero image from `site_content`, the same
-- keyed content model the homepage hero already uses.
--
-- `ContentSection` in Settings lists every `site_content` row generically and
-- renders an image uploader for each, so creating these rows is all that is
-- needed for the agency to manage the images — no Settings UI change required.
--
-- Images are intentionally left NULL: no stock photography is seeded. Until the
-- agency uploads one, the page renders the branded gradient hero on its own,
-- exactly as the homepage hero does when its image is unset.

INSERT INTO public.site_content (key, title, subtitle, body, image, cta_label, cta_href, data)
VALUES
  ('umrah_hero',  NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb),
  ('trips_hero',  NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb),
  ('visa_hero',   NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
