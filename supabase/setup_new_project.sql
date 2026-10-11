-- Full database setup for a NEW Supabase project. Paste into SQL Editor and Run once.
-- Makes this script safe to re-run: clears existing policies first (they are all recreated below).
DO $reset$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname = 'public'
              OR (schemaname = 'storage' AND tablename = 'objects' AND policyname IN ('Public Access','Authenticated Upload','Authenticated Update','Authenticated Delete','Public Select','Public Insert','Public Update','Public Delete'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$reset$;

SET check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_owner() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS 'SELECT EXISTS (SELECT 1 FROM public.workers WHERE user_id = auth.uid() AND is_owner = true)';

-- ===== 20260309000000_initial_schema.sql =====
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


-- ===== 20260309000001_add_role_to_workers.sql =====
-- Alter workers table to add role column
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Agent';


-- ===== 20260309000002_add_payment_status_to_leads.sql =====
-- Alter leads table to add payment_status
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Not Paid' CHECK (payment_status IN ('Fully Paid', 'Not Paid', 'Partial'));


-- ===== 20260309000003_add_down_payment_to_leads.sql =====
-- Alter leads table to add down_payment
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS down_payment DECIMAL DEFAULT 0;


-- ===== 20260309000004_add_is_hidden_to_leads.sql =====
-- Alter leads table to add is_hidden column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;


-- ===== 20260309000005_create_app_settings.sql =====
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
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Allow anyone to update (since it's a management tool for the owner)
CREATE POLICY "Allow update app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);


-- ===== 20260309000006_fix_storage_policies.sql =====
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create public access policies for the 'profiles' bucket
CREATE POLICY "Public Select" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'profiles');


-- ===== 20260309000007_add_auth_linking.sql =====
-- Add user_id to workers for Auth linking
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id);

-- Add is_owner flag to workers (or use a dedicated role)
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false;

-- Create a temporary owner profile if needed, or allow the first registered user to be owner
-- For this setup, we'll assume the owner is the one who sets up the app.

-- Update RLS for Leads to isolate data
DROP POLICY IF EXISTS "Enable all for anon" ON public.leads;

CREATE POLICY "Owners see all leads" 
ON public.leads FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.workers 
    WHERE workers.user_id = auth.uid() 
    AND workers.is_owner = true
  )
);

CREATE POLICY "Employees see own leads" 
ON public.leads FOR ALL 
USING (
  worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid())
)
WITH CHECK (
  worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid())
);

-- Update RLS for Workers
DROP POLICY IF EXISTS "Enable all for anon" ON public.workers;

CREATE POLICY "Public read active workers" 
ON public.workers FOR SELECT 
USING (active = true);

CREATE POLICY "Owners manage workers" 
ON public.workers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.workers 
    WHERE workers.user_id = auth.uid() 
    AND workers.is_owner = true
  )
);

CREATE POLICY "Employees update self" 
ON public.workers FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ===== 20260309000008_fix_leads_saving.sql =====
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


-- ===== 20260309000009_add_contact_email_to_workers.sql =====
-- Add contact_email to workers table
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS contact_email TEXT;


-- ===== 20260309000010_add_commission_rate_to_leads.sql =====
-- Add commission_rate to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL DEFAULT 20.0;


-- ===== 20260309000011_add_webdev_to_leads.sql =====
-- Add webdev_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS webdev_id UUID REFERENCES public.workers(id);


-- ===== 20260310000001_add_assigned_webdev_to_workers.sql =====
-- Add assigned_webdev_id to workers table to support automatic assignment
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS assigned_webdev_id UUID REFERENCES public.workers(id);


-- ===== 20260310000002_add_tip_to_leads.sql =====
-- Add tip column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tip NUMERIC DEFAULT 0;


-- ===== 20260311000000_add_is_audited_to_leads.sql =====
-- Add is_audited column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_audited TEXT DEFAULT 'Not Yet';


-- ===== 20260312000000_add_manual_revenue.sql =====
-- Add manual_revenue column to app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS manual_revenue NUMERIC DEFAULT NULL;


-- ===== 20260402000000_create_client_storage.sql =====
-- Create client_storage table
CREATE TABLE IF NOT EXISTS client_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    assigned_webdev_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    website_link TEXT,
    admin_link TEXT,
    admin_email TEXT,
    admin_password TEXT,
    supabase_email TEXT,
    supabase_password TEXT,
    database_password TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_storage ENABLE ROW LEVEL SECURITY;

