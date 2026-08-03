-- 1. Rate limit ledger (server-only)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rate_limits_lookup_idx
  ON public.rate_limits (scope, identifier, created_at DESC);

-- 2. Close direct public writes: all these paths now run through trusted server code
DROP POLICY IF EXISTS bookings_public_insert ON public.bookings;
DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS passports_public_upload ON storage.objects;

REVOKE INSERT ON public.bookings FROM anon;
REVOKE INSERT ON public.contact_messages FROM anon;
REVOKE INSERT ON public.newsletter_subscribers FROM anon;

-- newsletter reads: align with the admin helper used elsewhere
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY newsletter_admin_read ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
GRANT SELECT ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

-- 3. Automatic audit trail for admin-managed tables
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id text;
  v_meta jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := (to_jsonb(OLD) ->> 'id');
    v_meta := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    v_entity_id := (to_jsonb(NEW) ->> 'id');
    IF TG_OP = 'UPDATE' THEN
      v_meta := jsonb_build_object('changed', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW)) AS e(key, value)
        WHERE to_jsonb(OLD) -> e.key IS DISTINCT FROM e.value
      ));
    ELSE
      v_meta := jsonb_build_object('new', to_jsonb(NEW));
    END IF;
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
    lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    coalesce(v_meta, '{}'::jsonb)
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event() FROM PUBLIC;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'packages','bookings','branches','site_settings','contact_info',
    'faqs','articles','gallery_items','testimonials','site_stats','services','user_roles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()', t);
  END LOOP;
END $$;

-- service_role must be able to write audit rows from server code
GRANT INSERT, SELECT ON public.audit_logs TO service_role;
