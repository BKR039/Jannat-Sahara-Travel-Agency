-- Migration: 20260918120000_site_sections.sql
-- Description: Centralized section visibility control for public website homepage and other pages.

CREATE TABLE IF NOT EXISTS public.site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  label_fr TEXT,
  label_en TEXT,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  page TEXT NOT NULL DEFAULT 'home',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_sections_page ON public.site_sections(page);
CREATE INDEX IF NOT EXISTS idx_site_sections_sort ON public.site_sections(sort_order);

-- Enable RLS
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;

-- 1. Public / Anon can read site_sections
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_sections' AND policyname = 'Public read site_sections') THEN
    CREATE POLICY "Public read site_sections" ON public.site_sections
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 2. Authenticated admins can update site_sections
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_sections' AND policyname = 'Admins can update site_sections') THEN
    CREATE POLICY "Admins can update site_sections" ON public.site_sections
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- 3. Authenticated admins can insert site_sections
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_sections' AND policyname = 'Admins can insert site_sections') THEN
    CREATE POLICY "Admins can insert site_sections" ON public.site_sections
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- 4. Service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_sections' AND policyname = 'Service role full access on site_sections') THEN
    CREATE POLICY "Service role full access on site_sections" ON public.site_sections
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Seed default homepage sections
INSERT INTO public.site_sections (section_key, label, label_fr, label_en, description, enabled, sort_order, page)
VALUES
  ('hero', 'الواجهة الرئيسية (Hero)', 'Bannière d''accueil (Hero)', 'Hero Banner', 'القسم الافتتاحي لأول ما يراه الزائر مع صورة العرض والزر الرئيسي', true, 10, 'home'),
  ('services', 'الخدمات والأنشطة (Services)', 'Services & Activités', 'Services & Activities', 'عرض الخدمات السياحية وخدمات السفر المقدمة من الوكالة', true, 20, 'home'),
  ('features', 'لماذا تختار جنة الصحراء (Why Choose Us)', 'Pourquoi nous choisir', 'Why Choose Us', 'مزايا وخصائص الوكالة ومصادر القوة التنافسية', true, 30, 'home'),
  ('branches', 'فروع ومكاتب الوكالة (Branches)', 'Nos Agences', 'Our Branches', 'مواقع مكاتب الوكالة في مختلف المدن التونسية وأرقام هواتفها', true, 40, 'home'),
  ('gallery', 'معرض الصور (Photo Gallery)', 'Galerie photos', 'Photo Gallery', 'مجموعة مختارة من صور الرحلات والمعالم السياحية للمسافرين', true, 50, 'home'),
  ('blog', 'أحدث المقالات والأخبار (Blog)', 'Derniers Articles', 'Latest Articles', 'آخر المستجدات والإرشادات السياحية ومقالات السفر المفيدة', true, 60, 'home'),
  ('testimonials', 'آراء وتقييمات المسافرين (Testimonials)', 'Témoignages voyageurs', 'Customer Reviews', 'تجارب المسافرين وآراء العملاء الموثوقة مع الوكالة', false, 70, 'home'),
  ('faq', 'الأسئلة الشائعة (FAQ)', 'Foire aux questions', 'Frequently Asked Questions', 'إجابات وافية على استفسارات المسافرين والأسئلة المتكررة', false, 80, 'home'),
  ('stats', 'الأرقام والإحصائيات (Statistics)', 'Statistiques & Chiffres clés', 'Statistics & Key Figures', 'إحصائيات إنجازات الوكالة وسنوات الخبرة وأعداد المسافرين', false, 90, 'home'),
  ('about', 'عن الوكالة (About Agency)', 'À propos de l''agence', 'About the Agency', 'نبذة تعريفية مختصرة عن تاريخ ورسالة وكالة جنة الصحراء', false, 100, 'home'),
  ('cta', 'دعوة الحجز الختامية (Closing CTA)', 'Appel à l''action final', 'Closing Call-to-Action', 'القسم التحفيزي النهائي قبل التذييل للتواصل والحجز المباشر', true, 110, 'home')
ON CONFLICT (section_key) DO NOTHING;
