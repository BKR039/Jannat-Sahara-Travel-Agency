-- Correct the image transform URLs written in the previous phase.
--
-- Those URLs carried `?width=<n>&quality=<q>` on the assumption that width
-- alone performs a proportional resize, the way the old Unsplash `?w=` did.
-- It does not: Supabase's transform keeps the source height and crops the
-- width, so `madinah-nabawi-sunset.jpg?width=1920` returned 1920x4000 — a
-- narrow vertical slice of a 6000x4000 photograph. On the page that read as a
-- heavily zoomed crop: the hero showed one minaret instead of the mosque.
--
-- `resize=contain` is the parameter that scales proportionally. Verified per
-- shape before applying: landscape 1.50 -> 1200x800, wide 1.68 -> 1200x715,
-- portrait 0.56 -> 1200x2133, 0.75 -> 1200x1600. No image identity changes
-- here — same files, same assignments, correct geometry.

UPDATE public.site_content
   SET image = image || '&resize=contain'
 WHERE image LIKE '%/render/image/public/media/%'
   AND image NOT LIKE '%resize=%';

UPDATE public.packages
   SET cover = cover || '&resize=contain'
 WHERE cover LIKE '%/render/image/public/media/%'
   AND cover NOT LIKE '%resize=%';

UPDATE public.gallery_items
   SET image = image || '&resize=contain'
 WHERE image LIKE '%/render/image/public/media/%'
   AND image NOT LIKE '%resize=%';

UPDATE public.articles
   SET cover = cover || '&resize=contain'
 WHERE cover LIKE '%/render/image/public/media/%'
   AND cover NOT LIKE '%resize=%';
