-- Migration: 20260924100000_unified_archive_system.sql
-- Description: Adds unified lifecycle archiving fields and partial indices for Customers, Bookings, Custom Package Requests, Flight Requests, Contact Messages, and Packages.

-- 1. Customers (customer_profiles)
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_profiles_archived_at
  ON public.customer_profiles(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_profiles_active
  ON public.customer_profiles(created_at DESC) WHERE archived_at IS NULL;

-- 2. Bookings (bookings)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_archived_at
  ON public.bookings(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_active
  ON public.bookings(created_at DESC) WHERE archived_at IS NULL;

-- 3. Custom Package Requests (custom_package_requests)
ALTER TABLE public.custom_package_requests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_custom_requests_archived_at
  ON public.custom_package_requests(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_requests_active
  ON public.custom_package_requests(created_at DESC) WHERE archived_at IS NULL;

-- 4. Flight Requests (flight_requests)
ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_flight_requests_archived_at
  ON public.flight_requests(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flight_requests_active
  ON public.flight_requests(created_at DESC) WHERE archived_at IS NULL;

-- 5. Contact Messages (contact_messages)
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_messages_archived_at
  ON public.contact_messages(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_messages_active
  ON public.contact_messages(created_at DESC) WHERE archived_at IS NULL;

-- 6. Packages / Trips (packages)
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_packages_archived_at
  ON public.packages(archived_at) WHERE archived_at IS NOT NULL;
