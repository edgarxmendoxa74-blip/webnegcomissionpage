-- Social media handle/link of the client, entered in Employee Portal > Daily Audit > Add Record.
ALTER TABLE public.audit_records ADD COLUMN IF NOT EXISTS socials TEXT;
