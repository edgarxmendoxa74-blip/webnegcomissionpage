-- Permanent "PAID" stamp for the owner's Master List.
-- Run this once in the Supabase SQL editor.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS paid_stamped_at TIMESTAMPTZ;

-- Once stamped, the stamp can never be removed or changed.
CREATE OR REPLACE FUNCTION public.protect_paid_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.paid_stamped_at IS NOT NULL THEN
    NEW.paid_stamped_at := OLD.paid_stamped_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_paid_stamp ON public.leads;
CREATE TRIGGER trg_protect_paid_stamp
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.protect_paid_stamp();
