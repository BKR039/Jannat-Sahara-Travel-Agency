-- French translations for the catalogue (public site French UI must never show Arabic labels)
UPDATE public.packages SET title_fr='Voyage à Istanbul', short_description_fr='7 jours dans l''Istanbul historique', destination_fr='Istanbul', hotel_fr='Hôtel Dedeman Istanbul', airline_fr='Turkish Airlines' WHERE id='1d34dc05-fdf0-4260-baba-5587b1d685d3';
UPDATE public.packages SET title_fr='Voyage à Dubaï', short_description_fr='5 jours dans l''éblouissante Dubaï', destination_fr='Dubaï', hotel_fr='Hôtel Atlantis The Palm', airline_fr='Emirates' WHERE id='9e0c498d-a159-45ef-92d4-1021a2bd458e';
UPDATE public.packages SET title_fr='Billet d''avion Tunis - Djeddah', short_description_fr='Vol direct vers Djeddah', destination_fr='Djeddah', airline_fr='Tunisair' WHERE id='b69941f0-4718-4ac6-9633-6cc4ddd08708';
UPDATE public.packages SET title_fr='Billet d''avion Tunis - Istanbul', short_description_fr='Vol direct vers Istanbul', destination_fr='Istanbul', airline_fr='Turkish Airlines' WHERE id='7c548f19-e31d-407c-a403-ba050fdfd1d6';
UPDATE public.packages SET title_fr='Visa Schengen', short_description_fr='Visa Schengen touristique', destination_fr='Pays de l''espace Schengen' WHERE id='c096a5ae-378a-4533-8735-aa7992d5cf3c';
UPDATE public.packages SET title_fr='Visa Turquie', short_description_fr='Visa touristique pour la Turquie', destination_fr='Turquie' WHERE id='d699f970-c2f7-4fbc-a239-6e6f119d33e9';
UPDATE public.packages SET title_fr='Omra Prestige', short_description_fr='20 jours d''Omra prestige à proximité des Lieux saints', destination_fr='La Mecque et Médine', hotel_fr='Hôtel Clemence La Mecque', airline_fr='Saudia' WHERE id='6b5da2fc-c994-40fc-af71-a3c649ee7e33';
UPDATE public.packages SET title_fr='Omra Économique', short_description_fr='15 jours d''Omra économique tout compris', destination_fr='La Mecque et Médine', hotel_fr='Hôtel Dar Al Tawhid', airline_fr='Tunisair' WHERE id='9496f1c9-5593-4051-b670-f503b5202710';

UPDATE public.articles SET title_fr='Votre guide complet de l''Omra 2025', excerpt_fr='Tout ce qu''il faut savoir pour préparer votre Omra cette année', author_fr='Équipe Janat Sahara', content_fr=content, tags_fr='["Omra","Guide","2025"]'::jsonb WHERE id='7adb6f62-65c7-417b-bdc3-988317e87187';
UPDATE public.articles SET title_fr='Les 10 meilleures destinations pour 2025', excerpt_fr='Découvrez les plus belles destinations à visiter cette année', author_fr='Équipe Janat Sahara', content_fr=content, tags_fr='["Tourisme","Destinations","2025"]'::jsonb WHERE id='9392036d-ae62-4341-b795-b8597592b13d';
UPDATE public.articles SET title_fr='Conseils pour réserver vos billets d''avion au meilleur prix', excerpt_fr='Comment obtenir les meilleurs tarifs pour vos billets d''avion', author_fr='Équipe Janat Sahara', content_fr=content, tags_fr='["Vols","Conseils"]'::jsonb WHERE id='7fea2eda-0e2c-47aa-b6f8-4cf3b9afedc3';
UPDATE public.articles SET title_fr='Tout ce qu''il faut savoir sur le visa Schengen', excerpt_fr='Guide complet pour obtenir un visa Schengen depuis la Tunisie', author_fr='Équipe Janat Sahara', content_fr=content, tags_fr='["Visa","Schengen","Europe"]'::jsonb WHERE id='7153de53-d209-4dcb-a40c-92231aa5c87f';

UPDATE public.gallery_items SET category_fr = CASE category
  WHEN 'عمرة' THEN 'Omra'
  WHEN 'رحلات' THEN 'Voyages'
  WHEN 'طيران' THEN 'Vols'
  WHEN 'تأشيرات' THEN 'Visas'
  ELSE category END
WHERE category_fr IS NULL;