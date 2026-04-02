-- Create client_storage table
CREATE TABLE IF NOT EXISTS client_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    assigned_webdev_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    website_link TEXT,
    admin_link TEXT,
    admin_email TEXT,
    admin_password TEXT,
    supabase_email TEXT,
    supabase_password TEXT,
    database_password TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_storage ENABLE ROW LEVEL SECURITY;

-- Policies for client_storage
-- Employees can view their own client storage OR where they are the assigned webdev
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own client storage') THEN
        CREATE POLICY "Users can view their own client storage"
            ON client_storage FOR SELECT
            USING (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id) OR 
                auth.uid() IN (SELECT user_id FROM workers WHERE id = assigned_webdev_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own client storage') THEN
        CREATE POLICY "Users can insert their own client storage"
            ON client_storage FOR INSERT
            WITH CHECK (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own client storage') THEN
        CREATE POLICY "Users can update their own client storage"
            ON client_storage FOR UPDATE
            USING (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own client storage') THEN
        CREATE POLICY "Users can delete their own client storage"
            ON client_storage FOR DELETE
            USING (
                auth.uid() IN (SELECT user_id FROM workers WHERE id = worker_id)
            );
    END IF;
END $$;
