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
    updated_at TIMESTAMPTZ DEFAULT now()
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
    updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Basic Public RLS Policies (Allow all for now, as user requested a management site)
-- In a real prod environment, we would restrict this to authenticated admins.
CREATE POLICY "Enable all for anon" ON public.workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.commissions FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket setup for profiles (Photos and QR codes)
-- Note: Most Supabase setups require manual bucket creation or via API.
-- This script provides the RLS for the bucket once created.
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'profiles');
