import { supabase } from './supabase';

export interface ApplicantAnswers {
    [key: string]: string;
}

export interface Applicant {
    id: string;
    full_name: string;
    email: string;
    password_hash?: string;
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
const ACTIVE_APPLICANT_KEY = 'webnegosyo_active_applicant_session';

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

export const getActiveApplicantSession = (): Applicant | null => {
    try {
        const raw = localStorage.getItem(ACTIVE_APPLICANT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setActiveApplicantSession = (applicant: Applicant | null) => {
    try {
        if (applicant) {
            localStorage.setItem(ACTIVE_APPLICANT_KEY, JSON.stringify(applicant));
        } else {
            localStorage.removeItem(ACTIVE_APPLICANT_KEY);
        }
    } catch {
        /* ignore */
    }
};

// Generate readable code e.g. WN-SC-8492
export const generateApplicationCode = (): string => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `WN-SC-${randomNum}`;
};

/**
 * Register a new applicant
 */
export const registerApplicant = async (data: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    resumeLink: string;
    fbLink: string;
    otherSocials?: string;
}): Promise<Applicant> => {
    const normalizedEmail = data.email.trim().toLowerCase();

    const newApplicant: Applicant = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `app-${Date.now()}`,
        full_name: data.fullName.trim(),
        email: normalizedEmail,
        password_hash: data.password,
        phone_number: data.phoneNumber.trim(),
        resume_link: data.resumeLink.trim(),
        fb_link: data.fbLink.trim(),
        other_socials: (data.otherSocials || '').trim(),
        current_stage: 2, // Advanced to Q&A stage after submitting basic profile!
        status: 'incomplete',
        answers: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Attempt to persist to Supabase
    try {
        const { data: dbData, error } = await supabase
            .from('applicants')
            .insert([{
                id: newApplicant.id,
                full_name: newApplicant.full_name,
                email: newApplicant.email,
                password_hash: newApplicant.password_hash,
                phone_number: newApplicant.phone_number,
                resume_link: newApplicant.resume_link,
                fb_link: newApplicant.fb_link,
                other_socials: newApplicant.other_socials,
                current_stage: newApplicant.current_stage,
                status: newApplicant.status,
                answers: newApplicant.answers
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
    const existingIdx = local.findIndex(a => a.email === normalizedEmail);
    if (existingIdx >= 0) {
        local[existingIdx] = newApplicant;
    } else {
        local.unshift(newApplicant);
    }
    saveLocalApplicants(local);
    setActiveApplicantSession(newApplicant);

    return newApplicant;
};

/**
 * Sign in an applicant
 */
export const loginApplicant = async (email: string, password: string): Promise<Applicant> => {
    const normalizedEmail = email.trim().toLowerCase();

    // Try Supabase first
    try {
        const { data, error } = await supabase
            .from('applicants')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!error && data) {
            if (data.password_hash && data.password_hash !== password) {
                throw new Error('Maling password. Pakisubukang muli.');
            }
            setActiveApplicantSession(data);
            return data;
        }
    } catch (err: any) {
        if (err?.message === 'Maling password. Pakisubukang muli.') throw err;
        console.warn('Error checking supabase applicant login:', err);
    }

    // Check local storage fallback
    const local = getLocalApplicants();
    const found = local.find(a => a.email === normalizedEmail);
    if (found) {
        if (found.password_hash && found.password_hash !== password) {
            throw new Error('Maling password. Pakisubukang muli.');
        }
        setActiveApplicantSession(found);
        return found;
    }

    throw new Error('Walang natagpuang aplikante gamit ang email na ito. Mangyaring mag-sign up muna.');
};

/**
 * Save stage progress (e.g. Stage 2 answers or profile updates)
 */
export const saveApplicantProgress = async (
    applicantId: string,
    updates: Partial<Applicant>
): Promise<Applicant> => {
    const payload = {
        ...updates,
        updated_at: new Date().toISOString()
    };

    // Update in Supabase
    try {
        await supabase
            .from('applicants')
            .update(payload)
            .eq('id', applicantId);
    } catch (err) {
        console.warn('Error updating applicant progress in Supabase:', err);
    }

    // Update locally
    const local = getLocalApplicants();
    const idx = local.findIndex(a => a.id === applicantId);
    let updatedApplicant: Applicant;
    if (idx >= 0) {
        local[idx] = { ...local[idx], ...payload };
        updatedApplicant = local[idx];
    } else {
        updatedApplicant = payload as Applicant;
        local.unshift(updatedApplicant);
    }
    saveLocalApplicants(local);

    const active = getActiveApplicantSession();
    if (active && active.id === applicantId) {
        setActiveApplicantSession({ ...active, ...payload });
    }

    return updatedApplicant;
};

/**
 * Stage 3 Completion: Select meeting time and generate confirmation code
 */
export const completeApplicantMeeting = async (
    applicantId: string,
    meetingDate: string,
    meetingTime: string
): Promise<Applicant> => {
    const active = getActiveApplicantSession();
    const code = active?.application_code || generateApplicationCode();

    const updates: Partial<Applicant> = {
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        application_code: code,
        current_stage: 4,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    return await saveApplicantProgress(applicantId, updates);
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
