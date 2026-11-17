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
        badge: 'Tungkol Sa Iyo',
        question: '1. Ikwento mo ang tungkol sa iyong sarili, iyong sales background, at mga nakaraang karanasan sa pakikipag-usap sa mga kliyente.',
        hint: 'Maging tapat at detalyado sa iyong work experience at background.'
    },
    {
        id: 'q2_motivation',
        category: 'personal',
        badge: 'Motibasyon & Layunin',
        question: '2. Ano ang nag-uudyok sa iyo na mag-apply bilang Sales Consultant sa WebNegosyo, at ano ang buwanang income goal mo?',
        hint: 'Ibahagi ang iyong inspirasyon at pinansyal o propesyonal na target.'
    },
    {
        id: 'q3_discipline',
        category: 'personal',
        badge: 'Work Ethic & Time',
        question: '3. Paano mo pinapamahalaan ang iyong oras at sariling disiplina kapag nagtatrabaho sa isang commission-based o remote sales setup?',
        hint: 'Paano mo sinisigurado na productive ka araw-araw kahit walang nagbabantay?'
    },
    {
        id: 'q4_strengths',
        category: 'personal',
        badge: 'Kalakasan & Growth',
        question: '4. Ano ang nangungunang 3 kalakasan (strengths) mo sa sales, at ano ang isang bagay na patuloy mong pinagbubuti sa sarili mo?',
        hint: 'Hal. Communication, persuasion, resilience, follow-up habits, active listening.'
    },

    // Questions regarding sales calls & objections (Sales Call Scenarios)
    {
        id: 'q5_first_minute',
        category: 'sales_call',
        badge: 'Sales Call: First 60 Secs',
        question: '5. Kapag tumawag ka sa isang Filipino business owner o lead, paano mo kukunin ang tiwala at atensyon nila sa unang 60 segundo ng tawag?',
        hint: 'Ibigay ang iyong opening pitch o approach para hindi agad ibaba ang tawag.'
    },
    {
        id: 'q6_price_objection',
        category: 'sales_call',
        badge: 'Sales Call: Price Objection',
        question: '6. Sinabi ng client sa tawag: "Mahal naman ng ₱3,499 / ₱5,499 ninyo! May libre naman sa Facebook at may mas murang gumagawa diyan." Paano mo sasagutin?',
        hint: 'Ipakita ang value, return on investment (ROI), at tiwala na ibinibigay ng WebNegosyo.'
    },
    {
        id: 'q7_busy_client',
        category: 'sales_call',
        badge: 'Sales Call: Busy Owner',
        question: '7. Ang sagot ng kausap mo: "Wala akong oras para diyan, busy ako sa araw-araw na operasyon ng tindahan/negosyo ko." Paano mo ipapaliwanag ang solusyon?',
        hint: 'Paano makakatulong ang WebNegosyo para mabawasan ang abala ng may-ari?'
    },
    {
        id: 'q8_think_about_it',
        category: 'sales_call',
        badge: 'Sales Call: "Pag-iisipan Ko"',
        question: '8. Sinabi ng client: "Sige, pag-iisipan ko muna. Tawag ka na lang sa susunod na linggo." Ano ang gagawin mo bago tapusin ang tawag, at paano mo sila ifo-follow up?',
        hint: 'Paano mo maiiwasan ang ghosting at mapapanatiling mainit ang deal?'
    },
    {
        id: 'q9_closing_downpayment',
        category: 'sales_call',
        badge: 'Sales Call: Closing Deal',
        question: '9. Nagpakita ng interes ang kliyente sa package. Paano mo maayos at kumpiyansang hihingin ang pagsara ng deal at pag-settle ng downpayment?',
        hint: 'Ibahagi ang iyong closing technique o call-to-action.'
    },
    {
        id: 'q10_rejection_resilience',
        category: 'sales_call',
        badge: 'Mindset: Rejection Handling',
        question: '10. Kung magkaroon ka ng isang linggo na panay rejection at walang naisarang benta, ano ang gagawin mo para makabawi at mapanatiling mataas ang iyong energy?',
        hint: 'Paano mo hinaharap ang no at pinapanatili ang focus sa susunod na yes?'
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
