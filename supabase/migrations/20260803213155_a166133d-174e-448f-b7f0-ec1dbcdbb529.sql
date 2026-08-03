alter table public.packages add column if not exists title_fr text;
alter table public.packages add column if not exists short_description_fr text;
alter table public.packages add column if not exists description_fr text;
alter table public.packages add column if not exists destination_fr text;
alter table public.packages add column if not exists city_fr text;
alter table public.packages add column if not exists country_fr text;
alter table public.packages add column if not exists hotel_fr text;
alter table public.packages add column if not exists airline_fr text;
alter table public.packages add column if not exists transport_fr text;
alter table public.packages add column if not exists duration_fr text;
alter table public.packages add column if not exists meeting_point_fr text;
alter table public.packages add column if not exists seo_title_fr text;
alter table public.packages add column if not exists seo_description_fr text;
alter table public.packages add column if not exists seo_keywords_fr text;
alter table public.packages add column if not exists included_fr jsonb;
alter table public.packages add column if not exists excluded_fr jsonb;
alter table public.packages add column if not exists timeline_fr jsonb;
alter table public.packages add column if not exists required_documents_fr jsonb;

alter table public.articles add column if not exists title_fr text;
alter table public.articles add column if not exists excerpt_fr text;
alter table public.articles add column if not exists content_fr text;
alter table public.articles add column if not exists author_fr text;
alter table public.articles add column if not exists tags_fr jsonb;

alter table public.faqs add column if not exists question_fr text;
alter table public.faqs add column if not exists answer_fr text;
alter table public.faqs add column if not exists category_fr text;

alter table public.testimonials add column if not exists role_fr text;
alter table public.testimonials add column if not exists content_fr text;

alter table public.services add column if not exists title_fr text;
alter table public.services add column if not exists description_fr text;

alter table public.features add column if not exists title_fr text;
alter table public.features add column if not exists description_fr text;

alter table public.site_stats add column if not exists label_fr text;

alter table public.site_content add column if not exists title_fr text;
alter table public.site_content add column if not exists subtitle_fr text;
alter table public.site_content add column if not exists body_fr text;
alter table public.site_content add column if not exists cta_label_fr text;

alter table public.gallery_items add column if not exists title_fr text;
alter table public.gallery_items add column if not exists category_fr text;

alter table public.branches add column if not exists name_fr text;
alter table public.branches add column if not exists address_fr text;
alter table public.branches add column if not exists city_fr text;
alter table public.branches add column if not exists working_hours_fr text;

alter table public.contact_info add column if not exists label_fr text;