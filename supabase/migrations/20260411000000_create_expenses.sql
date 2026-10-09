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
