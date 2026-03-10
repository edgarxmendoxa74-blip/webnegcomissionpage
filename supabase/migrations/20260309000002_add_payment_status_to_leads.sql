-- Alter leads table to add payment_status
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Not Paid' CHECK (payment_status IN ('Fully Paid', 'Not Paid', 'Partial'));
