ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_amount numeric;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unread',
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS accommodation jsonb;

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key text NOT NULL,
  note text NOT NULL,
  author_id uuid,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customer notes"
ON public.customer_notes FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE INDEX IF NOT EXISTS customer_notes_key_idx ON public.customer_notes (customer_key);

CREATE TRIGGER trg_customer_notes_updated
BEFORE UPDATE ON public.customer_notes
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();