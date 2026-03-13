-- Add manual_revenue column to app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS manual_revenue NUMERIC DEFAULT NULL;
