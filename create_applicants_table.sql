-- =========================================================================
-- CREATE APPLICANTS TABLE FOR SALES CONSULTANT HIRING PORTAL
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/tctqctqsuibfrktmirzc/sql
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    phone_number TEXT,
    resume_link TEXT,
    fb_link TEXT,
    other_socials TEXT,
    
    -- Stage & Status:
    -- current_stage: 1 (Profile), 2 (Q&A), 3 (Schedule), 4 (Completed)
    -- status: 'incomplete' | 'completed' | 'reviewed' | 'interview_scheduled' | 'hired' | 'rejected'
    current_stage INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'incomplete',
    
    -- Stage 2: JSON object holding all answers
    answers JSONB DEFAULT '{}'::jsonb,
    
    -- Stage 3 Meeting Selection:
    meeting_date DATE,
    meeting_time TEXT, -- '10:00 AM' | '4:00 PM' | '10:00 PM'
    
    -- Completion & Verification Code:
    application_code TEXT UNIQUE,
    completed_at TIMESTAMPTZ,
    
    -- Owner review & feedback
    owner_notes TEXT,
    owner_rating INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for fast search and filtering
CREATE INDEX IF NOT EXISTS idx_applicants_status ON public.applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON public.applicants(email);
CREATE INDEX IF NOT EXISTS idx_applicants_code ON public.applicants(application_code);
CREATE INDEX IF NOT EXISTS idx_applicants_meeting ON public.applicants(meeting_date, meeting_time);

-- Enable Row Level Security
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Allow public applicants to insert and update their application
DROP POLICY IF EXISTS "Public can submit and update application" ON public.applicants;
CREATE POLICY "Public can submit and update application" ON public.applicants
    FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time for applicants table (safe if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'applicants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applicants;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if publication does not exist or user lacks permission
    NULL;
END $$;
