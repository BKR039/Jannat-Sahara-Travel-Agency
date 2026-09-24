-- Migration: Add arrival_airport, departure_airport, flight_route, and notes to packages table for Umrah season
ALTER TABLE public.packages 
  ADD COLUMN IF NOT EXISTS arrival_airport text,
  ADD COLUMN IF NOT EXISTS departure_airport text,
  ADD COLUMN IF NOT EXISTS flight_route text,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.packages.arrival_airport IS 'Arrival airport in Saudi Arabia (e.g. Jeddah or Madinah)';
COMMENT ON COLUMN public.packages.departure_airport IS 'Departure airport from Saudi Arabia (e.g. Madinah or Jeddah)';
COMMENT ON COLUMN public.packages.flight_route IS 'Displayed route summary (e.g. جدة / المدينة or المدينة / جدة)';
COMMENT ON COLUMN public.packages.notes IS 'Season trip notes (e.g. عطلة نصف الثلاثي الأول, عطلة الشتاء, شعبان, النصف الثاني من رمضان, شوال)';
