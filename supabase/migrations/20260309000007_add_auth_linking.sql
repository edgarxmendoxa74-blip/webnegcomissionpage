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
