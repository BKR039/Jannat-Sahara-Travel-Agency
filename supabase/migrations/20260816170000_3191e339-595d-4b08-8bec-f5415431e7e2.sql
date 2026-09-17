-- Umrah Builder fix U-02 — remove stock photography from the hotel catalogue.
--
-- Migration 20260816122052 seeded a demo catalogue whose `images` arrays point
-- at Unsplash stock photos. Those pictures are not of the hotels they are
-- attached to, so presenting them as agency catalogue data misrepresents the
-- product. The Builder no longer renders hotel images at all, but leaving the
-- URLs in the table means any future surface would resurrect them.
--
-- This is deliberately surgical:
--   * hotel rows are NOT deleted — the catalogue keeps every entry
--   * only image entries pointing at images.unsplash.com are dropped
--   * any real image the agency has since uploaded is preserved
--   * no replacement image is invented; hotels simply have no image
--
-- Note for the agency: the seeded rows also carry developer-written
-- descriptions. Nothing renders them today, so they are left untouched rather
-- than destroyed here — they should be reviewed and rewritten (or cleared)
-- once hotel management exists in the admin.

UPDATE public.hotels AS h
SET images = COALESCE(
  (
    SELECT jsonb_agg(img)
    FROM jsonb_array_elements_text(h.images) AS img
    WHERE img NOT LIKE '%images.unsplash.com%'
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof(h.images) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(h.images) AS img
    WHERE img LIKE '%images.unsplash.com%'
  );
