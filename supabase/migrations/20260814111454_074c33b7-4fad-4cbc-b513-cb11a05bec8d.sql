ALTER TABLE public.contact_info ADD COLUMN IF NOT EXISTS value_fr text;
UPDATE public.contact_info SET value_fr = 'Tunis, El Mourouj 5, Rue du 20 Mars' WHERE key = 'address';
UPDATE public.contact_info SET value_fr = 'Lundi - Samedi : 09h00 - 18h00' WHERE key = 'hours';