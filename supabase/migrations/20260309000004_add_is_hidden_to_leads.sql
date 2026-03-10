-- Alter leads table to add is_hidden column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
