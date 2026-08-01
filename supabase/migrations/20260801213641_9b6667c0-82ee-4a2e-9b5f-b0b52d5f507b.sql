-- replace broken/missing images with authentic Janat Sahara photos
UPDATE public.site_content SET image = '/__l5e/assets-v1/4b1e9b32-ff68-4f61-82cc-d4bdf547ef4e/umrah-IMG_2044.jpg'
WHERE id = '181d9668-39f0-478f-9137-5e1e1b70c740';

UPDATE public.packages SET cover = '/__l5e/assets-v1/a3ad484e-f4e0-496f-84e8-0b50d0b19999/umrah-IMG_3300.jpg'
WHERE cover LIKE '%photo-1537444667181%';

UPDATE public.packages SET gallery = (
  SELECT jsonb_agg(CASE WHEN g.v LIKE '%photo-1537444667181%' OR g.v LIKE '%photo-1596422846543%'
    THEN '/__l5e/assets-v1/4093f4f0-fc0c-4f9c-a38c-7ad973194883/umrah-IMG_3540.jpg' ELSE g.v END)
  FROM jsonb_array_elements_text(packages.gallery) g(v)
)
WHERE gallery::text LIKE '%photo-1537444667181%' OR gallery::text LIKE '%photo-1596422846543%';

UPDATE public.gallery_items SET image = '/__l5e/assets-v1/5fbf6690-098a-482e-bfba-5f202e641a33/umrah-IMG_1960.jpg'
WHERE image LIKE '%photo-1537444667181%';

UPDATE public.gallery_items SET image = '/__l5e/assets-v1/9980e918-4ba8-4cdd-aa03-c7fcd7bfc126/umrah-IMG_1536.jpg'
WHERE image LIKE '%photo-1596422846543%';