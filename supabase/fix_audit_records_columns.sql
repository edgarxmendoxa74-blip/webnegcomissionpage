-- Run once in the Supabase SQL Editor.
-- Fixes: "Could not find the 'notes' column of 'audit_records' in the schema cache"
-- (adds the columns/policy that the Employee Portal > Client Records form needs).

ALTER TABLE public.audit_records ADD COLUMN IF NOT EXISTS socials TEXT;
ALTER TABLE public.audit_records ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Employees update own audit records" ON public.audit_records;
CREATE POLICY "Employees update own audit records" ON public.audit_records
    FOR UPDATE
    USING (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()))
    WITH CHECK (worker_id = (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Make PostgREST pick up the new columns immediately.
NOTIFY pgrst, 'reload schema';
