-- Supabase integration — keep fabricated demo content off the live site.
--
-- Migration 20260728105042 seeded the schema with placeholder content so the
-- application had something to render during development. Some of those rows
-- are structural defaults an agency genuinely wants (service categories,
-- "why choose us" reasons, settings keys, homepage blocks). Others are
-- invented business records that must never face a real visitor:
--
--   * testimonials  — four made-up reviewers with stock avatar images and
--                     invented quotes. Publishing fabricated customer reviews
--                     misrepresents the agency to real people.
--   * packages      — demo trips carrying invented prices. A visitor could
--                     book against a price the agency never set.
--
-- Nothing is deleted. The rows are taken out of public circulation using the
-- table's own visibility column, so the agency can review each one in Admin
-- and either replace the content or publish it deliberately.
--
-- Matching is deterministic: only rows still pointing at the seed's stock
-- image hosts are touched. A row the agency has already edited to use its own
-- imagery is left exactly as it is.

-- ---------------------------------------------------------------------------
-- Fabricated testimonials -> hidden from the public site.
-- ---------------------------------------------------------------------------
UPDATE public.testimonials
SET active = false
WHERE active = true
  AND avatar LIKE '%i.pravatar.cc%';

-- ---------------------------------------------------------------------------
-- Demo packages -> back to draft, so they leave the public catalogue and the
-- booking flow but stay editable in Admin.
-- ---------------------------------------------------------------------------
UPDATE public.packages
SET status = 'draft'::public.package_status
WHERE status = 'published'::public.package_status
  AND (
    coalesce(cover, '') LIKE '%images.unsplash.com%'
    OR coalesce(gallery::text, '') LIKE '%images.unsplash.com%'
  );

-- ---------------------------------------------------------------------------
-- Left deliberately untouched, and why:
--
--   services, features   real service categories with the slugs the public
--                        routes expect (/umrah, /trips, /flights, /visa).
--   site_settings        configuration defaults, not business records.
--   site_content         homepage block scaffolding, edited in Admin.
--   site_stats, faqs     plausible agency defaults; harmless if published and
--                        trivial to correct.
--   contact_info         placeholder phone/email/address — MUST be reviewed
--                        before launch, but blanking it would break the
--                        footer, the contact page and the branch panels.
--   gallery_items,
--   articles             stock imagery and placeholder editorial. Review
--                        before launch; not deactivated here because an empty
--                        gallery and empty blog are themselves a worse first
--                        impression than obviously-generic ones.
--   branches, hotels     real Tunisian office and real Makkah/Madinah hotel
--                        names; verify addresses and coordinates before launch.
-- ---------------------------------------------------------------------------
