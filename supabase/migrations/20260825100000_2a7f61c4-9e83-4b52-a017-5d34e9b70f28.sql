-- Production content correctness.
--
-- Every row below was read before being written and is addressed by its own id
-- or a unique key. No bulk deletes, no schema, RLS or policy changes.

-- ---------------------------------------------------------------- branches --
-- Two values disagreed with the agency's own register.
--
-- Kebili's address ended "قبالة الوكالة". That word was reconstructed from a
-- source file that reached us with a broken encoding, and it was flagged at the
-- time as the one token that could not be read with confidence. The agency has
-- now confirmed it: "الولاية" — opposite the governorate headquarters.
UPDATE public.branches
   SET address = 'شارع الحبيب بورقيبة قبالة الولاية'
 WHERE id = '846e99b0-cb36-4147-997b-acc40e073649';

-- El Mourouj's number was stored with the spacing it happened to be written
-- with. The agency's register gives it unspaced, and every other branch is
-- stored unspaced, so this also makes `tel:` and wa.me links consistent.
UPDATE public.branches
   SET phone = '93683386'
 WHERE id = '9565a145-a70e-42f0-af83-320a4bce7829';

-- ------------------------------------------------------------ statistics --
-- "+12,000 عميل سعيد", "+850 رحلة منظمة", "+45 وجهة سياحية", "+15 سنوات الخبرة".
-- Seeded on 2026-08-21 in the same batch as the fabricated branches and
-- testimonials; the agency has never given us these figures. They were still
-- being published on /about. Removed rather than replaced with other invented
-- numbers: the table, the component and the admin screen all stay, so real
-- figures entered under Settings → Stats appear immediately.
DELETE FROM public.site_stats
 WHERE id IN (
   '6b441cb3-874c-4776-a4ba-be37857beb5c',
   '820526bf-6c01-4c8e-b887-76878750fec8',
   '26d60949-4e91-40ca-9e02-6bdf885702fb',
   '8ec89d4a-d5bb-4266-8245-19079bf25be4'
 );

-- --------------------------------------------------------------- features --
-- "خبرة أكثر من 15 سنة" is an unverifiable numeric claim. Replaced with a
-- neutral, non-numeric title taken from this row's own existing description
-- ("خبرة طويلة في تنظيم الرحلات وباقات العمرة") rather than a different number.
-- The description already makes no numeric claim and is left as it stands.
UPDATE public.features
   SET title = 'خبرة في تنظيم الرحلات'
 WHERE id = '8231b6df-e41b-4a66-b875-d17bc0d0618f';

-- ----------------------------------------------------------- contact info --
-- All three were seeded in the demo batch and none has been confirmed by the
-- agency. A wrong address sends mail nowhere and a wrong profile link sends
-- customers to someone else's page, so they are cleared rather than published
-- on a guess. Real phone numbers, the branch addresses and the contact form all
-- remain, so every row cleared here still has a working alternative.
UPDATE public.contact_info SET value = '', value_fr = NULL, value_en = NULL
 WHERE key IN ('email', 'facebook', 'instagram', 'hours');

-- -------------------------------------------------------------------- SEO --
-- The meta description named the agency "جنات صحارى", which is not its name:
-- every branch record, the brand copy and the logo lockup say
-- "جنة الصحراء للأسفار". The Latin title likewise read "Janat Sahara Travel"
-- while the brand name in French and English is "Janat Sahara Voyages".
UPDATE public.site_settings
   SET value = 'وكالة جنة الصحراء للأسفار: باقات عمرة، رحلات منظمة، تذاكر طيران وخدمات تأشيرات.'
 WHERE key = 'seo_meta_description';

UPDATE public.site_settings
   SET value = 'Janat Sahara Voyages — عمرة ورحلات وتأشيرات'
 WHERE key = 'seo_site_title';

-- ------------------------------------------------------------- hero image --
-- The homepage hero showed Al-Masjid an-Nabawi. The agency's brief puts Makkah
-- and the Kaaba on the hero, so the three wide agency photographs rotate: the
-- Kaaba leads the homepage, pilgrims performing tawaf head the Umrah catalogue,
-- and the Madinah sunset carries the closing call to action. All three are
-- agency photographs already in the media bucket; nothing new is introduced.
UPDATE public.site_content
   SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-wide.jpg?width=1920&quality=75&resize=contain'
 WHERE key = 'hero';

UPDATE public.site_content
   SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-pilgrims.jpg?width=1920&quality=75&resize=contain'
 WHERE key = 'umrah_hero';

UPDATE public.site_content
   SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/madinah-nabawi-sunset.jpg?width=1920&quality=75&resize=contain'
 WHERE key = 'cta';
