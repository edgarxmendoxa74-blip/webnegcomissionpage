-- Add assigned_webdev_id to workers table to support automatic assignment
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS assigned_webdev_id UUID REFERENCES public.workers(id);
