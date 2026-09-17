-- Real agency photography for the images the site was missing or filling with
-- stock. Every URL below points at a photo the agency supplied in src/img,
-- uploaded once to the canonical public `media` bucket.
--
-- The `?width=&quality=` suffix is Supabase's image transform, used exactly the
-- way the previous Unsplash URLs used `?w=&q=`: one stored original, resized at
-- the CDN. Width only, so the aspect ratio is never distorted and CSS
-- object-cover keeps framing each context. `deleteMediaByUrl` already splits on
-- "?", so these stay manageable from the admin media picker.
--
-- Only assignments whose SUBJECT matches the content are made here. Anything
-- the agency has no photo of (its offices, its team, Istanbul, Dubai, Paris,
-- Malaysia, aircraft cabins, visas, individual hotels) is deliberately left as
-- it is rather than filled with an unrelated image.

-- ------------------------------------------------------------ site content --
-- hero:       "رحلتك الروحية تبدأ من هنا" — Al-Masjid an-Nabawi at sunset.
-- umrah_hero: the Kaaba at Masjid al-Haram, the Umrah destination itself.
-- cta:        "جاهز لبداية رحلتك؟" — pilgrims in ihram performing tawaf.
-- `about` keeps its current image: the agency supplied no photo of itself.
-- `trips_hero` / `visa_hero` stay NULL for the same reason.

UPDATE public.site_content SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/madinah-nabawi-sunset.jpg?width=1920&quality=75'  WHERE key = 'hero';
UPDATE public.site_content SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-wide.jpg?width=1920&quality=75'      WHERE key = 'umrah_hero';
UPDATE public.site_content SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-pilgrims.jpg?width=1920&quality=75'  WHERE key = 'cta';

-- -------------------------------------------------- Umrah programme covers --
-- Each crop was rendered at the card's 16:10 ratio and inspected before being
-- assigned, so no subject is lost to the centre crop.

UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-lowangle.jpg?width=1200&quality=75'      WHERE slug = 'umrah-28-septembre';
UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/madinah-nabawi-green-dome.jpg?width=1200&quality=75'  WHERE slug = 'umrah-15-novembre';
UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-haram-night.jpg?width=1200&quality=75'         WHERE slug = 'umrah-20-decembre';
UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/madinah-nabawi-interior.jpg?width=1200&quality=75'    WHERE slug = 'umrah-13-janvier';
UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-clocktower.jpg?width=1200&quality=75'    WHERE slug = 'umrah-23-fevrier';
UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-door-crowd.jpg?width=1200&quality=75'    WHERE slug = 'umrah-26-fevrier';
UPDATE public.packages SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-door.jpg?width=1200&quality=75'          WHERE slug = 'umrah-10-mars';

-- ---------------------------------------------------------------- gallery --
-- Two rows pointed at "/__l5e/assets-v1/..." paths that return HTTP 404 — dead
-- links left behind by an earlier hosting setup.

-- Broken. The Prophet's Mosque: its domes and minarets.
UPDATE public.gallery_items
   SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/madinah-domes-minarets.jpg?width=1200&quality=75'
 WHERE title = 'المسجد النبوي';

-- Stock. The Safa–Marwa gallery inside al-Masjid al-Haram; the verse inscribed
-- along its arch is the one the photo shows.
UPDATE public.gallery_items
   SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-masaa-safa-marwa.jpg?width=1200&quality=75'
 WHERE title = 'الحرم المكي';

-- Stock. Al-Masjid an-Nabawi, Madinah.
UPDATE public.gallery_items
   SET image = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/madinah-nabawi-green-dome.jpg?width=1200&quality=75'
 WHERE title = 'المدينة المنورة';

-- Broken, and the agency has no photograph of Malaysia. Hidden rather than
-- deleted (the row is legitimate content) and rather than shown broken. It
-- reappears the moment an image is set from admin.
UPDATE public.gallery_items SET active = false WHERE title = 'ماليزيا';

-- ---------------------------------------------------------------- articles --
-- Only the Umrah guide has a subject the agency's photos actually cover; the
-- destinations / flights / visa articles keep their current covers.
UPDATE public.articles
   SET cover = 'https://tvvjenkqjexqtyztdhab.supabase.co/storage/v1/render/image/public/media/agency/makkah-kaaba-pilgrims.jpg?width=1600&quality=75'
 WHERE slug = 'complete-umrah-guide-2025';

-- The `about` image was an Unsplash URL that now returns HTTP 404 — a broken
-- image on a live page, not a safe placeholder. The agency supplied no photo of
-- itself, its team or its offices, and a mosque photograph would not be a
-- picture of the agency, so the field is cleared: the section falls back to its
-- neutral no-image state until a real photo is uploaded from admin.
UPDATE public.site_content SET image = NULL WHERE key = 'about';

-- The two densest covers (a starfield over the Haram, gold calligraphy on the
-- Kaaba door) carry far more detail than the rest, so they are served a little
-- smaller and at lower quality to keep the listing page's payload sane. With
-- the responsive srcSet a card now fetches the 400w variant of these anyway;
-- this caps what the detail page pulls.
UPDATE public.packages
   SET cover = replace(cover, '?width=1200&quality=75', '?width=1000&quality=62')
 WHERE slug IN ('umrah-20-decembre', 'umrah-10-mars');
