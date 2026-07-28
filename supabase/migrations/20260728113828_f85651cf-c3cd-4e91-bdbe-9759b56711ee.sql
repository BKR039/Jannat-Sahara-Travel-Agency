
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  working_hours TEXT,
  google_maps_url TEXT,
  image TEXT,
  is_main_branch BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.branches TO anon, authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_public_read"
  ON public.branches
  FOR SELECT
  USING (is_active = true);

CREATE TRIGGER branches_set_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.branches (name, city, address, phone, email, latitude, longitude, working_hours, google_maps_url, is_main_branch, sort_order) VALUES
('الفرع الرئيسي - تونس', 'تونس', 'شارع الحبيب بورقيبة، تونس العاصمة 1000', '+216 71 123 456', 'tunis@janatsahara.tn', 36.8008, 10.1817, 'الإثنين - السبت: 08:30 - 18:00', 'https://www.google.com/maps/dir/?api=1&destination=36.8008,10.1817', true, 1),
('فرع صفاقس', 'صفاقس', 'شارع الجمهورية، صفاقس 3000', '+216 74 234 567', 'sfax@janatsahara.tn', 34.7406, 10.7603, 'الإثنين - الجمعة: 09:00 - 17:30', 'https://www.google.com/maps/dir/?api=1&destination=34.7406,10.7603', false, 2),
('فرع سوسة', 'سوسة', 'شارع الحبيب ثامر، سوسة 4000', '+216 73 345 678', 'sousse@janatsahara.tn', 35.8256, 10.6369, 'الإثنين - الجمعة: 09:00 - 17:30', 'https://www.google.com/maps/dir/?api=1&destination=35.8256,10.6369', false, 3);
