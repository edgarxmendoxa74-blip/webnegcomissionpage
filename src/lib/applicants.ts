import { supabase } from './supabase';

export interface ApplicantAnswers {
    [key: string]: string;
}

export interface Applicant {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    resume_link?: string;
    fb_link?: string;
    other_socials?: string;
    current_stage: number; // 1: Profile, 2: Q&A, 3: Schedule, 4: Completed
    status: 'incomplete' | 'completed' | 'reviewed' | 'interview_scheduled' | 'hired' | 'rejected';
    answers?: ApplicantAnswers;
    meeting_date?: string;
    meeting_time?: string; // '10:00 AM' | '4:00 PM' | '10:00 PM'
    application_code?: string;
    completed_at?: string;
    owner_notes?: string;
    owner_rating?: number;
    created_at?: string;
    updated_at?: string;
}

export interface SalesQuestion {
    id: string;
    category: 'personality' | 'sales_call';
    section: 'HR & Personality' | 'Sales Call Scenarios';
    badge: string;
    question: string;
    hint: string;
}

export const SALES_QUESTIONS: SalesQuestion[] = [
    // =========================================================================
    // SECTION 1: HR & PERSONALITY ASSESSMENT
    // (Strengths, Weaknesses, Company Value, and Standard HR Interview Questions)
    // =========================================================================
    {
        id: 'q_hr_background',
        category: 'personality',
        section: 'HR & Personality',
        badge: 'About You & Background',
        question: '1. Tell us about yourself, your personal background, and what makes you a great fit for our team.',
        hint: 'Share your background, passions, and communication experience.'
    },
    {
        id: 'q_hr_strengths_weaknesses',
        category: 'personality',
        section: 'HR & Personality',
        badge: 'Strengths & Weaknesses',
        question: '2. What are your greatest strengths and weaknesses, and what concrete steps do you take to improve your weaknesses?',
        hint: 'Be genuine. Highlight your key strengths and how you actively work on areas of growth.'
    },
    {
        id: 'q_hr_company_contribution',
        category: 'personality',
        section: 'HR & Personality',
        badge: 'Contribution to Company',
        question: '3. How can you contribute to SmartMenu, and in what specific ways will your skills help our company grow?',
        hint: 'Explain how your efforts will help restaurant owners succeed and drive company revenue.'
    },
    {
        id: 'q_hr_motivation_goals',
        category: 'personality',
        section: 'HR & Personality',
        badge: 'Motivation & Why Us',
        question: '4. Why do you want to work with SmartMenu, and what are your career and income goals for the next 12 months?',
        hint: 'Share your personal ambition and why SmartMenu excites you over other opportunities.'
    },
    {
        id: 'q_hr_pressure_resilience',
        category: 'personality',
        section: 'HR & Personality',
        badge: 'Handling Pressure & Work Ethic',
        question: '5. How do you handle work pressure, stressful days, and stay self-disciplined in a remote work environment?',
        hint: 'Explain how you stay calm, organized, and maintain high energy when facing challenges.'
    },

    // =========================================================================
    // SECTION 2: SALES CALL SCENARIOS
    // (Live Pitching, Price Objection, Busy Client, and Closing Deals)
    // =========================================================================
    {
        id: 'q_sales_first_minute',
        category: 'sales_call',
        section: 'Sales Call Scenarios',
        badge: 'First 60 Seconds Hook',
        question: '6. When calling a busy restaurant owner or prospect, how do you hook their interest and build trust within the first 60 seconds?',
        hint: 'Share your exact opening pitch or approach to prevent them from hanging up.'
    },
    {
        id: 'q_sales_price_objection',
        category: 'sales_call',
        section: 'Sales Call Scenarios',
        badge: 'Price Objection',
        question: '7. The client on the call says: "Your solution is too expensive! We can find free tools or cheaper alternatives." How do you handle this objection?',
        hint: 'Demonstrate return on investment (ROI), tangible business value, and why SmartMenu pays for itself.'
    },
    {
        id: 'q_sales_busy_client',
        category: 'sales_call',
        section: 'Sales Call Scenarios',
        badge: 'Busy Restaurant Owner',
        question: '8. The prospect replies: "I don\'t have time for this right now, I am swamped running my restaurant daily." How do you address their pain point?',
        hint: 'Explain how SmartMenu actually frees up their time and simplifies daily operations.'
    },
    {
        id: 'q_sales_think_about_it',
        category: 'sales_call',
        section: 'Sales Call Scenarios',
        badge: '"I\'ll Think About It"',
        question: '9. The prospect says: "Let me think about it, just call me next week." What do you do before ending the call, and how do you follow up?',
        hint: 'How do you avoid getting ghosted and keep the sales momentum alive?'
    },
    {
        id: 'q_sales_closing_deal',
        category: 'sales_call',
        section: 'Sales Call Scenarios',
        badge: 'Closing Deal & Downpayment',
        question: '10. The client shows clear interest in the solution. How do you confidently ask for the close and secure their commitment or downpayment?',
        hint: 'Share your closing technique, transition, and call-to-action.'
    },
    {
        id: 'q_sales_rejection_resilience',
        category: 'sales_call',
        section: 'Sales Call Scenarios',
        badge: 'Mindset: Rejection Resilience',
        question: '11. If you encounter a tough week filled with rejections and zero closed deals, how do you bounce back and keep your energy high?',
        hint: 'How do you process hearing "no" and maintain motivation toward your next "yes"?'
    }
];

