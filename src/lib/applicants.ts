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
    category: 'personal' | 'sales_call';
    badge: string;
    question: string;
    hint: string;
}

export const SALES_QUESTIONS: SalesQuestion[] = [
    // Questions all about him or her (Personal & Mindset)
    {
        id: 'q1_background',
        category: 'personal',
        badge: 'About You',
        question: '1. Tell us about yourself, your background in sales, and your past experience communicating with clients.',
        hint: 'Be honest and detailed about your work history, communication style, and relevant background.'
    },
    {
        id: 'q2_motivation',
        category: 'personal',
        badge: 'Motivation & Goals',
        question: '2. What motivates you to apply as a Sales Consultant for SmartMenu, and what is your monthly income goal?',
        hint: 'Share your personal ambition, financial targets, and why you are excited about this role.'
    },
    {
        id: 'q3_discipline',
        category: 'personal',
        badge: 'Work Ethic & Time',
        question: '3. How do you manage your time and stay self-disciplined when working in a remote or commission-based sales environment?',
        hint: 'Explain your daily habits and how you maintain high productivity without constant supervision.'
    },
    {
        id: 'q4_strengths',
        category: 'personal',
        badge: 'Strengths & Growth',
        question: '4. What are your top 3 strengths in sales, and what is one skill you are actively working to improve?',
        hint: 'E.g., Persuasion, active listening, objection handling, consistency, building rapport.'
    },

    // Questions regarding sales calls & objections (Sales Call Scenarios)
    {
        id: 'q5_first_minute',
        category: 'sales_call',
        badge: 'Sales Call: First 60 Secs',
        question: '5. When calling a busy restaurant owner or prospect, how do you hook their interest and build trust within the first 60 seconds?',
        hint: 'Share your exact opening pitch or approach to prevent them from hanging up.'
    },
    {
        id: 'q6_price_objection',
        category: 'sales_call',
        badge: 'Sales Call: Price Objection',
        question: '6. The client on the call says: "Your solution is too expensive! We can find free tools or cheaper alternatives." How do you handle this objection?',
        hint: 'Demonstrate return on investment (ROI), tangible business value, and why SmartMenu pays for itself.'
    },
    {
        id: 'q7_busy_client',
        category: 'sales_call',
        badge: 'Sales Call: Busy Owner',
        question: '7. The prospect replies: "I don\'t have time for this right now, I am swamped running my restaurant daily." How do you address their pain point?',
        hint: 'Explain how SmartMenu actually frees up their time and simplifies daily operations.'
    },
    {
        id: 'q8_think_about_it',
        category: 'sales_call',
        badge: 'Sales Call: "I\'ll Think About It"',
        question: '8. The prospect says: "Let me think about it, just call me next week." What do you do before ending the call, and how do you follow up?',
        hint: 'How do you avoid getting ghosted and keep the sales momentum alive?'
    },
    {
        id: 'q9_closing_downpayment',
        category: 'sales_call',
        badge: 'Sales Call: Closing Deal',
        question: '9. The client shows clear interest in the solution. How do you confidently ask for the close and secure their commitment or downpayment?',
        hint: 'Share your closing technique, transition, and call-to-action.'
    },
    {
        id: 'q10_rejection_resilience',
        category: 'sales_call',
        badge: 'Mindset: Rejection Resilience',
        question: '10. If you encounter a tough week filled with rejections and zero closed deals, how do you bounce back and keep your energy high?',
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

// Generate readable code e.g. WN-SC-84921
export const generateApplicationCode = (): string => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `WN-SC-${randomNum}`;
};

/**
 * Submit a completed application (all 3 stages at once)
 */
export const submitApplication = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    resumeLink: string;
    fbLink: string;
    otherSocials?: string;
    answers: ApplicantAnswers;
    meetingDate: string;
    meetingTime: string;
}): Promise<Applicant> => {
    const code = generateApplicationCode();
    const now = new Date().toISOString();

    const newApplicant: Applicant = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `app-${Date.now()}`,
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
            .insert([{
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
                completed_at: newApplicant.completed_at
            }])
            .select('*')
            .single();

        if (error) {
            console.warn('Supabase insert failed, saving locally:', error.message);
        } else if (dbData) {
            newApplicant.id = dbData.id;
        }
    } catch (err) {
        console.warn('Network error saving to Supabase, saving locally:', err);
    }

    // Always sync with local storage
    const local = getLocalApplicants();
    local.unshift(newApplicant);
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

        if (!error && data && data.length > 0) {
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
