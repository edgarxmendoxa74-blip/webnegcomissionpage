-- Add contact_email to workers table
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS contact_email TEXT;
