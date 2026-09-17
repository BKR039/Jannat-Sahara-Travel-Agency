-- Umrah programme pricing.
--
-- The seven programmes were published with price 0 because no figure had been
-- supplied, and the UI hid the price rather than advertise a free trip. The
-- agency has now given a default of 4500 TND per person, so it is written to
-- every programme that still carries the placeholder.
--
-- Guarded on 0: a programme the agency has since priced differently keeps its
-- own figure, and re-running this never overwrites a real price. Nothing else
-- is added — no discount, no "was/now", no per-hotel or per-airline breakdown.
UPDATE public.packages
   SET price = 4500, currency = 'TND'
 WHERE category = 'umrah'
   AND slug LIKE 'umrah-%'
   AND price = 0;
