-- 1. Hotel catalogue (agency-managed, ready for external providers)
CREATE TABLE public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL CHECK (city IN ('makkah','madinah')),
  name text NOT NULL,
  name_fr text,
  name_en text,
  stars integer CHECK (stars BETWEEN 1 AND 5),
  description text,
  description_fr text,
  description_en text,
  location text,
  location_fr text,
  location_en text,
  area text,
  latitude numeric,
  longitude numeric,
  distance_to_haram integer,
  distance_to_masjid_nabawi integer,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'agency',
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hotels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotels TO authenticated;
GRANT ALL ON public.hotels TO service_role;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY hotels_public_read ON public.hotels
  FOR SELECT USING (active = true);
CREATE POLICY hotels_admin_all ON public.hotels
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER hotels_set_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_hotels_city_active ON public.hotels (city, active, sort_order);

-- 2. Custom Umrah package requests (builder submissions)
CREATE TABLE public.custom_package_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','offer_preparing','contacted','confirmed','cancelled')),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  locale text,
  departure_date date,
  return_date date,
  departure_airport text,
  return_airport text,
  airport_flexible boolean NOT NULL DEFAULT false,
  makkah_nights integer NOT NULL DEFAULT 0,
  makkah_hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  makkah_hotel_name text,
  makkah_area text,
  makkah_preference text,
  madinah_nights integer NOT NULL DEFAULT 0,
  madinah_hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  madinah_hotel_name text,
  madinah_area text,
  madinah_preference text,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  infants integer NOT NULL DEFAULT 0,
  notes text,
  internal_notes text,
  assigned_to text,
  proposed_hotels text,
  proposed_flights text,
  offer_amount numeric,
  offer_currency text NOT NULL DEFAULT 'TND',
  offer_notes text,
  offer_sent_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.custom_package_requests TO authenticated;
