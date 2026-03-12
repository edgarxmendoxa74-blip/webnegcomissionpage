-- Complete Supabase Schema for WebNegosyo
-- Consolidated from migrations 20260309000000 to 20260311000000

-- Create workers table
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    gcash_number TEXT,
    qr_code_url TEXT,
    photo_url TEXT,
    commission_percentage DECIMAL DEFAULT 10.0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    role TEXT DEFAULT 'Agent',
    user_id UUID UNIQUE REFERENCES auth.users(id),
    is_owner BOOLEAN DEFAULT false,
    contact_email TEXT,
    assigned_webdev_id UUID REFERENCES public.workers(id)
);

-- Create payroll_periods table (to track bi-weekly cycles)
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    contact_info TEXT,
    ad_source TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'closed', 'failed')),
    deal_value DECIMAL DEFAULT 0,
    worker_id UUID REFERENCES public.workers(id),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    payment_status TEXT DEFAULT 'Not Paid',
    down_payment DECIMAL DEFAULT 0,
    is_hidden BOOLEAN DEFAULT false,
    month TEXT,
    commission_rate DECIMAL DEFAULT 20.0,
    webdev_id UUID REFERENCES public.workers(id),
    tip NUMERIC DEFAULT 0,
    is_audited TEXT DEFAULT 'Not Yet'
);

-- Add constraint for payment_status
ALTER TABLE public.leads ADD CONSTRAINT leads_payment_status_check 
CHECK (payment_status IN ('Fully Paid', 'Not Paid', 'Partial', 'Cancelled Project', 'Downpayment Only'));

-- Create commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    payroll_period_id UUID REFERENCES public.payroll_periods(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    logo_url TEXT,
    app_name TEXT DEFAULT 'WebNegosyo',
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT singleton_check CHECK (id = 1)
);

-- Initialize with default values
INSERT INTO public.app_settings (id, app_name)
VALUES (1, 'WebNegosyo')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read app_settings
CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Allow anyone to update app_settings (since it's a management tool for the owner)
CREATE POLICY "Allow update app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Update RLS for Leads to isolate data
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workers WHERE user_id = auth.uid() AND is_owner = true
  );
$$;

CREATE POLICY "Owners see all leads" 
ON public.leads FOR ALL 
USING (public.is_owner());

CREATE POLICY "Employees see own leads" 
ON public.leads FOR ALL 
USING (
  worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid())
)
WITH CHECK (
  worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid())
);

-- Update RLS for Workers
CREATE POLICY "Public read active workers" 
ON public.workers FOR SELECT 
USING (active = true);

CREATE POLICY "Owners manage workers" 
ON public.workers FOR ALL 
USING (public.is_owner());

CREATE POLICY "Employees update self" 
ON public.workers FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Storage bucket setup for profiles (Photos and QR codes)
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true) ON CONFLICT (id) DO NOTHING;

-- Create public access policies for the 'profiles' bucket
CREATE POLICY "Public Select" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'profiles');
