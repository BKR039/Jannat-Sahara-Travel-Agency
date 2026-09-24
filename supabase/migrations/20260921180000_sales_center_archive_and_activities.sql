-- Migration: 20260921180000_sales_center_archive_and_activities.sql
-- Description: Adds archive lifecycle fields and operational activity types to Jannat Sahara Sales Center

-- 1. Add archive columns to public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- 2. Partial index for lightning-fast active vs archived lead querying
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_active ON public.leads(status, created_at DESC) WHERE archived_at IS NULL;

-- 3. Relax or expand lead_activities activity_type constraint
DO $$ BEGIN
  ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_activity_type_check;
  ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_activity_type_check CHECK (
    activity_type IN (
      'created', 'status_change', 'note', 'call', 'whatsapp',
      'follow_up_scheduled', 'offer_sent', 'objection', 'converted', 'lost',
      'lead_updated', 'lead_archived', 'lead_restored', 'lead_deleted',
      'lead_imported', 'lead_assigned'
    )
  );
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- table may not exist yet in early environments
END $$;
