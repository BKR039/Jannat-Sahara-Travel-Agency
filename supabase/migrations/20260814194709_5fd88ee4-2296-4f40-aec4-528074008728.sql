DO $$
DECLARE r RECORD; en_name text;
BEGIN
  FOR r IN
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name LIKE '%\_fr'
  LOOP
    en_name := left(r.column_name, length(r.column_name)-3) || '_en';
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.table_name AND column_name=en_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', r.table_name, en_name, r.data_type);
    END IF;
  END LOOP;
END $$;