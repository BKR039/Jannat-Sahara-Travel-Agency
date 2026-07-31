ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TND',
  ADD COLUMN IF NOT EXISTS communication_preference text,
  ADD COLUMN IF NOT EXISTS emergency_contact text;

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS child_price numeric,
  ADD COLUMN IF NOT EXISTS infant_price numeric;

CREATE TABLE IF NOT EXISTS public.booking_passengers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_type text NOT NULL DEFAULT 'adult',
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  full_name text NOT NULL,
  passport_number text,
  nationality text,
  gender text,
  date_of_birth date,
  passport_expiry date,
  phone text,
  email text,
  emergency_contact text,
  passport_path text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_passengers_booking_id_idx ON public.booking_passengers(booking_id);

GRANT INSERT ON public.booking_passengers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_passengers TO authenticated;
GRANT ALL ON public.booking_passengers TO service_role;

ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create passengers for a booking"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff can view passengers"
ON public.booking_passengers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update passengers"
ON public.booking_passengers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete passengers"
ON public.booking_passengers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_booking_passengers_updated_at
BEFORE UPDATE ON public.booking_passengers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();