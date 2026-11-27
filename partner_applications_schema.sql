-- SmartMenu Partner Program - Database Schema
-- Safe to run multiple times (idempotent)
-- =========================================================

-- 1. Create table if it doesn't exist yet
-- =========================================================
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  business_address TEXT NOT NULL,
  area_coverage TEXT,
  offered_price NUMERIC NOT NULL,
  markup NUMERIC NOT NULL,
  accepted_terms BOOLEAN NOT NULL DEFAULT TRUE,
  stamp_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add profile_picture_url if the table already existed without it
-- =========================================================
ALTER TABLE partner_applications
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 3. Create indexes only if they don't exist yet
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_partner_applications_email
  ON partner_applications(email);

CREATE INDEX IF NOT EXISTS idx_partner_applications_mobile_number
  ON partner_applications(mobile_number);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status
  ON partner_applications(status);

CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at
  ON partner_applications(created_at DESC);

-- 4. Enable Row Level Security
-- =========================================================
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- 5. Policies — drop first so re-runs don't fail on duplicate names
-- =========================================================
DROP POLICY IF EXISTS "Allow public to insert partner applications"
  ON partner_applications;

DROP POLICY IF EXISTS "Allow authenticated users to read partner applications"
  ON partner_applications;

DROP POLICY IF EXISTS "Allow authenticated users to update partner applications"
  ON partner_applications;

DROP POLICY IF EXISTS "Allow authenticated users to delete partner applications"
  ON partner_applications;

-- Allow anyone (anon + authenticated) to INSERT — the sign-up form is public
CREATE POLICY "Allow public to insert partner applications"
  ON partner_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Allow authenticated users (admin) to read
CREATE POLICY "Allow authenticated users to read partner applications"
  ON partner_applications FOR SELECT
  TO authenticated
  USING (TRUE);

-- Allow authenticated users (admin) to update status
CREATE POLICY "Allow authenticated users to update partner applications"
  ON partner_applications FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Allow authenticated users (admin) to delete a partner
CREATE POLICY "Allow authenticated users to delete partner applications"
  ON partner_applications FOR DELETE
  TO authenticated
  USING (TRUE);