const LOCAL_STORAGE_KEY = 'webnegosyo_applicants_local';

// Local storage helper fallback
const getLocalApplicants = (): Applicant[] => {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveLocalApplicants = (list: Applicant[]) => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
        /* storage full or unavailable */
    }
};

// Valid UUID v4 generator
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Generate readable code e.g. WN-SC-84921
export const generateApplicationCode = (): string => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `WN-SC-${randomNum}`;
};

export const APPLICANTS_SQL_SETUP = `-- =========================================================================
-- CREATE APPLICANTS TABLE FOR SALES CONSULTANT HIRING PORTAL
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tctqctqsuibfrktmirzc/sql/new
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
    
    current_stage INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'incomplete',
    
    answers JSONB DEFAULT '{}'::jsonb,
    
    meeting_date DATE,
    meeting_time TEXT,
    
    application_code TEXT UNIQUE,
    completed_at TIMESTAMPTZ,
    
    owner_notes TEXT,
    owner_rating INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicants_status ON public.applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON public.applicants(email);
CREATE INDEX IF NOT EXISTS idx_applicants_code ON public.applicants(application_code);
CREATE INDEX IF NOT EXISTS idx_applicants_meeting ON public.applicants(meeting_date, meeting_time);

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit and update application" ON public.applicants;
CREATE POLICY "Public can submit and update application" ON public.applicants
    FOR ALL USING (true) WITH CHECK (true);

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
    NULL;
END $$;`;

/**
 * Check if the applicants table exists in Supabase
 */
export const checkApplicantsTable = async (): Promise<{ exists: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('applicants')
            .select('id')
            .limit(1);

        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                return { exists: false, error: 'Table public.applicants does not exist in Supabase.' };
            }
            return { exists: false, error: error.message };
        }
        return { exists: true };
    } catch (err: any) {
        return { exists: false, error: err?.message || 'Connection error' };
    }
};

/**
 * Stage 1: Save initial applicant info immediately
 * So owner sees all who started applying even if they drop off later
 */
export const saveStage1Applicant = async (data: {
    id?: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    resumeLink: string;
    fbLink: string;
    otherSocials?: string;
    existingCode?: string;
}): Promise<Applicant> => {
    const id = data.id || generateUUID();
    const code = data.existingCode || generateApplicationCode();
    const now = new Date().toISOString();

    const record: Applicant = {
        id,
        full_name: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone_number: data.phoneNumber.trim(),
        resume_link: data.resumeLink.trim(),
        fb_link: data.fbLink.trim(),
        other_socials: (data.otherSocials || '').trim(),
        current_stage: 1,
        status: 'incomplete',
        application_code: code,
        answers: {},
        created_at: now,
        updated_at: now
    };

    try {
        const { data: dbData, error } = await supabase
            .from('applicants')
            .upsert([{
                id: record.id,
                full_name: record.full_name,
                email: record.email,
                phone_number: record.phone_number,
                resume_link: record.resume_link,
                fb_link: record.fb_link,
                other_socials: record.other_socials,
                current_stage: record.current_stage,
                status: record.status,
                application_code: record.application_code,
                updated_at: now
            }], { onConflict: 'id' })
            .select('*')
            .single();

        if (error) {
            console.warn('Supabase Stage 1 upsert failed:', error.message);
        } else if (dbData) {
            record.id = dbData.id;
        }
    } catch (err) {
        console.warn('Supabase Stage 1 exception:', err);
    }

    // Sync to local storage
    const local = getLocalApplicants();
    const idx = local.findIndex(a => a.id === record.id || a.email === record.email);
    if (idx >= 0) {
        local[idx] = { ...local[idx], ...record };
    } else {
        local.unshift(record);
    }
    saveLocalApplicants(local);

    return record;
};

/**
 * Stage 2: Save Q&A answers as they progress
 */
