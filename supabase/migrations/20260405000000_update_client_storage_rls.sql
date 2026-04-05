-- Add policy to allow owners to manage all client storage records
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage all client storage') THEN
        CREATE POLICY "Owners can manage all client storage"
            ON client_storage FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM workers 
                    WHERE user_id = auth.uid() AND (is_owner = true OR role = 'Owner')
                )
            );
    END IF;
END $$;
