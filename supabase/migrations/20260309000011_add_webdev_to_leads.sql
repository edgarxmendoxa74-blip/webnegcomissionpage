-- Add webdev_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS webdev_id UUID REFERENCES public.workers(id);
