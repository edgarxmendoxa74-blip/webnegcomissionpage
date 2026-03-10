-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create public access policies for the 'profiles' bucket
CREATE POLICY "Public Select" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'profiles');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'profiles');
