CREATE TABLE public.flight_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  from_airport TEXT NOT NULL,
  to_airport TEXT NOT NULL,
  trip_type TEXT NOT NULL DEFAULT 'one_way',
  departure_date DATE NOT NULL,
  return_date DATE,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  infants INTEGER NOT NULL DEFAULT 0,
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  notes TEXT,
  internal_notes TEXT,
  assigned_to TEXT,
  admin_reply TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT flight_requests_status_check CHECK (status IN ('new','contacted','waiting','quoted','confirmed','cancelled')),
  CONSTRAINT flight_requests_trip_type_check CHECK (trip_type IN ('one_way','round_trip')),
  CONSTRAINT flight_requests_cabin_check CHECK (cabin_class IN ('economy','premium_economy','business','first'))
);

GRANT SELECT, UPDATE, DELETE ON public.flight_requests TO authenticated;
GRANT ALL ON public.flight_requests TO service_role;

ALTER TABLE public.flight_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view flight requests"
ON public.flight_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update flight requests"
ON public.flight_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete flight requests"
ON public.flight_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX flight_requests_created_at_idx ON public.flight_requests (created_at DESC);
CREATE INDEX flight_requests_status_idx ON public.flight_requests (status);

CREATE TRIGGER update_flight_requests_updated_at
BEFORE UPDATE ON public.flight_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();