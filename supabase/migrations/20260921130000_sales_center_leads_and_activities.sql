-- Migration: 20260921130000_sales_center_leads_and_activities.sql
-- Description: Core tables for Jannat Sahara Lead Generation and Sales Center workflow

-- 1. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  customer_key TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  email TEXT,
  governorate TEXT,
  city TEXT,
  trip_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  trip_name TEXT,
  travelers_count INTEGER NOT NULL DEFAULT 1 CHECK (travelers_count >= 1),
  adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  infants INTEGER NOT NULL DEFAULT 0 CHECK (infants >= 0),
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_preference TEXT NOT NULL DEFAULT 'phone' CHECK (contact_preference IN ('phone', 'whatsapp', 'messenger')),
  preferred_contact_time TEXT NOT NULL DEFAULT 'anytime' CHECK (preferred_contact_time IN ('morning', 'afternoon', 'evening', 'anytime')),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'umrah_builder', 'meta_ads', 'instagram_organic', 'facebook', 'whatsapp', 'messenger', 'phone', 'branch', 'other')),
  source_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'offer_sent', 'follow_up', 'confirmed', 'lost')),
  loss_reason TEXT CHECK (loss_reason IS NULL OR loss_reason IN ('price', 'hotel', 'flight', 'dates', 'family_decision', 'comparing_agencies', 'not_ready', 'other')),
  loss_notes TEXT,
  intent TEXT NOT NULL DEFAULT 'medium' CHECK (intent IN ('high', 'medium', 'low')),
  intent_score_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  builder_snapshot JSONB,
  builder_step_reached TEXT,
  next_follow_up_date DATE,
  next_follow_up_time TEXT,
  follow_up_note TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  offer_amount NUMERIC(12, 3),
  offer_currency TEXT NOT NULL DEFAULT 'TND',
  offer_status TEXT CHECK (offer_status IS NULL OR offer_status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  offer_notes TEXT,
  offer_sent_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  converted_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create lead_activities table for chronological sales interactions
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'status_change', 'note', 'call', 'whatsapp', 'follow_up_scheduled', 'offer_sent', 'objection', 'converted', 'lost')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  author_id UUID,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for rapid searching, filtering and analytics
CREATE INDEX IF NOT EXISTS idx_leads_customer_key ON public.leads(customer_key);
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON public.leads(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_intent ON public.leads(intent);
CREATE INDEX IF NOT EXISTS idx_leads_trip_id ON public.leads(trip_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON public.leads(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id, created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies
-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
REVOKE ALL ON public.leads FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
REVOKE ALL ON public.lead_activities FROM anon;

-- Service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role full access on leads') THEN
    CREATE POLICY "Service role full access on leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_activities' AND policyname = 'Service role full access on lead_activities') THEN
    CREATE POLICY "Service role full access on lead_activities" ON public.lead_activities FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Authenticated Admin / Staff policies via is_admin(auth.uid())
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Admins manage leads') THEN
    CREATE POLICY "Admins manage leads" ON public.leads FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_activities' AND policyname = 'Admins manage lead activities') THEN
    CREATE POLICY "Admins manage lead activities" ON public.lead_activities FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 6. Trigger for updated_at maintenance
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();
