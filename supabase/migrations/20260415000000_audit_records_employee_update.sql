DROP POLICY IF EXISTS "Employees update own audit records" ON public.audit_records;
CREATE POLICY "Employees update own audit records" ON public.audit_records
    FOR UPDATE
    USING (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()))
    WITH CHECK (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));
