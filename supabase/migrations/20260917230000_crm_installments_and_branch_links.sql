-- Migration: 20260917230000_crm_installments_and_branch_links.sql
-- Description: Adds customer_profiles, installments, and branch relationships for bookings & requests.

-- 1. Create customer_profiles table for persistent CRM metadata
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  customer_key TEXT PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'customer', 'vip', 'inactive', 'cancelled')),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create installments table for payment schedule and tracking
CREATE TABLE IF NOT EXISTS public.installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.custom_package_requests(id) ON DELETE SET NULL,
  installment_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  amount NUMERIC(12, 3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TND',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add branch_id to bookings and custom_package_requests for branch analytics
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.custom_package_requests ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 4. Indexes for fast operational lookups
CREATE INDEX IF NOT EXISTS idx_installments_customer_key ON public.installments(customer_key);
CREATE INDEX IF NOT EXISTS idx_installments_booking_id ON public.installments(booking_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON public.installments(due_date);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_status ON public.customer_profiles(status);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id ON public.bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_branch_id ON public.custom_package_requests(branch_id);

-- 5. Row Level Security
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_profiles' AND policyname = 'Service role full access on customer_profiles') THEN
    CREATE POLICY "Service role full access on customer_profiles" ON public.customer_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'installments' AND policyname = 'Service role full access on installments') THEN
    CREATE POLICY "Service role full access on installments" ON public.installments FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_profiles' AND policyname = 'Authenticated users can manage customer_profiles') THEN
    CREATE POLICY "Authenticated users can manage customer_profiles" ON public.customer_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'installments' AND policyname = 'Authenticated users can manage installments') THEN
    CREATE POLICY "Authenticated users can manage installments" ON public.installments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
