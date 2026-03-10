-- Fix payment_status check constraint and add month column
DO $$ 
BEGIN 
    -- Drop the existing check constraint on payment_status if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'leads' 
        AND constraint_type = 'CHECK'
        AND constraint_name = 'leads_payment_status_check'
    ) THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_payment_status_check;
    END IF;
END $$;

-- Add new check constraint with all options
ALTER TABLE public.leads ADD CONSTRAINT leads_payment_status_check 
CHECK (payment_status IN ('Fully Paid', 'Not Paid', 'Partial', 'Cancelled Project', 'Downpayment Only'));

-- Add month column if it doesn't exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS month TEXT;

-- Update existing leads to have a month based on created_at if null
UPDATE public.leads 
SET month = to_char(created_at, 'Month')
WHERE month IS NULL;