-- Policies for client_storage
-- Employees can view their own client storage OR where they are the assigned webdev
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own client storage') THEN
        CREATE POLICY "Users can view their own client storage"
            ON client_storage FOR SELECT
            USING (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id) OR 
                auth.uid() IN (SELECT user_id FROM workers WHERE id = assigned_webdev_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own client storage') THEN
        CREATE POLICY "Users can insert their own client storage"
            ON client_storage FOR INSERT
            WITH CHECK (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own client storage') THEN
        CREATE POLICY "Users can update their own client storage"
            ON client_storage FOR UPDATE
            USING (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own client storage') THEN
        CREATE POLICY "Users can delete their own client storage"
            ON client_storage FOR DELETE
            USING (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id)
            );
    END IF;
END $$;


-- ===== 20260405000000_update_client_storage_rls.sql =====
-- Add policy to allow owners to manage all client storage records
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage all client storage') THEN
        CREATE POLICY "Owners can manage all client storage"
            ON client_storage FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM workers 
                    WHERE user_id = auth.uid() AND (is_owner = true OR role = 'Owner')
                )
            );
    END IF;
END $$;


-- ===== 20260410000000_add_package_price_to_app_settings.sql =====
-- Default package price, editable by the owner on the Commission page
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS package_price NUMERIC DEFAULT 3499;
UPDATE public.app_settings SET package_price = 3499 WHERE id = 1 AND package_price IS NULL;


-- ===== 20260411000000_create_expenses.sql =====
-- Business expenses (owner only). Requires public.is_owner() from fix_login.sql.
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage expenses" ON public.expenses;
CREATE POLICY "Owners manage expenses" ON public.expenses
    FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());


-- ===== 20260412000000_create_daily_audits.sql =====
-- Daily audit reports submitted by employees; reviewed by the owner in Master List > Audit.
-- Requires public.is_owner() from fix_login.sql.
CREATE TABLE IF NOT EXISTS public.daily_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    audit_date DATE NOT NULL,
    clients_added INTEGER NOT NULL DEFAULT 0,
    deals_closed INTEGER NOT NULL DEFAULT 0,
    total_sales NUMERIC NOT NULL DEFAULT 0,
    commission NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Reviewed', 'Needs Review')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (worker_id, audit_date)
);

ALTER TABLE public.daily_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage daily audits" ON public.daily_audits;
CREATE POLICY "Owners manage daily audits" ON public.daily_audits
    FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Employees read own daily audits" ON public.daily_audits;
CREATE POLICY "Employees read own daily audits" ON public.daily_audits
    FOR SELECT USING (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Employees submit own daily audits" ON public.daily_audits;
CREATE POLICY "Employees submit own daily audits" ON public.daily_audits
    FOR INSERT WITH CHECK (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Employees may resubmit their own report until the owner has reviewed it.
DROP POLICY IF EXISTS "Employees update own daily audits" ON public.daily_audits;
CREATE POLICY "Employees update own daily audits" ON public.daily_audits
    FOR UPDATE USING (
        worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()) AND status <> 'Reviewed'
    )
    WITH CHECK (
        worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid())
    );


-- ===== 20260413000000_create_audit_records.sql =====
-- Client records entered by employees in the Employee Portal > Daily Audit; listed for the owner in Master List > Audit.
-- Requires public.is_owner() from fix_login.sql.
CREATE TABLE IF NOT EXISTS public.audit_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    client_name TEXT NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage audit records" ON public.audit_records;
CREATE POLICY "Owners manage audit records" ON public.audit_records
    FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Employees read own audit records" ON public.audit_records;
CREATE POLICY "Employees read own audit records" ON public.audit_records
    FOR SELECT USING (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Employees add own audit records" ON public.audit_records;
CREATE POLICY "Employees add own audit records" ON public.audit_records
    FOR INSERT WITH CHECK (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Employees delete own audit records" ON public.audit_records;
CREATE POLICY "Employees delete own audit records" ON public.audit_records
    FOR DELETE USING (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));


DROP POLICY IF EXISTS "Owners manage workers" ON public.workers;
DROP POLICY IF EXISTS "Owners see all leads" ON public.leads;
CREATE POLICY "Owners manage workers" ON public.workers FOR ALL USING (public.is_owner());
CREATE POLICY "Owners see all leads" ON public.leads FOR ALL USING (public.is_owner());