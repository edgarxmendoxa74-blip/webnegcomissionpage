import React, { useState, useRef, useEffect } from 'react';
import {
    SALES_QUESTIONS,
    type Applicant,
    submitApplication,
    saveStage1Applicant,
    updateStage2Answers
} from '../lib/applicants';
import { supabase } from '../lib/supabase';
import {
    User,
    Mail,
    Phone,
    Facebook,
    Share2,
    Calendar,
    Clock,
    CheckCircle2,
    Check,
    ArrowRight,
    Send,
    Sparkles,
    AlertCircle,
    UploadCloud,
    Image as ImageIcon,
    Trash2,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TARGET_EMAIL = 'webnegosyo3@gmail.com';

interface ApplicantPortalProps {
    onBackToSelection?: () => void;
}

export const ApplicantPortal: React.FC<ApplicantPortalProps> = () => {
    // false = Home view (Poster & Apply button), true = Fill-up forms
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Form Stage: 1 = Profile, 2 = Q&A, 3 = Meeting
    const [currentStep, setCurrentStep] = useState(1);

    // Stage 1: Profile Info
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [resumeLink, setResumeLink] = useState('');
    const [resumeFileName, setResumeFileName] = useState('');
    const [resumeFileSize, setResumeFileSize] = useState('');
    const [useManualLink, setUseManualLink] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [fbLink, setFbLink] = useState('');
    const [otherSocials, setOtherSocials] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stage 2: Q&A Answers
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});

    // Stage 3: Meeting Schedule
    const tomorrowStr = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };
    const [meetingDate, setMeetingDate] = useState(tomorrowStr);
    const [meetingTime, setMeetingTime] = useState<'10:00 AM' | '4:00 PM' | '10:00 PM'>('10:00 AM');

    // UI State
    const [loading, setLoading] = useState(false);
    const [savingStage, setSavingStage] = useState(false);
    const [applicantId, setApplicantId] = useState<string>('');
    const [appCode, setAppCode] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [confirmedTerms, setConfirmedTerms] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completedApplicant, setCompletedApplicant] = useState<Applicant | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const isCompleted = !!completedApplicant;

    const personalityQuestions = SALES_QUESTIONS.filter(q => q.category === 'personality');
    const salesQuestions = SALES_QUESTIONS.filter(q => q.category === 'sales_call');
    const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    const personalityAnswered = personalityQuestions.filter(q => answers[q.id]?.trim()).length;
    const salesAnswered = salesQuestions.filter(q => answers[q.id]?.trim()).length;

    // Autoplay slideshow on the home view
    useEffect(() => {
        if (showApplicationForm) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 2);
        }, 5000);
        return () => clearInterval(timer);
    }, [showApplicationForm]);

    // Helper: compress image file via canvas (<300KB)
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1600;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.82));
                    } else {
                        resolve(img.src);
                    }
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (JPG, PNG, WebP).');
            return;
        }

        try {
            setError(null);
            setUploadingImage(true);

            // Try uploading directly to Supabase storage first
            let storedUrl = '';
            try {
                const ext = file.name.split('.').pop() || 'jpg';
                const filePath = `resumes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: upErr } = await supabase.storage.from('profiles').upload(filePath, file, { upsert: true });
                if (!upErr) {
                    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);
                    if (publicUrl) storedUrl = publicUrl;
                }
            } catch {
                // Ignore storage error, fallback to base64
            }

            if (storedUrl) {
                setResumeLink(storedUrl);
            } else {
                const compressed = await compressImage(file);
                setResumeLink(compressed);
            }

            setResumeFileName(file.name);
            setResumeFileSize(`${(file.size / 1024).toFixed(0)} KB`);
        } catch {
            setError('Failed to process image. Please try another photo.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setResumeLink('');
        setResumeFileName('');
        setResumeFileSize('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Stage 1 → Stage 2 (AUTOMATICALLY SAVES APPLICANT TO DATABASE!)
    const handleProceedToQA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!fullName.trim() || !email.trim() || !phoneNumber.trim()) {
            setError('Please fill in your name, email, and phone number.');
            return;
        }
        if (!resumeLink.trim()) {
            setError('Please upload a photo of your resume.');
            return;
        }
        if (!fbLink.trim()) {
            setError('Please provide your Facebook profile link.');
            return;
        }
        if (!otherSocials.trim()) {
            setError('Please provide your other social/portfolio link (or enter "None" if you have none).');
            return;
        }

        setSavingStage(true);
        try {
            const saved = await saveStage1Applicant({
                id: applicantId || undefined,
                fullName,
                email,
                phoneNumber,
                resumeLink,
                fbLink,
                otherSocials,
                existingCode: appCode || undefined
            });
            if (saved?.id) setApplicantId(saved.id);
            if (saved?.application_code) setAppCode(saved.application_code);
        } catch (err) {
            console.warn('Silent fallback for stage 1:', err);
        } finally {
            setSavingStage(false);
        }

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Stage 2 → Stage 3 (ALL QUESTIONS STRICTLY REQUIRED!)
    const handleProceedToMeeting = async () => {
        setError(null);
        const missing = SALES_QUESTIONS.filter(q => !answers[q.id]?.trim());
        if (missing.length > 0) {
            const firstMissingIdx = SALES_QUESTIONS.findIndex(q => q.id === missing[0].id) + 1;
            setError(`All ${SALES_QUESTIONS.length} questions are required. Please answer Question #${firstMissingIdx} before proceeding (${SALES_QUESTIONS.length - missing.length}/${SALES_QUESTIONS.length} answered).`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (applicantId) {
            try {
                await updateStage2Answers(applicantId, answers);
            } catch (err) {
                console.warn('Silent fallback for stage 2 answers:', err);
            }
        }

        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Generate Gmail URLs
    const getEmailUrls = (app: Applicant) => {
        const subject = `SmartMenu Sales Consultant Application Code: ${app.application_code} - ${app.full_name}`;
        const body =
            `Hi WebNegosyo / SmartMenu Team,\n\n` +
            `I have officially submitted my application for the Sales Consultant position.\n\n` +
            `📋 APPLICANT DETAILS:\n` +
            `• Full Name: ${app.full_name}\n` +
            `• Application Code: ${app.application_code}\n` +
            `• Phone Number: ${app.phone_number}\n` +
            `• Email: ${app.email}\n` +
            `• Facebook Profile: ${app.fb_link || 'N/A'}\n` +
            `• Other Socials / Online: ${app.other_socials || 'N/A'}\n\n` +
            `📅 SCHEDULED INTERVIEW:\n` +
            `• Date: ${app.meeting_date}\n` +
            `• Time Slot: ${app.meeting_time}\n\n` +
            (app.resume_link && !app.resume_link.startsWith('data:') ? `📎 Resume Link: ${app.resume_link}\n\n` : '') +
            `Please confirm my interview schedule. Thank you!\n\n` +
            `Respectfully,\n` +
            `${app.full_name}`;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${TARGET_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        return { gmailUrl, mailtoUrl };
    };

    // Stage 3 → Submit & Redirect (AUTOMATIC GMAIL REDIRECT + AUTO SYNC TO OWNER PORTAL)
    const handleCompleteApplication = async () => {
        setError(null);
        if (!meetingDate) {
            setError('Please choose your interview meeting date.');
            return;
        }
        if (!meetingTime) {
            setError('Please select an interview time slot.');
            return;
        }
        if (!confirmedTerms) {
            setError('Please check the confirmation box to confirm your scheduled interview attendance.');
            return;
        }

        setLoading(true);
        try {
            const result = await submitApplication({
                applicantId: applicantId || undefined,
                applicationCode: appCode || undefined,
                fullName,
                email,
                phoneNumber,
                resumeLink,
                fbLink,
                otherSocials,
                answers,
                meetingDate,
                meetingTime
            });

            setCompletedApplicant(result);
            setShowCompletionModal(true);

            // Automatically open Gmail to send details!
            const { gmailUrl, mailtoUrl } = getEmailUrls(result);

            // Try opening in new tab first (for desktop browsers)
            let openedInNewTab = false;
            try {
                const newWin = window.open(gmailUrl, '_blank');
                if (newWin && !newWin.closed && typeof newWin.closed !== 'undefined') {
                    openedInNewTab = true;
                }
            } catch {
                openedInNewTab = false;
            }

            // If popup was blocked or on mobile device, automatically redirect after brief 1s
            if (!openedInNewTab) {
                setTimeout(() => {
                    try {
                        window.location.href = gmailUrl;
                    } catch {
                        window.location.href = mailtoUrl;
                    }
                }, 1200);
            }
        } catch (err: any) {
            setError(err?.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (!completedApplicant?.application_code) return;
        navigator.clipboard.writeText(completedApplicant.application_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(TARGET_EMAIL);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    return (
        <div className="min-h-dvh bg-gradient-to-br from-amber-50/70 via-white to-orange-50/60 relative overflow-x-hidden flex flex-col justify-between p-2.5 sm:p-5">
            {/* Ambient Logo-Inspired Light Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
                <div className="absolute -top-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-br from-amber-300/20 to-orange-400/10 rounded-full blur-3xl" />
                <div className="absolute -top-20 -left-20 w-64 sm:w-80 h-64 sm:h-80 bg-gradient-to-tr from-rose-500/15 to-red-400/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(#f97316_0.75px,transparent_0.75px)] [background-size:20px_20px] opacity-[0.05]" />
            </div>

            {/* Main Content Area */}
            <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-center">

                {/* Header Section with Official SmartMenu Logo */}
                <div className="text-center space-y-1.5 mb-2.5 sm:mb-3 animate-in fade-in">
                    <div className="inline-flex items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-white shadow-md border border-amber-200/80 transition-transform hover:scale-105">
                        <img
                            src="/smartmenu-logo.jpg"
                            alt="SmartMenu Logo"
                            className="h-12 sm:h-14 w-auto object-contain rounded-lg"
                        />
                    </div>
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <Sparkles className="w-3 h-3 text-amber-200" />
                            <span>Sales Consultant Hiring</span>
                        </span>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* VIEW 1: HERO HOME PAGE (POSTER & DIRECT APPLY BUTTON)          */}
                {/* ============================================================== */}
                {!showApplicationForm ? (
                    <div className="space-y-3 sm:space-y-4 text-center animate-in fade-in duration-200">
                        {/* HERO SLIDESHOW - Compact mobile-first hero */}
                        <div className="relative w-full max-w-[320px] sm:max-w-[360px] mx-auto">
                            <div className="relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl border-2 border-white bg-white">
                                <AnimatePresence mode="wait">
                                    {currentSlide === 0 ? (
                                        /* Slide 1: Official Hiring Poster */
                                        <motion.div
                                            key="slide-1"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="w-full h-full p-0.5 bg-white flex items-center justify-center"
                                        >
                                            <img
                                                src="/smartmenu-hiring-banner.jpg"
                                                alt="We're Hiring Sales Consultant"
                                                className="w-full h-full object-contain rounded-xl"
                                            />
                                        </motion.div>
                                    ) : (
                                        /* Slide 2: Key Highlights Card */
                                        <motion.div
                                            key="slide-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="w-full h-full p-5 sm:p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white flex flex-col justify-between text-left"
                                        >
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                                                    Sales Consultant
                                                </span>
                                                <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-white mt-2">
                                                    Join Our Growing Team
                                                </h2>

                                                <div className="space-y-2 mt-4 text-xs font-bold">
                                                    <div className="flex items-center gap-2 text-amber-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                        <span>High uncapped commissions per deal</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-rose-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                        <span>100% Remote (Work from home)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        <span>Full phone pitch scripts provided</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-[9px] font-black text-amber-400/90 uppercase tracking-widest text-center">
                                                WebNegosyo • SmartMenu
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Arrows */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentSlide((prev) => (prev - 1 + 2) % 2)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all"
                                    aria-label="Previous"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentSlide((prev) => (prev + 1) % 2)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all"
                                    aria-label="Next"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Dots */}
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                                {[0, 1].map((idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`transition-all rounded-full ${
                                            currentSlide === idx
                                                ? 'w-5 h-1.5 bg-gradient-to-r from-red-600 to-amber-500'
                                                : 'w-1.5 h-1.5 bg-zinc-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* DIRECT "APPLY NOW" BUTTON */}
                        <div className="pt-1">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => {
                                    setShowApplicationForm(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-full max-w-[320px] sm:max-w-[360px] mx-auto py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-amber-200" />
                                <span>Apply as Sales Consultant</span>
                                <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>
                ) : (
                    /* ============================================================== */
                    /* VIEW 2: COMPACT 3-STEP FILL-UP FORM                           */
                    /* ============================================================== */
                    <div className="space-y-3 animate-in fade-in duration-200">
                        {/* Compact Top Bar */}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowApplicationForm(false);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 text-zinc-700 border border-amber-200 rounded-lg text-[11px] font-bold shadow-2xs"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-orange-600" />
                                <span>Back</span>
                            </button>

                            {/* Stepper Pills */}
                            <div className="flex items-center gap-1">
                                {[
                                    { num: 1, label: 'Profile' },
                                    { num: 2, label: 'Q&A' },
                                    { num: 3, label: 'Meeting' }
                                ].map((step) => {
                                    const isDone = currentStep > step.num || isCompleted;
                                    const isCurrent = currentStep === step.num && !isCompleted;
                                    return (
                                        <div
                                            key={step.num}
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                                isCurrent
                                                    ? 'bg-red-600 text-white shadow-2xs'
                                                    : isDone
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-zinc-100 text-zinc-400'
                                            }`}
                                        >
                                            {isDone ? <Check className="w-2.5 h-2.5" /> : step.num}
                                            <span>{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Error Notice */}
                        {error && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span className="leading-tight">{error}</span>
                            </div>
                        )}

                        {/* ===== STAGE 1: PROFILE ===== */}
                        {currentStep === 1 && (
                            <div className="bg-white/95 border border-amber-100 rounded-2xl p-4 sm:p-6 shadow-md shadow-orange-500/5">
                                <form onSubmit={handleProceedToQA} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                                            Full Name *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Juan Dela Cruz"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                            />
                                            <User className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                                                Email *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="juan@gmail.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                                />
                                                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                                                Phone *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    required
                                                    placeholder="0912 345 6789"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                                />
                                                <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Resume Image Upload */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3 text-red-600" />
                                                <span>Resume Photo *</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setUseManualLink(!useManualLink)}
                                                className="text-[8px] font-bold text-orange-600 underline"
                                            >
                                                {useManualLink ? 'Upload photo' : 'Or enter link'}
                                            </button>
                                        </div>

                                        {!useManualLink ? (
                                            <div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />

                                                {resumeLink && resumeLink.startsWith('data:image/') ? (
                                                    <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <img
                                                                src={resumeLink}
                                                                alt="Resume"
                                                                className="w-10 h-10 rounded-lg object-cover bg-white border border-amber-200 shrink-0"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="font-black text-xs text-zinc-900 truncate">
                                                                    {resumeFileName || 'resume.jpg'}
                                                                </p>
                                                                <span className="text-[9px] text-zinc-500 font-bold">{resumeFileSize || 'Ready'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="px-2 py-1 bg-white text-zinc-800 border rounded text-[9px] font-bold"
                                                            >
                                                                Change
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleRemoveImage}
                                                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="border-2 border-dashed border-amber-200 hover:border-red-400 bg-amber-50/20 rounded-xl p-3 text-center cursor-pointer"
                                                    >
                                                        {uploadingImage ? (
                                                            <span className="text-xs font-bold text-zinc-500">Processing photo...</span>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2 text-zinc-700">
                                                                <UploadCloud className="w-4 h-4 text-red-600" />
                                                                <span className="font-bold text-xs">Tap to upload Resume photo (JPG/PNG)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/..."
                                                value={resumeLink}
                                                onChange={(e) => setResumeLink(e.target.value)}
                                                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                                            Facebook Profile Link *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://facebook.com/yourprofile"
                                                value={fbLink}
                                                onChange={(e) => setFbLink(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                            />
                                            <Facebook className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                                            Other Socials / Online Link *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. TikTok, LinkedIn, Instagram, or type 'None'"
                                                value={otherSocials}
                                                onChange={(e) => setOtherSocials(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                            />
                                            <Share2 className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingStage}
                                        className="w-full mt-2 py-3 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                                    >
                                        <span>{savingStage ? 'Saving Details...' : 'Continue to Q&A'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ===== STAGE 2: Q&A ASSESSMENT (PERSONALITY & SALES SECTIONS) ===== */}
                        {currentStep === 2 && (
                            <div className="bg-white/95 border border-amber-100 rounded-2xl p-3 sm:p-5 shadow-md shadow-orange-500/5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                                Candidate Assessment
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                                                All Questions Required *
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                                            2 Sections • {SALES_QUESTIONS.length} Questions (Kailangang masagutan lahat)
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                                        answeredCount === SALES_QUESTIONS.length
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                            : 'bg-amber-50 text-amber-900 border-amber-200'
                                    }`}>
                                        {answeredCount}/{SALES_QUESTIONS.length} Answered
                                    </span>
                                </div>

                                {/* SECTION 1: HR & PERSONALITY ASSESSMENT */}
                                <div className="space-y-2.5">
                                    <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-50/40 border border-amber-200/80 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                                <UserCheck className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black uppercase text-amber-950 leading-tight">
                                                    Section 1: HR & Personality Interview *
                                                </h4>
                                                <p className="text-[9px] text-amber-800 font-medium">
                                                    Strengths, weaknesses & company value
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                                            personalityAnswered === personalityQuestions.length
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : 'bg-white/90 text-amber-900 border-amber-200/80'
                                        }`}>
                                            {personalityAnswered}/{personalityQuestions.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {personalityQuestions.map((q, idx) => {
                                            const isAnswered = !!answers[q.id]?.trim();
                                            return (
                                                <div
                                                    key={q.id}
                                                    className={`rounded-xl p-3 space-y-1.5 transition-all border ${
                                                        isAnswered
                                                            ? 'bg-emerald-50/20 border-emerald-200'
                                                            : 'bg-zinc-50/90 border-zinc-200/80'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                                            {q.badge}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                isAnswered
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                                                            }`}>
                                                                {isAnswered ? 'Answered ✓' : 'Required *'}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-zinc-400">
                                                                #{idx + 1}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <p className="font-extrabold text-xs text-zinc-900 leading-snug">
                                                        {q.question} <span className="text-red-500">*</span>
                                                    </p>

                                                    <textarea
                                                        required
                                                        rows={2}
                                                        placeholder="Required: Write your answer here..."
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                        className={`w-full p-2 bg-white border rounded-lg text-xs outline-none focus:border-red-500 resize-y min-h-[56px] ${
                                                            isAnswered ? 'border-emerald-300' : 'border-zinc-200'
                                                        }`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* SECTION 2: SALES CALL SCENARIOS */}
                                <div className="space-y-2.5 pt-1">
                                    <div className="p-2.5 bg-gradient-to-r from-red-600/10 via-rose-500/10 to-orange-50/40 border border-rose-200/80 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                                <PhoneCall className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black uppercase text-rose-950 leading-tight">
                                                    Section 2: Sales Call Scenarios *
                                                </h4>
                                                <p className="text-[9px] text-rose-800 font-medium">
                                                    Live pitching, price objections & closing deals
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                                            salesAnswered === salesQuestions.length
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : 'bg-white/90 text-rose-900 border-rose-200/80'
                                        }`}>
                                            {salesAnswered}/{salesQuestions.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {salesQuestions.map((q, idx) => {
                                            const isAnswered = !!answers[q.id]?.trim();
                                            return (
                                                <div
                                                    key={q.id}
                                                    className={`rounded-xl p-3 space-y-1.5 transition-all border ${
                                                        isAnswered
                                                            ? 'bg-emerald-50/20 border-emerald-200'
                                                            : 'bg-zinc-50/90 border-zinc-200/80'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-900">
                                                            {q.badge}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                isAnswered
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                                                            }`}>
                                                                {isAnswered ? 'Answered ✓' : 'Required *'}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-zinc-400">
                                                                #{personalityQuestions.length + idx + 1}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <p className="font-extrabold text-xs text-zinc-900 leading-snug">
                                                        {q.question} <span className="text-red-500">*</span>
                                                    </p>

                                                    <textarea
                                                        required
                                                        rows={2}
                                                        placeholder="Required: Write your answer here..."
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                        className={`w-full p-2 bg-white border rounded-lg text-xs outline-none focus:border-red-500 resize-y min-h-[56px] ${
                                                            isAnswered ? 'border-emerald-300' : 'border-zinc-200'
                                                        }`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100">
                                    <button
                                        type="button"
                                        onClick={() => { setCurrentStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="text-xs font-bold text-zinc-600 py-1"
                                    >
                                        ← Profile
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleProceedToMeeting}
                                        className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Next: Schedule</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ===== STAGE 3: SCHEDULE ===== */}
                        {currentStep === 3 && (
                            <div className="bg-white/95 border border-amber-100 rounded-2xl p-4 sm:p-5 shadow-md shadow-orange-500/5 space-y-4">
                                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                        Select Meeting Schedule *
                                    </h3>
                                    <span className="text-[9px] font-black uppercase text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        Final Step
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-orange-600" />
                                        <span>Interview Date *</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={meetingDate}
                                        onChange={(e) => setMeetingDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-600" />
                                        <span>Interview Time Slot *</span>
                                    </label>

                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { time: '10:00 AM' as const, label: 'Morning', icon: '🌅' },
                                            { time: '4:00 PM' as const, label: 'Afternoon', icon: '☀️' },
                                            { time: '10:00 PM' as const, label: 'Evening', icon: '🌙' }
                                        ].map((slot) => {
                                            const isSelected = meetingTime === slot.time;
                                            return (
                                                <button
                                                    key={slot.time}
                                                    type="button"
                                                    onClick={() => setMeetingTime(slot.time)}
                                                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-zinc-950 text-white border-amber-400 shadow-md ring-2 ring-amber-400/30'
                                                            : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800'
                                                    }`}
                                                >
                                                    <span className="text-sm block">{slot.icon}</span>
                                                    <span className="text-xs font-black block mt-0.5">{slot.time}</span>
                                                    <span className={`text-[8px] font-bold block ${isSelected ? 'text-amber-300' : 'text-zinc-400'}`}>
                                                        {slot.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Required Attendance Confirmation Box */}
                                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            required
                                            checked={confirmedTerms}
                                            onChange={(e) => setConfirmedTerms(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-zinc-900 leading-snug">
                                            I confirm that I will attend the scheduled interview on <strong className="text-red-700">{meetingDate || 'the selected date'}</strong> at <strong className="text-red-700">{meetingTime}</strong> and that all information I provided is accurate and true. <span className="text-red-600 font-black">*</span>
                                        </span>
                                    </label>
                                </div>

                                <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100">
                                    <button
                                        type="button"
                                        onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="text-xs font-bold text-zinc-600 py-1"
                                    >
                                        ← Q&A
                                    </button>

                                    <button
                                        type="button"
                                        disabled={loading || !confirmedTerms}
                                        onClick={handleCompleteApplication}
                                        className="px-5 py-3 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                                <span>Confirm & Send Application</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== COMPACT COMPLETION MODAL ===== */}
            <AnimatePresence>
                {showCompletionModal && completedApplicant?.application_code && (() => {
                    const { gmailUrl, mailtoUrl } = getEmailUrls(completedApplicant);
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-3xl border border-amber-200 p-5 sm:p-6 max-w-sm w-full shadow-2xl relative text-center space-y-3.5"
                            >
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>

                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        ✓ Saved to Database & Owner Portal
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1">
                                        Application Submitted!
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                                        Interview: {completedApplicant.meeting_date} at {completedApplicant.meeting_time}
                                    </p>
                                </div>

                                {/* Code Box */}
                                <div className="p-3 bg-zinc-950 text-white rounded-2xl space-y-1 shadow-sm">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-300 block">
                                        Your Application Code
                                    </span>
                                    <div className="text-xl font-black font-mono text-amber-400">
                                        {completedApplicant.application_code}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyCode}
                                        className="text-[9px] font-bold text-zinc-300 hover:text-white underline pt-0.5 cursor-pointer"
                                    >
                                        {copiedCode ? '✓ Copied to Clipboard' : 'Copy Application Code'}
                                    </button>
                                </div>

                                {/* Auto-Redirect Notice & Send Buttons */}
                                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-left text-xs space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] text-zinc-800 font-bold leading-tight">
                                            Redirecting to Gmail to send your application details...
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <a
                                            href={gmailUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-md hover:from-red-700 hover:to-amber-700 active:scale-95 transition-all"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Send Details via Gmail Web</span>
                                        </a>

                                        <div className="grid grid-cols-2 gap-1.5">
                                            <a
                                                href={mailtoUrl}
                                                className="py-2 px-2 bg-white border border-zinc-200 hover:border-black text-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1 active:scale-95 transition-all"
                                            >
                                                <Mail className="w-3 h-3 text-zinc-500" />
                                                <span>Open Mail App</span>
                                            </a>

                                            <button
                                                type="button"
                                                onClick={handleCopyEmail}
                                                className="py-2 px-2 bg-white border border-zinc-200 hover:border-black text-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-wider text-center active:scale-95 transition-all cursor-pointer"
                                            >
                                                {copiedEmail ? '✓ Copied Email' : 'Copy Email'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowCompletionModal(false)}
                                    className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Done / Close
                                </button>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Footer */}
            <div className="text-center py-2 mt-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                SmartMenu • WebNegosyo 2026
            </div>
        </div>
    );
};