export const updateStage2Answers = async (applicantId: string, answers: ApplicantAnswers): Promise<void> => {
    if (!applicantId) return;
    const now = new Date().toISOString();

    try {
        await supabase
            .from('applicants')
            .update({
                answers,
                current_stage: 2,
                updated_at: now
            })
            .eq('id', applicantId);
    } catch (err) {
        console.warn('Supabase Stage 2 update failed:', err);
    }

    const local = getLocalApplicants();
    const idx = local.findIndex(a => a.id === applicantId);
    if (idx >= 0) {
        local[idx].answers = answers;
        local[idx].current_stage = 2;
        local[idx].updated_at = now;
        saveLocalApplicants(local);
    }
};

/**
 * Submit / Finalize a completed application (Stage 3 Complete)
 */
export const submitApplication = async (data: {
    applicantId?: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    resumeLink: string;
    fbLink: string;
    otherSocials?: string;
    answers: ApplicantAnswers;
    meetingDate: string;
    meetingTime: string;
    applicationCode?: string;
}): Promise<Applicant> => {
    const id = data.applicantId || generateUUID();
    const code = data.applicationCode || generateApplicationCode();
    const now = new Date().toISOString();

    const newApplicant: Applicant = {
        id,
        full_name: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone_number: data.phoneNumber.trim(),
        resume_link: data.resumeLink.trim(),
        fb_link: data.fbLink.trim(),
        other_socials: (data.otherSocials || '').trim(),
        current_stage: 4,
        status: 'completed',
        answers: data.answers,
        meeting_date: data.meetingDate,
        meeting_time: data.meetingTime,
        application_code: code,
        completed_at: now,
        created_at: now,
        updated_at: now
    };

    // Attempt to persist to Supabase
    try {
        const { data: dbData, error } = await supabase
            .from('applicants')
            .upsert([{
                id: newApplicant.id,
                full_name: newApplicant.full_name,
                email: newApplicant.email,
                phone_number: newApplicant.phone_number,
                resume_link: newApplicant.resume_link,
                fb_link: newApplicant.fb_link,
                other_socials: newApplicant.other_socials,
                current_stage: newApplicant.current_stage,
                status: newApplicant.status,
                answers: newApplicant.answers,
                meeting_date: newApplicant.meeting_date,
                meeting_time: newApplicant.meeting_time,
                application_code: newApplicant.application_code,
                completed_at: newApplicant.completed_at,
                updated_at: now
            }], { onConflict: 'id' })
            .select('*')
            .single();

        if (error) {
            console.warn('Supabase upsert failed, saving locally:', error.message);
        } else if (dbData) {
            newApplicant.id = dbData.id;
        }
    } catch (err) {
        console.warn('Network error saving to Supabase, saving locally:', err);
    }

    // Always sync with local storage
    const local = getLocalApplicants();
    const idx = local.findIndex(a => a.id === newApplicant.id || a.email === newApplicant.email);
    if (idx >= 0) {
        local[idx] = { ...local[idx], ...newApplicant };
    } else {
        local.unshift(newApplicant);
    }
    saveLocalApplicants(local);

    return newApplicant;
};

/**
 * Fetch all applicants for Owner Dashboard
 */
export const fetchAllApplicants = async (): Promise<Applicant[]> => {
    const local = getLocalApplicants();

    try {
        const { data, error } = await supabase
            .from('applicants')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Merge with local storage in case of offline additions
            const combinedMap = new Map<string, Applicant>();
            data.forEach((item: Applicant) => combinedMap.set(item.id, item));
            local.forEach(item => {
                if (!combinedMap.has(item.id)) combinedMap.set(item.id, item);
            });
            const merged = Array.from(combinedMap.values());
            saveLocalApplicants(merged);
            return merged;
        }
    } catch (err) {
        console.warn('Error fetching applicants from Supabase:', err);
    }

    return local;
};

/**
 * Update applicant status & notes (for Owner)
 */
export const updateApplicantReview = async (
    applicantId: string,
    status: Applicant['status'],
    notes?: string
): Promise<void> => {
    const updates: Partial<Applicant> = {
        status,
        ...(notes !== undefined ? { owner_notes: notes } : {}),
        updated_at: new Date().toISOString()
    };

    try {
        await supabase
            .from('applicants')
            .update(updates)
            .eq('id', applicantId);
    } catch (err) {
        console.warn('Error saving applicant review:', err);
    }

    const local = getLocalApplicants();
    const idx = local.findIndex(a => a.id === applicantId);
    if (idx >= 0) {
        local[idx] = { ...local[idx], ...updates };
        saveLocalApplicants(local);
    }
};
