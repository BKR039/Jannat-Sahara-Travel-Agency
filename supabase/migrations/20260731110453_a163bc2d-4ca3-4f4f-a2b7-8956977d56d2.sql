DROP POLICY IF EXISTS "Anyone can create passengers for a booking" ON public.booking_passengers;
REVOKE INSERT ON public.booking_passengers FROM anon;
CREATE POLICY "Staff can create passengers"
ON public.booking_passengers FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));