GRANT ALL ON public.custom_package_requests TO service_role;
ALTER TABLE public.custom_package_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_package_requests_admin_all ON public.custom_package_requests
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER custom_package_requests_set_updated_at BEFORE UPDATE ON public.custom_package_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_custom_package_requests_status ON public.custom_package_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_notify_new_custom_package_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (kind, title, body, entity, entity_id)
  VALUES (
    'custom_package',
    'New custom Umrah package request',
    COALESCE(NEW.customer_name, 'Guest') || ' — ' || NEW.reference,
    'custom_package_requests',
    NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER custom_package_requests_notify AFTER INSERT ON public.custom_package_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_custom_package_request();

-- 3. Demo hotel catalogue (no prices, no availability)
INSERT INTO public.hotels (city, name, name_fr, name_en, stars, area, description, description_fr, description_en, location, location_fr, location_en, distance_to_haram, distance_to_masjid_nabawi, images, amenities, sort_order) VALUES
('makkah','فندق أبراج البيت','Hôtel Abraj Al Bait','Abraj Al Bait Hotel',5,'haram_close','إقامة فاخرة على بعد خطوات من المسجد الحرام مع إطلالة مباشرة على الكعبة.','Séjour de luxe à quelques pas de la Grande Mosquée avec vue directe sur la Kaaba.','Luxury stay steps from the Grand Mosque with direct views of the Kaaba.','مقابل المسجد الحرام','Face à la Grande Mosquée','Facing the Grand Mosque',100,NULL,'["https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80"]','["wifi","breakfast","shuttle","family_rooms"]',1),
('makkah','فندق دار التوحيد إنتركونتيننتال','Dar Al Tawhid Intercontinental','Dar Al Tawhid Intercontinental',5,'haram_close','فندق راقٍ بمدخل مباشر إلى ساحات الحرم.','Hôtel raffiné avec accès direct aux esplanades du Haram.','Refined hotel with direct access to the Haram courtyards.','شارع إبراهيم الخليل','Rue Ibrahim Al Khalil','Ibrahim Al Khalil Street',180,NULL,'["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80"]','["wifi","breakfast","prayer_room"]',2),
('makkah','فندق سويس أوتيل المقام','Swissôtel Al Maqam','Swissotel Al Maqam',5,'central','غرف واسعة مناسبة للعائلات في المنطقة المركزية.','Chambres spacieuses idéales pour les familles en zone centrale.','Spacious family-friendly rooms in the central area.','المنطقة المركزية','Zone centrale','Central area',250,NULL,'["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80"]','["wifi","breakfast","family_rooms"]',3),
('makkah','فندق هيلتون مكة للمؤتمرات','Hilton Makkah Convention','Hilton Makkah Convention',5,'central','خدمات متكاملة ومطاعم متنوعة قرب الحرم.','Services complets et restaurants variés près du Haram.','Full services and varied dining close to the Haram.','جبل عمر','Jabal Omar','Jabal Omar',450,NULL,'["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80"]','["wifi","breakfast","gym","shuttle"]',4),
('makkah','فندق إيلاف المشاعر','Elaf Al Mashaer','Elaf Al Mashaer',4,'ibrahim_khalil','خيار متوازن بين السعر والقرب من الحرم.','Bon équilibre entre prix et proximité du Haram.','A balanced choice between price and proximity to the Haram.','شارع إبراهيم الخليل','Rue Ibrahim Al Khalil','Ibrahim Al Khalil Street',600,NULL,'["https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80"]','["wifi","breakfast","shuttle"]',5),
('makkah','فندق أجياد مكارم','Ajyad Makarem','Ajyad Makarem',4,'ajyad','إقامة عملية في منطقة أجياد مع نقل مستمر إلى الحرم.','Séjour pratique dans le quartier Ajyad avec navette continue.','Practical stay in the Ajyad district with continuous shuttle.','أجياد','Ajyad','Ajyad',900,NULL,'["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80"]','["wifi","shuttle"]',6),
('makkah','فندق النسيم الاقتصادي','Hôtel Al Naseem Économique','Al Naseem Economy Hotel',3,'ibrahim_khalil','خيار اقتصادي نظيف مع خدمة نقل إلى الحرم.','Option économique et propre avec navette vers le Haram.','Clean budget option with shuttle service to the Haram.','إبراهيم الخليل','Ibrahim Al Khalil','Ibrahim Al Khalil',1200,NULL,'["https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?w=1200&q=80"]','["wifi","shuttle"]',7),
('madinah','فندق دار الهجرة إنتركونتيننتال','Dar Al Hijra Intercontinental','Dar Al Hijra Intercontinental',5,'very_close','إقامة فاخرة على بعد خطوات من المسجد النبوي.','Séjour de luxe à quelques pas de la Mosquée du Prophète.','Luxury stay steps from the Prophet''s Mosque.','مقابل المسجد النبوي','Face à la Mosquée du Prophète','Facing the Prophet''s Mosque',NULL,120,'["https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&q=80"]','["wifi","breakfast","family_rooms"]',1),
('madinah','فندق أنوار المدينة موفنبيك','Anwar Al Madinah Mövenpick','Anwar Al Madinah Movenpick',5,'very_close','فندق عالمي بمدخل مباشر إلى ساحة المسجد النبوي.','Hôtel international avec accès direct à l''esplanade.','International hotel with direct access to the mosque plaza.','الساحة المركزية','Esplanade centrale','Central plaza',NULL,150,'["https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80"]','["wifi","breakfast","gym"]',2),
('madinah','فندق بداية المدينة','Hôtel Bidaya Madinah','Bidaya Madinah Hotel',4,'close','قريب من المسجد النبوي بأسعار متوازنة.','Proche de la Mosquée du Prophète à prix équilibré.','Close to the Prophet''s Mosque at a balanced price.','المنطقة المركزية','Zone centrale','Central area',NULL,350,'["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80"]','["wifi","breakfast"]',3),
('madinah','فندق المدينة كونكورد','Madinah Concorde','Madinah Concorde',4,'close','غرف عائلية مريحة على مسافة قصيرة سيراً.','Chambres familiales confortables à courte distance à pied.','Comfortable family rooms a short walk away.','قرب الساحة','Près de l''esplanade','Near the plaza',NULL,500,'["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80"]','["wifi","family_rooms","shuttle"]',4),
('madinah','فندق طيبة القيمة','Hôtel Taiba Valeur','Taiba Value Hotel',3,'value','أفضل قيمة مقابل السعر مع نقل منتظم.','Meilleur rapport qualité-prix avec navette régulière.','Best value for money with a regular shuttle.','طيبة','Taiba','Taiba',NULL,900,'["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80"]','["wifi","shuttle"]',5);