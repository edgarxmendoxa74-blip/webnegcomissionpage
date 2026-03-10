-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    logo_url TEXT,
    app_name TEXT DEFAULT 'WebNegosyo',
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT singleton_check CHECK (id = 1)
);

-- Initialize with default values
INSERT INTO public.app_settings (id, app_name)
VALUES (1, 'WebNegosyo')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Allow anyone to update (since it's a management tool for the owner)
CREATE POLICY "Allow update app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
