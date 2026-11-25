-- SmartMenu Partner Program - Database Schema
-- Run this in Supabase SQL Editor to create the partner_applications table

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_partner_applications_email ON partner_applications(email);
CREATE INDEX idx_partner_applications_mobile_number ON partner_applications(mobile_number);
CREATE INDEX idx_partner_applications_status ON partner_applications(status);
CREATE INDEX idx_partner_applications_created_at ON partner_applications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for the registration form)
CREATE POLICY "Allow public to insert partner applications" 
ON partner_applications 
FOR INSERT 
WITH CHECK (TRUE);

-- Only allow authenticated users to read (for admin panel)
CREATE POLICY "Allow authenticated users to read partner applications" 
ON partner_applications 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Only allow authenticated users to update (for admin panel)
CREATE POLICY "Allow authenticated users to update partner applications" 
ON partner_applications 
FOR UPDATE 
USING (auth.role() = 'authenticated');
