-- Real business data — official Umrah programmes and branches.
--
-- Source of truth: the agency's own programme list and branch register.
-- Everything written here is a value the agency supplied verbatim. Fields the
-- source does not cover (price, hotel, airline, seats, e-mail, working hours,
-- FR/EN marketing names) are deliberately left NULL/zero rather than invented.
--
-- Dates: the source gives day + month with no year, so `departure_date` and
-- `return_date` (DATE columns) stay NULL — writing a year would invent a
-- season. The supplied day/month range is stored verbatim in
-- `short_description`, which both the card and the detail page already render.

-- ---------------------------------------------------------------- branches --
-- The three seeded rows (Tunis / Sfax / Sousse) were placeholder content with
-- fabricated addresses, phone numbers and coordinates. They are replaced by the
-- four real branches. No booking, request or audit row references branches.

DELETE FROM public.branches;

INSERT INTO public.branches
  (name, city, city_fr, city_en, address, phone, email, latitude, longitude,
   working_hours, google_maps_url, is_main_branch, is_active, sort_order)
VALUES
  ('وكالة جنة الصحراء للاسفار سوق الاحد',
   'سوق الأحد', 'Souk El Ahad', 'Souk El Ahad',
   'سوق الأحد قبالة بنك الزيتونة الطريق الوطنية 16',
   '96888888', NULL,
   33.775749838994194, 8.856094286414743,
   NULL, 'https://maps.app.goo.gl/GmH1FwjHdezEUGQSA', true, true, 1),

  ('وكالة جنة الصحراء للاسفار فرع الفوار قبلي',
   'الفوار', 'El Faouar', 'El Faouar',
   'سوق الفوار',
   '99322656', NULL,
   33.35497222, 8.67636111,
   NULL, 'https://maps.app.goo.gl/RmHzsYbRCXmdzLDXA', false, true, 2),

  ('وكالة جنة الصحراء للاسفار فرع قبلي',
   'قبلي', 'Kebili', 'Kebili',
   'شارع الحبيب بورقيبة قبالة الوكالة',
   '96877004', NULL,
   33.70659293025861, 8.972548852957585,
   NULL, 'https://maps.app.goo.gl/HToS4ZNrcC9mknku8', false, true, 3),

  ('وكالة جنة الصحراء للاسفار فرع المروج تونس',
   'المروج', 'El Mourouj', 'El Mourouj',
   'المروج شارع 20 مارس قرب مغازة عزيزة',
   '93 683 386', NULL,
   36.71336467058202, 10.206265875557683,
   NULL, 'https://maps.app.goo.gl/4ZQYrfCNXF68bAWe6', false, true, 4);

-- ------------------------------------------------------- site-wide contact --
-- `contact_info` carried seeded placeholder digits (+216 71 234 567,
-- +216 55 123 456 and a wa.me link built from the latter). The address and
-- phone are realigned with the branch the agency designates as its main office;
-- the fabricated mobile and WhatsApp link are cleared rather than guessed at.

UPDATE public.contact_info SET value = '96888888', value_fr = NULL, value_en = NULL
  WHERE key = 'phone';
UPDATE public.contact_info SET value = '', value_fr = NULL, value_en = NULL
  WHERE key IN ('mobile', 'whatsapp');
UPDATE public.contact_info
   SET value = 'سوق الأحد قبالة بنك الزيتونة الطريق الوطنية 16',
       value_fr = NULL, value_en = NULL
  WHERE key = 'address';

-- ------------------------------------------------------- Umrah programmes --
-- The two seeded Umrah packages ("باقة العمرة الاقتصادية" / "الفاخرة") were
-- placeholder catalogue entries: invented hotels, airlines, durations and
-- prices. They describe the same concept the real programmes replace, so they
-- go. The remaining seeded rows (trips / flights / visas) are outside this
-- update and are left untouched in their existing draft state.

DELETE FROM public.packages WHERE slug IN ('umrah-economy', 'umrah-luxury');

-- Marketing names (`title`) stay in Arabic in every language: they are the
-- agency's own names and `L(pkg, "title", "base")` shows the base value as-is.
-- The date range, duration and destination are facts rather than marketing
-- copy, and those columns have no cross-language fallback — without an `_fr`
-- and `_en` value a French or English visitor sees a programme with no dates at
-- all. The months are the same Franco-Tunisian calendar written in Latin
-- script, so nothing here is a new claim.

INSERT INTO public.packages
  (slug, title, short_description, short_description_fr, short_description_en,
   category, status, price, currency,
   duration, duration_fr, duration_en,
   destination, destination_fr, destination_en, featured, sort_order)
VALUES
  ('umrah-28-septembre', 'عمرة سبتمبر — عمرة بداية الموسم',
   '28 سبتمبر → 11 أكتوبر', '28 septembre → 11 octobre', '28 September → 11 October',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 1),
  ('umrah-15-novembre', 'عمرة نوفمبر',
   '15 نوفمبر → 29 نوفمبر', '15 novembre → 29 novembre', '15 November → 29 November',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 2),
  ('umrah-20-decembre', 'عمرة ديسمبر — عمرة العطلة',
   '20 ديسمبر → 03 جانفي', '20 décembre → 03 janvier', '20 December → 03 January',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 3),
  ('umrah-13-janvier', 'عمرة جانفي — عمرة شعبان',
   '13 جانفي → 27 جانفي', '13 janvier → 27 janvier', '13 January → 27 January',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 4),
  -- Programmes 5 and 6 intentionally share a marketing name; their dates are
  -- what tell them apart. Never merge or rename them.
  ('umrah-23-fevrier', 'عمرة فيفري — عمرة رمضان',
   '23 فيفري → 09 مارس', '23 février → 09 mars', '23 February → 09 March',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 5),
  ('umrah-26-fevrier', 'عمرة فيفري — عمرة رمضان',
   '26 فيفري → 12 مارس', '26 février → 12 mars', '26 February → 12 March',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 6),
  ('umrah-10-mars', 'عمرة مارس — عمرة شوال',
   '10 مارس → 24 مارس', '10 mars → 24 mars', '10 March → 24 March',
   'umrah', 'published', 0, 'TND', '14 يوم', '14 jours', '14 days',
   'مكة المكرمة والمدينة المنورة', 'La Mecque et Médine', 'Makkah and Madinah', false, 7)
ON CONFLICT (slug) DO UPDATE SET
  title                = EXCLUDED.title,
  short_description    = EXCLUDED.short_description,
  short_description_fr = EXCLUDED.short_description_fr,
  short_description_en = EXCLUDED.short_description_en,
  category             = EXCLUDED.category,
  status               = EXCLUDED.status,
  duration             = EXCLUDED.duration,
  duration_fr          = EXCLUDED.duration_fr,
  duration_en          = EXCLUDED.duration_en,
  destination          = EXCLUDED.destination,
  destination_fr       = EXCLUDED.destination_fr,
  destination_en       = EXCLUDED.destination_en,
  sort_order           = EXCLUDED.sort_order;

-- `seats` and `total_seats` default to 0, and the public card reads
-- `seats <= 0` as sold out. The agency has not published capacity for these
-- programmes, so the value is unknown, not zero.
-- Guarded on 0 so re-running never discards capacity the agency has since set,
-- for the same reason the upsert above leaves price/hotel/airline alone.
UPDATE public.packages
   SET seats = NULL
 WHERE category = 'umrah' AND slug LIKE 'umrah-%' AND seats = 0;
UPDATE public.packages
   SET total_seats = NULL
 WHERE category = 'umrah' AND slug LIKE 'umrah-%' AND total_seats = 0;
