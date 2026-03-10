-- Alter workers table to add role column
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Agent';
