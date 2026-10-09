-- Default package price, editable by the owner on the Commission page
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS package_price NUMERIC DEFAULT 3499;
UPDATE public.app_settings SET package_price = 3499 WHERE id = 1 AND package_price IS NULL;
