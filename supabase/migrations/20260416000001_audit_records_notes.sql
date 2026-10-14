-- Free-text notes per client record (Employee Portal > Daily Audit > Client Records)
ALTER TABLE public.audit_records ADD COLUMN IF NOT EXISTS notes TEXT;
