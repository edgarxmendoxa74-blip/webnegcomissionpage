-- Add is_audited column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_audited TEXT DEFAULT 'Not Yet';
