-- Phase 7.1 — connect custom Umrah requests to the CRM customer identity.
--
-- This CRM has no `customers` table: a customer is derived by grouping records
-- on a deterministic key built from the contact details the person gave. That
-- key is already stored on `customer_notes.customer_key`. Custom Umrah requests
-- had no such link, so a traveller who used the Umrah Builder but never booked
-- did not exist as a customer at all.
--
-- The column below makes the relationship explicit and indexed. It mirrors
-- `customerKey()` in src/lib/admin/customer-identity.ts exactly:
--
--   phone with >= 6 usable characters -> 'p:' || last 8 characters
--   otherwise a non-empty email       -> 'e:' || lower(trim(email))
--   otherwise                         -> 'x:' || the row's own id
--
-- No unique constraint: one customer legitimately submits several requests, and
-- a family may legitimately share one phone number. Uniqueness here would block
-- normal agency business, not protect it.

ALTER TABLE public.custom_package_requests
  ADD COLUMN IF NOT EXISTS customer_key text;

COMMENT ON COLUMN public.custom_package_requests.customer_key IS
  'Derived CRM customer identity (see src/lib/admin/customer-identity.ts). Written by the submission server function; backfilled once for historical rows.';

-- Lookup path for "every request belonging to this customer".
CREATE INDEX IF NOT EXISTS custom_package_requests_customer_key_idx
  ON public.custom_package_requests (customer_key);

-- Supports the same lookup on the other CRM sources (bookings already carry the
-- contact details the key is derived from; these indexes serve the admin
-- aggregation's ordering, not the key itself).
CREATE INDEX IF NOT EXISTS custom_package_requests_created_at_idx
  ON public.custom_package_requests (created_at DESC);

-- ---------------------------------------------------------------------------
-- One-time deterministic backfill of historical requests.
--
-- Exact normalized phone, else exact normalized email, else the row's own id.
-- Nothing is matched by name, by similarity, or by any heuristic: a request the
-- rules cannot resolve keeps an 'x:' key of its own and stays unlinked rather
-- than being merged into someone else's customer profile.
-- ---------------------------------------------------------------------------
UPDATE public.custom_package_requests
SET customer_key = CASE
  WHEN length(regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g')) >= 6
    THEN 'p:' || right(regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g'), 8)
  WHEN length(btrim(coalesce(email, ''))) > 0
    THEN 'e:' || lower(btrim(email))
  ELSE 'x:' || id::text
END
WHERE customer_key IS NULL;
