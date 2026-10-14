-- Payment breakdown (amount + date) and proof-of-payment image per deal
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS down_payment_date date,
    ADD COLUMN IF NOT EXISTS full_payment numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS full_payment_date date,
    ADD COLUMN IF NOT EXISTS paid_balance numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_balance_date date,
    ADD COLUMN IF NOT EXISTS proof_image_url text;
