ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS name_fr text;
UPDATE public.testimonials SET name_fr = m.fr FROM (VALUES
('أحمد بن علي','Ahmed Ben Ali'),
('فاطمة الزهراء','Fatma Ezzahra'),
('محمد التونسي','Mohamed Ettounsi'),
('سلمى بن قاسم','Salma Ben Kacem')
) AS m(ar, fr) WHERE public.testimonials.name = m.ar;