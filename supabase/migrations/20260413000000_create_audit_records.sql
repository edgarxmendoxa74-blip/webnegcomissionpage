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
