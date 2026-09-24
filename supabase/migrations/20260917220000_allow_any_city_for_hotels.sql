-- Allow hotels in any city (Makkah, Madinah, Jeddah, Riyadh, Istanbul, Tunis, Sousse, etc.)
-- Removes the restrictive two-value check constraint while maintaining non-empty constraint.

ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_city_check;

ALTER TABLE public.hotels ADD CONSTRAINT hotels_city_non_empty CHECK (length(trim(city)) > 0);
