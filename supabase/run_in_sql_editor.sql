-- One-shot script for the Supabase SQL Editor. Safe to run more than once.
-- The function body uses single quotes instead of $$ so nothing in the copy/paste can break it.

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS 'SELECT EXISTS (SELECT 1 FROM public.workers WHERE user_id = auth.uid() AND is_owner = true)';

DROP POLICY IF EXISTS "Owners manage workers" ON public.workers;
DROP POLICY IF EXISTS "Owners see all leads" ON public.leads;
CREATE POLICY "Owners manage workers" ON public.workers FOR ALL USING (public.is_owner());
CREATE POLICY "Owners see all leads" ON public.leads FOR ALL USING (public.is_owner());

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS package_price NUMERIC DEFAULT 3499;
UPDATE public.app_settings SET package_price = 3499 WHERE id = 1 AND package_price IS NULL;

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
