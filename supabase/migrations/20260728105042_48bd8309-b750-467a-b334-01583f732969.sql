
-- Enum for package categories and status
CREATE TYPE public.package_category AS ENUM ('umrah', 'trip', 'flight', 'visa');
CREATE TYPE public.package_status AS ENUM ('draft', 'published', 'archived');

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- packages
-- =========================================================
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category public.package_category NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(5,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TND',
  destination TEXT,
  country TEXT,
  duration TEXT,
  seats INTEGER DEFAULT 0,
  cover TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  included JSONB DEFAULT '[]'::jsonb,
  excluded JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  hotel TEXT,
  airline TEXT,
  status public.package_status NOT NULL DEFAULT 'published',
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT USING (status = 'published');
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX packages_category_idx ON public.packages(category);
CREATE INDEX packages_featured_idx ON public.packages(featured);

-- =========================================================
-- site_stats
-- =========================================================
CREATE TABLE public.site_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_stats_public_read" ON public.site_stats FOR SELECT USING (true);
CREATE TRIGGER trg_stats_updated BEFORE UPDATE ON public.site_stats FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- services
-- =========================================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  cover TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (active = true);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- features (why choose us)
-- =========================================================
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.features TO anon, authenticated;
GRANT ALL ON public.features TO service_role;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "features_public_read" ON public.features FOR SELECT USING (active = true);
CREATE TRIGGER trg_features_updated BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- testimonials
-- =========================================================
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  avatar TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_public_read" ON public.testimonials FOR SELECT USING (active = true);
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- gallery_items
-- =========================================================
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_public_read" ON public.gallery_items FOR SELECT USING (active = true);
CREATE TRIGGER trg_gallery_updated BEFORE UPDATE ON public.gallery_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- articles (blog)
-- =========================================================
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  cover TEXT,
  author TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public_read" ON public.articles FOR SELECT USING (published = true);
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- faqs
-- =========================================================
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_public_read" ON public.faqs FOR SELECT USING (active = true);
CREATE TRIGGER trg_faqs_updated BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- site_content (hero / cta / about singleton blocks)
-- =========================================================
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  body TEXT,
  image TEXT,
  cta_label TEXT,
  cta_href TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_content_public_read" ON public.site_content FOR SELECT USING (true);
CREATE TRIGGER trg_content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- contact_info (address, phone, email, social)
-- =========================================================
CREATE TABLE public.contact_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT,
  value TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contact_info TO anon, authenticated;
GRANT ALL ON public.contact_info TO service_role;
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_info_public_read" ON public.contact_info FOR SELECT USING (true);
CREATE TRIGGER trg_contact_info_updated BEFORE UPDATE ON public.contact_info FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- contact_messages (public write-only inbox)
-- =========================================================
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_messages_public_insert" ON public.contact_messages FOR INSERT WITH CHECK (true);

-- =========================================================
-- SEED DATA
-- =========================================================

INSERT INTO public.site_content (key, title, subtitle, body, image, cta_label, cta_href, data) VALUES
('hero', 'رحلتك الروحية تبدأ من هنا', 'وكالة أسفار متخصصة في العمرة والرحلات السياحية', 'اكتشف باقات مميزة للعمرة والسياحة مع خبراء الأسفار', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80', 'احجز الآن', '/umrah', '{"badges":["ترخيص رسمي","خدمة 24/7","أسعار تنافسية"]}'::jsonb),
('cta', 'جاهز لبداية رحلتك؟', 'تواصل مع فريقنا وسنساعدك على اختيار الباقة المناسبة', NULL, 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1920&q=80', 'تواصل معنا', '/contact', '{}'::jsonb),
('about', 'من نحن', 'وكالة أسفار رائدة في تونس', 'جنة الصحراء للأسفار وكالة تونسية متخصصة منذ سنوات في تنظيم رحلات العمرة والسياحة الدينية والترفيهية. نقدم خدمات متكاملة تشمل الحجوزات، التأشيرات، وتذاكر الطيران مع فريق من الخبراء المتفانين لضمان رحلة لا تُنسى.', 'https://images.unsplash.com/photo-1564769625392-651b2c4b6b6c?w=1600&q=80', NULL, NULL, '{"mission":"تقديم أفضل تجربة سفر بأعلى معايير الجودة والراحة","vision":"أن نكون الوكالة الأولى في المنطقة لخدمات العمرة والسياحة","values":["الأمانة","الجودة","الاحترافية","الابتكار"]}'::jsonb);

INSERT INTO public.site_stats (label, value, icon, sort_order) VALUES
('عميل سعيد', '+12,000', 'users', 1),
('رحلة منظمة', '+850', 'plane', 2),
('وجهة سياحية', '+45', 'map', 3),
('سنوات الخبرة', '+15', 'award', 4);

INSERT INTO public.services (title, slug, description, icon, sort_order) VALUES
('باقات العمرة', 'umrah', 'باقات متكاملة لأداء العمرة بكل يسر وراحة', 'moon', 1),
('الرحلات السياحية', 'trips', 'رحلات سياحية إلى أجمل الوجهات حول العالم', 'palm-tree', 2),
('تذاكر الطيران', 'flights', 'أفضل الأسعار لتذاكر الطيران الدولية والمحلية', 'plane', 3),
('التأشيرات', 'visa', 'خدمات استخراج التأشيرات لجميع الوجهات', 'stamp', 4);

INSERT INTO public.features (title, description, icon, sort_order) VALUES
('خبرة أكثر من 15 سنة', 'خبرة طويلة في تنظيم الرحلات وباقات العمرة', 'award', 1),
('أسعار تنافسية', 'أفضل الأسعار مع ضمان جودة الخدمة', 'badge-dollar-sign', 2),
('دعم على مدار الساعة', 'فريق دعم متاح 24 ساعة لخدمتكم', 'headphones', 3),
('ترخيص رسمي', 'وكالة مرخصة من وزارة السياحة التونسية', 'shield-check', 4),
('فنادق فاخرة', 'شراكة مع أفضل الفنادق قرب الحرمين', 'building', 5),
('رحلات مخصصة', 'باقات مصممة حسب احتياجاتكم', 'sparkles', 6);

INSERT INTO public.testimonials (name, role, avatar, content, rating, sort_order) VALUES
('أحمد بن علي', 'حاج عمرة 2024', 'https://i.pravatar.cc/150?img=12', 'تجربة رائعة مع جنة الصحراء، كل التفاصيل كانت مدروسة والفندق قريب جداً من الحرم. أنصح بهم بشدة.', 5, 1),
('فاطمة الزهراء', 'سياحة إسطنبول', 'https://i.pravatar.cc/150?img=45', 'رحلة إلى إسطنبول كانت حلماً، البرنامج غني والفريق محترف. سنعود للحجز معهم قريباً إن شاء الله.', 5, 2),
('محمد التونسي', 'حاج عمرة 2023', 'https://i.pravatar.cc/150?img=33', 'خدمة راقية من البداية إلى النهاية، والأسعار معقولة جداً مقارنة بالجودة المقدمة.', 5, 3),
('سلمى بن قاسم', 'رحلة ماليزيا', 'https://i.pravatar.cc/150?img=47', 'كل شيء كان مثالياً، من التأشيرة إلى الفنادق والجولات. شكراً لكم من القلب.', 5, 4);

INSERT INTO public.gallery_items (title, image, category, sort_order) VALUES
('الحرم المكي', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80', 'umrah', 1),
('المسجد النبوي', 'https://images.unsplash.com/photo-1537444667181-1fdd4b58af26?w=1200&q=80', 'umrah', 2),
('إسطنبول', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80', 'trips', 3),
('دبي', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80', 'trips', 4),
('ماليزيا', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f11?w=1200&q=80', 'trips', 5),
('باريس', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80', 'trips', 6),
('المدينة المنورة', 'https://images.unsplash.com/photo-1591129841117-3adfd313e34f?w=1200&q=80', 'umrah', 7),
('مقصورة الطائرة', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80', 'flights', 8);

INSERT INTO public.faqs (question, answer, category, sort_order) VALUES
('ما هي مدة معالجة تأشيرة العمرة؟', 'عادة تستغرق معالجة تأشيرة العمرة من 5 إلى 10 أيام عمل من تاريخ تقديم الوثائق الكاملة.', 'visa', 1),
('هل تشمل باقة العمرة الطيران والفندق؟', 'نعم، جميع باقات العمرة لدينا تشمل تذاكر الطيران، الإقامة الفندقية، التنقل، والوجبات حسب البرنامج.', 'umrah', 2),
('كيف يمكنني حجز رحلة؟', 'يمكنك الحجز عبر الموقع الإلكتروني، الاتصال بالوكالة، أو زيارة أحد فروعنا.', 'general', 3),
('هل يمكن إلغاء الحجز؟', 'نعم، يمكن الإلغاء وفقاً لسياسة الإلغاء الخاصة بكل باقة. يرجى مراجعة الشروط عند الحجز.', 'general', 4),
('ما هي طرق الدفع المتاحة؟', 'نقبل الدفع النقدي، التحويل البنكي، وبطاقات الائتمان.', 'general', 5),
('هل تقدمون رحلات مخصصة؟', 'نعم، نصمم باقات مخصصة حسب احتياجاتكم واختيارات الوجهات والفنادق.', 'trips', 6);

INSERT INTO public.articles (title, slug, excerpt, content, cover, author, tags, published_at) VALUES
('دليلك الكامل للعمرة 2025', 'complete-umrah-guide-2025', 'كل ما تحتاج معرفته للاستعداد لرحلة العمرة هذا العام', 'العمرة رحلة روحية عظيمة تتطلب استعداداً جيداً. في هذا الدليل نستعرض أهم النصائح للاستعداد الأمثل...', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1600&q=80', 'فريق جنة الصحراء', '["عمرة","دليل","2025"]'::jsonb, now() - interval '2 days'),
('أفضل 10 وجهات سياحية لعام 2025', 'top-10-destinations-2025', 'اكتشف أجمل الوجهات السياحية التي يجب زيارتها هذا العام', 'من إسطنبول إلى دبي، ومن ماليزيا إلى المالديف، نستعرض أفضل الوجهات...', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80', 'فريق جنة الصحراء', '["سياحة","وجهات","2025"]'::jsonb, now() - interval '5 days'),
('نصائح لحجز تذاكر طيران بأفضل الأسعار', 'flight-booking-tips', 'كيف تحصل على أفضل الأسعار لتذاكر الطيران', 'الحصول على تذكرة طيران بسعر مناسب يتطلب معرفة ببعض الأسرار...', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80', 'فريق جنة الصحراء', '["طيران","نصائح"]'::jsonb, now() - interval '10 days'),
('كل ما تحتاج معرفته عن تأشيرة شنغن', 'schengen-visa-guide', 'دليل شامل لاستخراج تأشيرة شنغن من تونس', 'تأشيرة شنغن تفتح لك أبواب 27 دولة أوروبية. تعرف على شروط الحصول عليها...', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80', 'فريق جنة الصحراء', '["تأشيرة","شنغن","أوروبا"]'::jsonb, now() - interval '15 days');

INSERT INTO public.contact_info (key, label, value, icon, sort_order) VALUES
('address', 'العنوان', 'تونس، المروج 5، شارع 20 مارس', 'map-pin', 1),
('phone', 'الهاتف', '+216 71 234 567', 'phone', 2),
('mobile', 'الجوال', '+216 55 123 456', 'smartphone', 3),
('email', 'البريد', 'contact@janatsahara.tn', 'mail', 4),
('hours', 'ساعات العمل', 'الإثنين - السبت: 9:00 - 18:00', 'clock', 5),
('facebook', 'فيسبوك', 'https://facebook.com/janatsahara', 'facebook', 6),
('instagram', 'انستغرام', 'https://instagram.com/janatsahara', 'instagram', 7),
('whatsapp', 'واتساب', 'https://wa.me/21655123456', 'message-circle', 8);

INSERT INTO public.packages (title, slug, description, short_description, category, price, discount, currency, destination, country, duration, seats, cover, gallery, included, excluded, timeline, hotel, airline, featured, sort_order) VALUES
('باقة العمرة الاقتصادية', 'umrah-economy', 'باقة عمرة 15 يوم تشمل الطيران والإقامة والتنقل والوجبات', '15 يوم عمرة اقتصادية شاملة', 'umrah', 4500, 10, 'TND', 'مكة المكرمة والمدينة المنورة', 'المملكة العربية السعودية', '15 يوم', 30, 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1600&q=80',
'["https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200","https://images.unsplash.com/photo-1537444667181-1fdd4b58af26?w=1200"]'::jsonb,
'["تذاكر الطيران","الإقامة في فندق 4 نجوم","التنقل بحافلات مكيفة","3 وجبات يومياً","مرشد ديني","التأمين الصحي"]'::jsonb,
'["المصاريف الشخصية","الهدايا","المكالمات الدولية"]'::jsonb,
'[{"day":"اليوم 1","title":"السفر إلى المدينة المنورة","description":"وصول واستقبال ونقل إلى الفندق"},{"day":"اليوم 2-6","title":"إقامة في المدينة","description":"زيارات وصلوات في المسجد النبوي"},{"day":"اليوم 7","title":"الانتقال إلى مكة","description":"الإحرام والعمرة"},{"day":"اليوم 8-14","title":"إقامة في مكة","description":"عمرات وصلوات في الحرم"},{"day":"اليوم 15","title":"العودة","description":"طواف الوداع والسفر"}]'::jsonb,
'فندق دار التوحيد', 'الخطوط التونسية', true, 1),

('باقة العمرة الفاخرة', 'umrah-luxury', 'باقة عمرة 20 يوم في فنادق 5 نجوم قرب الحرمين', '20 يوم عمرة فاخرة قرب الحرمين', 'umrah', 7800, 5, 'TND', 'مكة المكرمة والمدينة المنورة', 'المملكة العربية السعودية', '20 يوم', 20, 'https://images.unsplash.com/photo-1537444667181-1fdd4b58af26?w=1600&q=80',
'["https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200","https://images.unsplash.com/photo-1591129841117-3adfd313e34f?w=1200"]'::jsonb,
'["تذاكر طيران درجة رجال أعمال","فندق 5 نجوم مطل على الحرم","نقل VIP","جميع الوجبات","مرشد خاص","تأشيرة وتأمين"]'::jsonb,
'["المصاريف الشخصية"]'::jsonb,
'[{"day":"اليوم 1-8","title":"المدينة المنورة","description":"إقامة فاخرة بجوار المسجد النبوي"},{"day":"اليوم 9-19","title":"مكة المكرمة","description":"إقامة بإطلالة على الكعبة"},{"day":"اليوم 20","title":"العودة","description":"طواف الوداع والسفر"}]'::jsonb,
'فندق كليمنس مكة الفاخر', 'الخطوط السعودية', true, 2),

('رحلة إسطنبول', 'istanbul-trip', '7 أيام لاكتشاف سحر إسطنبول التاريخية', '7 أيام في إسطنبول التاريخية', 'trip', 2300, 15, 'TND', 'إسطنبول', 'تركيا', '7 أيام', 40, 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80',
'["https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200","https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200"]'::jsonb,
'["الطيران","فندق 4 نجوم","إفطار يومي","جولات سياحية","مرشد باللغة العربية"]'::jsonb,
'["الغداء والعشاء","تذاكر الأماكن السياحية الاختيارية"]'::jsonb,
'[{"day":"اليوم 1","title":"الوصول","description":"استقبال ونقل للفندق"},{"day":"اليوم 2","title":"إسطنبول القديمة","description":"آيا صوفيا، السلطان أحمد، القصر العثماني"},{"day":"اليوم 3","title":"البوسفور","description":"رحلة بحرية وتسوق في البازار الكبير"},{"day":"اليوم 4-6","title":"جولات حرة","description":"استكشاف المدينة"},{"day":"اليوم 7","title":"العودة","description":"نقل للمطار"}]'::jsonb,
'فندق ديدمان إسطنبول', 'التركية', true, 3),

('رحلة دبي', 'dubai-trip', '5 أيام في مدينة الأحلام دبي', '5 أيام في دبي المذهلة', 'trip', 3100, 0, 'TND', 'دبي', 'الإمارات العربية المتحدة', '5 أيام', 25, 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80',
'["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200","https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200"]'::jsonb,
'["الطيران","فندق 5 نجوم","إفطار","جولة برج خليفة","سفاري صحراوي"]'::jsonb,
'["الغداء والعشاء","التسوق"]'::jsonb,
'[{"day":"اليوم 1","title":"الوصول","description":"استقبال والفندق"},{"day":"اليوم 2","title":"وسط المدينة","description":"برج خليفة ودبي مول"},{"day":"اليوم 3","title":"السفاري","description":"رحلة صحراوية وعشاء بدوي"},{"day":"اليوم 4","title":"دبي القديمة","description":"سوق الذهب والبهارات"},{"day":"اليوم 5","title":"العودة","description":"نقل للمطار"}]'::jsonb,
'فندق أتلانتس النخلة', 'طيران الإمارات', true, 4),

('تذكرة طيران تونس - جدة', 'flight-tunis-jeddah', 'تذاكر طيران مباشرة من تونس إلى جدة', 'رحلة مباشرة إلى جدة', 'flight', 1800, 0, 'TND', 'جدة', 'المملكة العربية السعودية', 'ذهاب وعودة', 100, 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80', '[]'::jsonb,
'["تذكرة ذهاب وعودة","حقيبة 30 كغ","وجبة على الطائرة"]'::jsonb,
'["التنقلات الأرضية"]'::jsonb,
'[]'::jsonb, NULL, 'الخطوط التونسية', false, 5),

('تذكرة طيران تونس - إسطنبول', 'flight-tunis-istanbul', 'رحلات يومية بأفضل الأسعار', 'رحلة مباشرة إلى إسطنبول', 'flight', 1200, 5, 'TND', 'إسطنبول', 'تركيا', 'ذهاب وعودة', 100, 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1600&q=80', '[]'::jsonb,
'["تذكرة ذهاب وعودة","حقيبة 20 كغ"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, 'التركية', false, 6),

('تأشيرة شنغن', 'visa-schengen', 'خدمة استخراج تأشيرة شنغن السياحية', 'تأشيرة شنغن سياحية', 'visa', 450, 0, 'TND', 'دول شنغن', 'الاتحاد الأوروبي', '15 يوم عمل', 50, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80', '[]'::jsonb,
'["تجهيز الملف","الحجوزات الوهمية","التأمين","المتابعة"]'::jsonb,
'["رسوم السفارة","الترجمة"]'::jsonb,
'[]'::jsonb, NULL, NULL, true, 7),

('تأشيرة تركيا', 'visa-turkey', 'استخراج تأشيرة تركيا الإلكترونية', 'تأشيرة تركيا سياحية', 'visa', 180, 0, 'TND', 'تركيا', 'تركيا', '3-5 أيام', 100, 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1600&q=80', '[]'::jsonb,
'["تجهيز الطلب","المتابعة","استلام التأشيرة"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL, false, 8);
