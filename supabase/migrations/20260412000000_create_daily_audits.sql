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
