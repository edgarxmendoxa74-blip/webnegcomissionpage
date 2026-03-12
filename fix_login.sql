-- Run this in the Supabase SQL Editor to fix the "infinite recursion" error and revive all logins

-- 1. Create a secure function to check if the current user is an owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workers WHERE user_id = auth.uid() AND is_owner = true
  );
$$;

-- 2. Drop the broken policies that caused the infinite loop
DROP POLICY IF EXISTS "Owners manage workers" ON public.workers;
DROP POLICY IF EXISTS "Owners see all leads" ON public.leads;

-- 3. Create the new, safe policies using the function
CREATE POLICY "Owners manage workers" 
ON public.workers FOR ALL 
USING (public.is_owner());

CREATE POLICY "Owners see all leads" 
ON public.leads FOR ALL 
USING (public.is_owner());
