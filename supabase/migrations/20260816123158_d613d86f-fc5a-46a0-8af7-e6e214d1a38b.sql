ALTER TABLE public.custom_package_requests
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS contact_preference text,
  ADD COLUMN IF NOT EXISTS room_type text;