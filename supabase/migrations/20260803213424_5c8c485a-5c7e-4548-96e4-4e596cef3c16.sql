
UPDATE services SET title_fr='Forfaits Omra', description_fr='Des forfaits complets pour accomplir l''Omra en toute sérénité' WHERE slug='umrah';
UPDATE services SET title_fr='Voyages organisés', description_fr='Des voyages vers les plus belles destinations du monde' WHERE slug='trips';
UPDATE services SET title_fr='Billets d''avion', description_fr='Les meilleurs tarifs pour vos vols internationaux et domestiques' WHERE slug='flights';
UPDATE services SET title_fr='Visas', description_fr='Services d''obtention de visa pour toutes les destinations' WHERE slug='visa';

UPDATE features SET title_fr='Plus de 15 ans d''expérience', description_fr='Une longue expérience dans l''organisation de voyages et de forfaits Omra' WHERE id='1171fcf0-8a0f-4b5c-be34-2309178f800b';
UPDATE features SET title_fr='Tarifs compétitifs', description_fr='Les meilleurs prix avec une qualité de service garantie' WHERE id='8a31a77f-3f3c-4f52-92e4-eb553f97c8f5';
UPDATE features SET title_fr='Assistance 24h/24', description_fr='Une équipe disponible 24 heures sur 24 à votre service' WHERE id='14f9d5db-3608-4afb-aa89-d321000b8174';
UPDATE features SET title_fr='Agence agréée', description_fr='Agence licenciée par le Ministère du Tourisme tunisien' WHERE id='8e52c753-d536-43ec-9ea8-c31f42585205';
UPDATE features SET title_fr='Hôtels de luxe', description_fr='Partenariats avec les meilleurs hôtels proches des Lieux Saints' WHERE id='b72d6c0a-5a5a-4241-bc4d-ae7bf4871404';
UPDATE features SET title_fr='Voyages sur mesure', description_fr='Des forfaits conçus selon vos besoins' WHERE id='05f9e410-a683-4643-ac57-7c6d785afc0a';

UPDATE site_stats SET label_fr='Clients satisfaits' WHERE id='041ea74d-3c29-4008-a43a-629095db1cbe';
UPDATE site_stats SET label_fr='Voyages organisés' WHERE id='e8240f3f-2577-4fbc-a7a6-a60a242800f4';
UPDATE site_stats SET label_fr='Destinations' WHERE id='fe896658-6228-4bcb-b67d-7a67b20a3307';
UPDATE site_stats SET label_fr='Années d''expérience' WHERE id='0d117ba2-223c-4515-8597-245b9e66f3f0';

UPDATE faqs SET question_fr='Quel est le délai de traitement du visa Omra ?', answer_fr='Le traitement du visa Omra prend généralement de 5 à 10 jours ouvrables à compter du dépôt du dossier complet.' WHERE id='d0be0e38-28ee-4445-be4e-72e27be04f31';
UPDATE faqs SET question_fr='Le forfait Omra comprend-il le vol et l''hôtel ?', answer_fr='Oui, tous nos forfaits Omra incluent les billets d''avion, l''hébergement hôtelier, les transferts et les repas selon le programme.' WHERE id='37ff77ac-fc6c-46f3-9060-2714e2384aba';
UPDATE faqs SET question_fr='Comment réserver un voyage ?', answer_fr='Vous pouvez réserver via notre site web, par téléphone ou en vous rendant dans l''une de nos agences.' WHERE id='59c613b6-c0bb-4f8e-bbe4-92a9792bc204';
UPDATE faqs SET question_fr='Puis-je annuler ma réservation ?', answer_fr='Oui, l''annulation est possible selon la politique d''annulation propre à chaque forfait. Veuillez consulter les conditions lors de la réservation.' WHERE id='09ac1b8b-1d02-4bd2-8a13-aaa43f22fe4f';
UPDATE faqs SET question_fr='Quels sont les moyens de paiement acceptés ?', answer_fr='Nous acceptons les paiements en espèces, par virement bancaire et par carte bancaire.' WHERE id='0eb9b3c8-b64b-41d8-aa12-8d5494148895';
UPDATE faqs SET question_fr='Proposez-vous des voyages sur mesure ?', answer_fr='Oui, nous concevons des forfaits personnalisés selon vos besoins, vos destinations et vos hôtels préférés.' WHERE id='28d4a0ef-65b2-47a4-8dea-8d22023c0ef1';

