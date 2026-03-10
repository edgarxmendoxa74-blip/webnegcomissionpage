-- Alter leads table to add down_payment
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS down_payment DECIMAL DEFAULT 0;
