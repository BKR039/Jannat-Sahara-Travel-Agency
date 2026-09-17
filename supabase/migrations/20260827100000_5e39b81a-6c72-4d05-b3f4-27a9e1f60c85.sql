-- Retire the Visa service from the public website.
--
-- The homepage services grid links each row to `/{slug}`, so this row pointed
-- at /visa, which is no longer a public route. Deactivated rather than deleted:
-- the row stays editable under Settings → Services and reappears the moment the
-- agency re-activates it. The two visa packages keep their draft status and are
-- untouched, as is anything in Admin.
UPDATE public.services
   SET active = false
 WHERE id = '5f4c6034-816c-4879-a57a-ac5b23a48259';