UPDATE testimonials SET role_fr='Pèlerin Omra 2024', content_fr='Une expérience formidable avec Janat Sahara : chaque détail était pensé et l''hôtel se trouvait tout près de la Mosquée sacrée. Je les recommande vivement.' WHERE id='e7d45922-af1e-4629-af47-17b0d4aeabdf';
UPDATE testimonials SET role_fr='Voyage à Istanbul', content_fr='Le voyage à Istanbul était un rêve : un programme riche et une équipe très professionnelle. Nous réserverons de nouveau avec eux très bientôt.' WHERE id='78e76444-175b-4f2a-ab1d-51fe9e67f820';
UPDATE testimonials SET role_fr='Pèlerin Omra 2023', content_fr='Un service haut de gamme du début à la fin, avec des prix très raisonnables au regard de la qualité offerte.' WHERE id='adc320e9-496d-4d5d-ac13-01c35f08c1d4';
UPDATE testimonials SET role_fr='Voyage en Malaisie', content_fr='Tout était parfait, du visa aux hôtels en passant par les excursions. Merci du fond du cœur.' WHERE id='f2b1e496-c06a-46f3-987c-c390f50c305c';

UPDATE branches SET name_fr='Agence principale — Tunis', city_fr='Tunis', address_fr='Avenue Habib Bourguiba, Tunis 1000', working_hours_fr='Lundi - Samedi : 08h30 - 18h00' WHERE id='96413bbb-1ca1-4186-b995-e71053be140b';
UPDATE branches SET name_fr='Agence de Sfax', city_fr='Sfax', address_fr='Avenue de la République, Sfax 3000', working_hours_fr='Lundi - Vendredi : 09h00 - 17h30' WHERE id='71fd92b2-34f7-4ba3-a2be-5753cbcee9ce';
UPDATE branches SET name_fr='Agence de Sousse', city_fr='Sousse', address_fr='Avenue Habib Thameur, Sousse 4000', working_hours_fr='Lundi - Vendredi : 09h00 - 17h30' WHERE id='efb6e780-0868-48ba-b91e-a781a1fb433d';

UPDATE contact_info SET label_fr='Adresse' WHERE key='address';
UPDATE contact_info SET label_fr='Téléphone' WHERE key='phone';
UPDATE contact_info SET label_fr='Mobile' WHERE key='mobile';
UPDATE contact_info SET label_fr='E-mail' WHERE key='email';
UPDATE contact_info SET label_fr='Horaires d''ouverture' WHERE key='hours';
UPDATE contact_info SET label_fr='Facebook' WHERE key='facebook';
UPDATE contact_info SET label_fr='Instagram' WHERE key='instagram';
UPDATE contact_info SET label_fr='WhatsApp' WHERE key='whatsapp';

UPDATE site_content SET title_fr='Votre voyage spirituel commence ici', subtitle_fr='Agence de voyages spécialisée dans l''Omra et les voyages organisés', body_fr='Découvrez des forfaits d''exception pour l''Omra et le tourisme avec des experts du voyage', cta_label_fr='Réserver maintenant' WHERE key='hero';
UPDATE site_content SET title_fr='Prêt à commencer votre voyage ?', subtitle_fr='Contactez notre équipe : nous vous aiderons à choisir le forfait qui vous convient', body_fr='', cta_label_fr='Contactez-nous' WHERE key='cta';
UPDATE site_content SET title_fr='À propos de nous', subtitle_fr='Une agence de voyages de référence en Tunisie', body_fr='Janat Sahara Travel est une agence tunisienne spécialisée depuis des années dans l''organisation de voyages Omra, du tourisme religieux et des séjours de loisirs. Nous proposons des services complets incluant les réservations, les visas et les billets d''avion, avec une équipe d''experts dévoués pour vous garantir un voyage inoubliable.', cta_label_fr='' WHERE key='about';
