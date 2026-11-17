import React, { useState, useRef, useEffect } from 'react';
import {
    SALES_QUESTIONS,
    type Applicant,
    submitApplication
} from '../lib/applicants';
import {
    User,
    Mail,
    Phone,
    FileText,
    Facebook,
    Share2,
    Calendar,
    Clock,
    CheckCircle2,
    Check,
    Copy,
    ArrowRight,
    Send,
    Sparkles,
    AlertCircle,
    UploadCloud,
    Image as ImageIcon,
    Trash2,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Award,
    TrendingUp,
    ShieldCheck,
    Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TARGET_EMAIL = 'webnegosyo3@gmail.com';

interface ApplicantPortalProps {
    onBackToSelection?: () => void;
}

export const ApplicantPortal: React.FC<ApplicantPortalProps> = () => {
    // Top-level View: false = Hiring Home / Hero Page, true = Fill-up Application Forms
    const [showApplicationForm, setShowApplicationForm] = useState(false);

    // Hero Slideshow State
    const [currentSlide, setCurrentSlide] = useState(0);

    // Form Stage: 1 = Profile, 2 = Q&A, 3 = Meeting
    const [currentStep, setCurrentStep] = useState(1);

    // Stage 1: Profile Info
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [resumeLink, setResumeLink] = useState(''); // Holds image data URL or external link
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
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completedApplicant, setCompletedApplicant] = useState<Applicant | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const isCompleted = !!completedApplicant;

    // Autoplay slideshow on the home section
    useEffect(() => {
        if (showApplicationForm) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(timer);
    }, [showApplicationForm]);

    // Helper: compress image file via canvas to keep it lightweight (<300KB)
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
            setError('Pakipili ang image file ng iyong resume (JPG, PNG, o WebP format).');
            return;
        }

        try {
            setError(null);
            setUploadingImage(true);
            const compressed = await compressImage(file);
            setResumeLink(compressed);
            setResumeFileName(file.name);
            setResumeFileSize(`${(file.size / 1024).toFixed(0)} KB`);
        } catch {
            setError('Nabigong basahin ang image. Pakisubukang muli gamit ang ibang photo.');
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

    // Handle Stage 1 → Stage 2
    const handleProceedToQA = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!fullName.trim() || !email.trim() || !phoneNumber.trim()) {
            setError('Please fill in all required fields (Full Name, Email Address, Phone Number).');
            return;
        }
        if (!resumeLink.trim()) {
            setError('Please upload an image/photo of your resume (or paste a resume link).');
            return;
        }
        if (!fbLink.trim()) {
            setError('Please provide your Facebook profile link for identity verification.');
            return;
        }

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSuccessMessage('Profile saved! Proceed to the Q&A Portion.');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Handle Stage 2 → Stage 3
    const handleProceedToMeeting = () => {
        setError(null);
        const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
        if (answeredCount < 5) {
            setError(`Please answer at least 5 or more questions before proceeding (Currently answered: ${answeredCount} / 10).`);
            return;
        }

        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSuccessMessage('Answers recorded! Choose your interview meeting schedule.');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Helper to generate Gmail URLs
    const getEmailUrls = (app: Applicant) => {
        const subject = `SmartMenu Sales Consultant Application Code: ${app.application_code}`;
        const body =
            `Hi WebNegosyo / SmartMenu Team,\n\n` +
            `My name is ${app.full_name}.\n` +
            `Here is my Application Code: ${app.application_code}\n\n` +
            `Scheduled Interview: ${app.meeting_date} at ${app.meeting_time}\n` +
            `Phone: ${app.phone_number}\n` +
            `Email: ${app.email}\n\n` +
            `Thank you!`;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${TARGET_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        return { gmailUrl, mailtoUrl };
    };

    // Handle Final Submission (Stage 3 → Complete)
    const handleCompleteApplication = async () => {
        setError(null);
        if (!meetingDate) {
            setError('Please select a date for your scheduled meeting.');
            return;
        }

        setLoading(true);
        try {
            const result = await submitApplication({
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

            // Automatically open Gmail to send code
            const { gmailUrl, mailtoUrl } = getEmailUrls(result);
            try {
                const opened = window.open(gmailUrl, '_blank');
                if (!opened || opened.closed || typeof opened.closed === 'undefined') {
                    // Fallback to mailto if pop-up blocked
                    window.location.href = mailtoUrl;
                }
            } catch {
                window.location.href = mailtoUrl;
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to complete application. Please try again.');
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
        <div className="min-h-dvh bg-gradient-to-br from-amber-50/70 via-white to-orange-50/60 relative overflow-hidden flex flex-col justify-between p-3 sm:p-6 lg:p-8">
            {/* Ambient Logo-Inspired Light Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
                {/* Golden Sun Radiant Glow (Top-Right) */}
                <div className="absolute -top-24 -right-24 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-gradient-to-br from-amber-300/25 via-orange-400/15 to-transparent rounded-full blur-3xl" />
                
                {/* Crimson Red Brand Glow (Top-Left) */}
                <div className="absolute -top-20 -left-20 w-72 sm:w-[450px] h-72 sm:h-[450px] bg-gradient-to-tr from-rose-500/15 via-red-500/10 to-transparent rounded-full blur-3xl" />

                {/* Warm Sunset Bottom Accent */}
                <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-72 bg-gradient-to-t from-orange-200/20 via-amber-100/10 to-transparent rounded-full blur-3xl" />

                {/* Subtle Geometric Dot Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#f97316_0.75px,transparent_0.75px)] [background-size:24px_24px] opacity-[0.06]" />
            </div>

            {/* Main Content Area */}
            <div className="max-w-4xl w-full mx-auto flex-1 pt-2 sm:pt-4">

                {/* ============================================================== */}
                {/* VIEW 1: HERO HOME PAGE & SLIDESHOW SECTION                   */}
                {/* ============================================================== */}
                {!showApplicationForm ? (
                    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
                        {/* Header Branding */}
                        <div className="text-center">
                            <div className="relative inline-block mb-2 sm:mb-3">
                                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-rose-500 to-orange-500 rounded-3xl blur-xs opacity-25" />
                                <div className="relative p-2 sm:p-3 bg-white rounded-2xl border border-amber-100 shadow-md">
                                    <img 
                                        src="/smartmenu-logo.jpg" 
                                        alt="SmartMenu" 
                                        className="h-12 sm:h-16 w-auto object-contain mx-auto"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 border border-amber-300 text-rose-950 text-[9px] sm:text-xs font-black uppercase tracking-wider shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                    <span>Official Hiring Portal</span>
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-950 uppercase italic">
                                Sales Consultant Career
                            </h1>
                            <p className="text-zinc-600 text-xs sm:text-sm font-bold mt-1 max-w-xl mx-auto">
                                Be part of the team that helps restaurants grow across the Philippines. High commissions, flexible schedule, and full sales training.
                            </p>
                        </div>

                        {/* HERO SLIDESHOW SECTION */}
                        <div className="relative max-w-lg mx-auto">
                            {/* Slide Container */}
                            <div className="relative overflow-hidden rounded-3xl shadow-2xl border-2 border-amber-100/80 bg-white">
                                <AnimatePresence mode="wait">
                                    {currentSlide === 0 && (
                                        /* Slide 1: Official Hiring Poster Image */
                                        <motion.div
                                            key="slide-poster"
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.35 }}
                                            className="w-full aspect-square bg-white flex items-center justify-center p-1 sm:p-2"
                                        >
                                            <img
                                                src="/smartmenu-hiring-banner.jpg"
                                                alt="We're Hiring Sales Consultant - SmartMenu"
                                                className="w-full h-full object-contain rounded-2xl"
                                            />
                                        </motion.div>
                                    )}

                                    {currentSlide === 1 && (
                                        /* Slide 2: Why Work With Us & Benefits */
                                        <motion.div
                                            key="slide-benefits"
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.35 }}
                                            className="w-full aspect-square p-6 sm:p-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-black uppercase tracking-wider mb-3">
                                                    <Award className="w-3.5 h-3.5 text-amber-300" />
                                                    <span>Why Join SmartMenu?</span>
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white mb-4">
                                                    High-Commission Sales Advantage
                                                </h3>

                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3 bg-white/5 border border-white/10 p-3 rounded-xl">
                                                        <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-wide text-white">Lucrative Commission Payouts</h4>
                                                            <p className="text-[11px] text-zinc-300 mt-0.5">Earn uncapped commissions for every closed restaurant subscription.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3 bg-white/5 border border-white/10 p-3 rounded-xl">
                                                        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-wide text-white">100% Remote & Flexible</h4>
                                                            <p className="text-[11px] text-zinc-300 mt-0.5">Call leads and business owners anywhere in the Philippines.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3 bg-white/5 border border-white/10 p-3 rounded-xl">
                                                        <Briefcase className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-wide text-white">Scripts & Training Included</h4>
                                                            <p className="text-[11px] text-zinc-300 mt-0.5">Word-for-word pitches, rebuttal scripts, and direct team guidance.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-amber-300 font-bold uppercase tracking-widest text-center pt-2">
                                                ★ Grow With WebNegosyo & SmartMenu
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentSlide === 2 && (
                                        /* Slide 3: Simple 3-Step Hiring Process */
                                        <motion.div
                                            key="slide-steps"
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.35 }}
                                            className="w-full aspect-square p-6 sm:p-8 bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 text-white flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider mb-3">
                                                    <span>Fast 3-Step Application</span>
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white mb-4">
                                                    How to Get Hired
                                                </h3>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-white/20">
                                                        <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xs shrink-0">1</div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-wide">Upload Profile & Resume</h4>
                                                            <p className="text-[10px] text-amber-100">Quick contact details and photo of your resume.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-white/20">
                                                        <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xs shrink-0">2</div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-wide">10-Question Sales Assessment</h4>
                                                            <p className="text-[10px] text-amber-100">Demonstrate your communication and closing skills.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-white/20">
                                                        <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xs shrink-0">3</div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-wide">Pick Interview Time Slot</h4>
                                                            <p className="text-[10px] text-amber-100">Select 10 AM, 4 PM, or 10 PM and get your code.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-white font-extrabold text-center">
                                                Ready to start? Click "Apply Now" below!
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Left / Right Arrows */}
                                <button
                                    type="button"
                                    onClick={() => setCurrentSlide((prev) => (prev - 1 + 3) % 3)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-xs shadow-md"
                                    aria-label="Previous Slide"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentSlide((prev) => (prev + 1) % 3)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-xs shadow-md"
                                    aria-label="Next Slide"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Slideshow Dots Indicator */}
                            <div className="flex items-center justify-center gap-2 mt-3.5">
                                {[0, 1, 2].map((idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentSlide(idx)}
                                        aria-label={`Go to slide ${idx + 1}`}
                                        className={`transition-all rounded-full ${
                                            currentSlide === idx
                                                ? 'w-8 h-2 bg-gradient-to-r from-red-600 to-amber-500 shadow-xs'
                                                : 'w-2 h-2 bg-zinc-300 hover:bg-zinc-400'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Qualifications Checklist from the Poster */}
                        <div className="max-w-lg mx-auto bg-white/90 backdrop-blur-xs border border-amber-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2.5">
                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-orange-600" />
                                <span>Ideal Candidate Profile</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-amber-600 shrink-0 stroke-[3]" />
                                    <span className="text-xs font-bold text-zinc-800">Strong communication skills</span>
                                </div>
                                <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200/60 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-rose-600 shrink-0 stroke-[3]" />
                                    <span className="text-xs font-bold text-zinc-800">Passion for food industry</span>
                                </div>
                                <div className="p-2.5 bg-orange-50/60 rounded-xl border border-orange-200/60 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-orange-600 shrink-0 stroke-[3]" />
                                    <span className="text-xs font-bold text-zinc-800">Goal-driven, eager to grow</span>
                                </div>
                            </div>
                        </div>

                        {/* BIG "APPLY NOW" BUTTON TO REVEAL FILL-UP FORMS */}
                        <div className="text-center pt-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => {
                                    setShowApplicationForm(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-full sm:w-auto px-8 sm:px-14 py-4 sm:py-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-2xl font-black text-sm sm:text-base uppercase tracking-widest shadow-xl shadow-rose-600/30 transition-all inline-flex items-center justify-center gap-3 cursor-pointer"
                            >
                                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                                <span>Apply Now • Start Application</span>
                                <ArrowRight className="w-5 h-5" />
                            </motion.button>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2.5">
                                Fast 3-Step Process • No password or sign-up needed
                            </p>
                        </div>
                    </div>
                ) : (
                    /* ============================================================== */
                    /* VIEW 2: 3-STAGE MULTI-STEP FILL-UP FORM                       */
                    /* ============================================================== */
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Top Navigation inside form */}
                        <div className="flex items-center justify-between pb-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowApplicationForm(false);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-zinc-700 hover:text-black border border-amber-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4 text-orange-600" />
                                <span>Back to Hiring Overview</span>
                            </button>

                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                                Stage {currentStep} of 3
                            </span>
                        </div>

                        {/* Notifications */}
                        {error && (
                            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl sm:rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in shadow-xs">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0" />
                                <span className="leading-tight">{error}</span>
                            </div>
                        )}
                        {successMessage && (
                            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl sm:rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in shadow-xs">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                                <span className="leading-tight">{successMessage}</span>
                            </div>
                        )}

                        {/* Progress Stepper Bar */}
                        <div className="bg-white/90 backdrop-blur-xs border border-amber-100/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm mb-4 sm:mb-6">
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                {[
                                    { num: 1, label: 'Profile', sub: 'Details', desc: 'Basic Info & Resume' },
                                    { num: 2, label: 'Q&A', sub: '10 Qs', desc: '10 Sales Assessment Questions' },
                                    { num: 3, label: 'Schedule', sub: 'Meeting', desc: '10 AM / 4 PM / 10 PM' }
                                ].map((step) => {
                                    const isDone = currentStep > step.num || isCompleted;
                                    const isCurrent = currentStep === step.num && !isCompleted;
                                    return (
                                        <div
                                            key={step.num}
                                            className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all ${
                                                isCurrent
                                                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white border-transparent shadow-md shadow-rose-600/20'
                                                    : isDone
                                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                                    : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-black shrink-0 ${
                                                    isCurrent ? 'bg-white text-rose-600' : isDone ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                                                }`}>
                                                    {isDone ? <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : step.num}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider truncate leading-tight">
                                                        <span className="sm:hidden">{step.label}</span>
                                                        <span className="hidden sm:inline">{step.label} {step.sub}</span>
                                                    </p>
                                                    <p className={`text-[7px] sm:text-[8px] truncate hidden md:block ${isCurrent ? 'text-amber-100' : 'text-zinc-400'}`}>
                                                        {step.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ===== STAGE 1: APPLICANT PROFILE FORM ===== */}
                        {currentStep === 1 && (
                            <div className="max-w-xl mx-auto bg-white/95 backdrop-blur-xs border border-amber-100/90 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 md:p-10 shadow-xl shadow-orange-500/5">
                                <form onSubmit={handleProceedToQA} className="space-y-3.5 sm:space-y-4">
                                    <div className="border-b border-amber-100/80 pb-2.5 sm:pb-3 mb-2 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900">
                                                Stage 1: Applicant Profile
                                            </h3>
                                            <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium">
                                                Fill in your basic information and upload your resume image to get started.
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 hidden sm:inline-block">
                                            Step 1 of 3
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                            Full Name *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Juan Dela Cruz"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                            />
                                            <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                                Email Address *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="juan@gmail.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                                />
                                                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                                Phone / Mobile Number *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    required
                                                    placeholder="0912 345 6789"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                                />
                                                <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* RESUME IMAGE UPLOAD SECTION */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                                                <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                                                Resume (Upload Image / Photo) *
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setUseManualLink(!useManualLink)}
                                                className="text-[9px] font-bold text-orange-600 hover:text-orange-700 underline"
                                            >
                                                {useManualLink ? 'Switch to Image Upload' : 'Or paste a link instead'}
                                            </button>
                                        </div>

                                        {!useManualLink ? (
                                            /* Image File Uploader */
                                            <div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                    id="resume-image-input"
                                                />

                                                {resumeLink && resumeLink.startsWith('data:image/') ? (
                                                    /* Image Preview Card */
                                                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-amber-200 shrink-0 shadow-xs">
                                                                <img
                                                                    src={resumeLink}
                                                                    alt="Resume Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                                    <p className="font-black text-xs text-zinc-900 truncate">
                                                                        {resumeFileName || 'resume-photo.jpg'}
                                                                    </p>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                                                                    Image attached • {resumeFileSize || 'Ready'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                            >
                                                                Change
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleRemoveImage}
                                                                title="Remove resume image"
                                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Upload Dropzone / Button */
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="border-2 border-dashed border-amber-200 hover:border-rose-400 bg-amber-50/30 hover:bg-amber-50/60 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all group"
                                                    >
                                                        {uploadingImage ? (
                                                            <div className="flex flex-col items-center gap-2 py-2">
                                                                <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-600 rounded-full animate-spin" />
                                                                <span className="text-xs font-bold text-zinc-600">Processing photo...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <div className="w-10 h-10 rounded-full bg-white border border-amber-200 flex items-center justify-center text-rose-600 shadow-2xs group-hover:scale-105 transition-transform">
                                                                    <UploadCloud className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-extrabold text-xs text-zinc-900">
                                                                        Click to upload a photo of your Resume
                                                                    </p>
                                                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                                                        Supports JPG, PNG, WebP (camera photo or screenshot)
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Manual Link Input Alternative */
                                            <div className="relative">
                                                <input
                                                    type="url"
                                                    required={useManualLink}
                                                    placeholder="https://drive.google.com/... o LinkedIn"
                                                    value={resumeLink}
                                                    onChange={(e) => setResumeLink(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                                />
                                                <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                            Facebook Profile Link *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://facebook.com/yourprofile"
                                                value={fbLink}
                                                onChange={(e) => setFbLink(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                            />
                                            <Facebook className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                            Other Social Media Accounts (LinkedIn, TikTok, IG, etc.)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="e.g. LinkedIn: ... / TikTok: @handle"
                                                value={otherSocials}
                                                onChange={(e) => setOtherSocials(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                            />
                                            <Share2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full mt-3 sm:mt-4 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>Proceed to Stage 2 (Q&A)</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ===== STAGE 2: 10 ENGLISH QUESTIONS AND ANSWERS ===== */}
                        {currentStep === 2 && (
                            <div className="bg-white/95 backdrop-blur-xs border border-amber-100/90 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-xl shadow-orange-500/5 space-y-5 sm:space-y-6">
                                <div className="border-b border-amber-100/80 pb-3 sm:pb-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-600">
                                                Assessment Stage
                                            </span>
                                            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-950">
                                                Stage 2: Question & Answer Assessment
                                            </h3>
                                        </div>
                                        <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] sm:text-xs font-bold text-amber-900">
                                            {Object.keys(answers).filter(k => answers[k]?.trim()).length} of 10 Answered
                                        </div>
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-zinc-500 mt-1">
                                        10 practical questions about your sales experience, mindset, and call handling scenarios. Please answer thoroughly in English or Taglish.
                                    </p>
                                </div>

                                <div className="space-y-4 sm:space-y-6">
                                    {SALES_QUESTIONS.map((q, idx) => (
                                        <div
                                            key={q.id}
                                            className="bg-zinc-50/80 border border-amber-100/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-2 sm:space-y-2.5 transition-all hover:border-amber-300 hover:shadow-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                    q.category === 'personal'
                                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                                                }`}>
                                                    {q.badge}
                                                </span>
                                                <span className="text-[9px] font-bold text-zinc-400">
                                                    Q#{idx + 1}
                                                </span>
                                            </div>

                                            <p className="font-extrabold text-xs sm:text-sm text-zinc-900 leading-snug">
                                                {q.question}
                                            </p>
                                            <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium italic">
                                                💡 Tip: {q.hint}
                                            </p>

                                            <textarea
                                                rows={3}
                                                placeholder="Type your answer here..."
                                                value={answers[q.id] || ''}
                                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                className="w-full p-2.5 sm:p-3 bg-white border border-zinc-200 rounded-xl font-medium text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all resize-y min-h-[70px] sm:min-h-[80px]"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-3 sm:pt-4 border-t border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setCurrentStep(1); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="text-xs font-bold text-zinc-600 hover:text-black py-1.5 self-start sm:self-auto cursor-pointer"
                                    >
                                        ← Edit Profile Details
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleProceedToMeeting}
                                        className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>Save & Choose Meeting Slot</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ===== STAGE 3: SCHEDULE INTERVIEW MEETING ===== */}
                        {currentStep === 3 && (
                            <div className="bg-white/95 backdrop-blur-xs border border-amber-100/90 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-xl shadow-orange-500/5 space-y-5 sm:space-y-6">
                                <div className="border-b border-amber-100/80 pb-3 sm:pb-4">
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-600">
                                        Final Stage
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-950">
                                        Stage 3: Interview & Meeting Schedule
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-zinc-500 mt-1">
                                        Choose one of the 3 time slots for your 1-on-1 interview via Google Meet or Phone Call.
                                    </p>
                                </div>

                                {/* Date Selection */}
                                <div className="space-y-1.5 max-w-sm">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-orange-600" />
                                        Meeting Date
                                    </label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={meetingDate}
                                        onChange={(e) => setMeetingDate(e.target.value)}
                                        className="w-full px-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                                    />
                                </div>

                                {/* 3 Schedule Choices */}
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                                        Meeting Time Slot (3 Choices)
                                    </span>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                                        {[
                                            {
                                                time: '10:00 AM' as const,
                                                label: 'Morning Slot',
                                                tag: '🌅 Morning',
                                                desc: 'Ideal for early briefing and live Q&A orientation.'
                                            },
                                            {
                                                time: '4:00 PM' as const,
                                                label: 'Afternoon Slot',
                                                tag: '☀️ Afternoon',
                                                desc: 'Great for a mid-day discussion before wrapping up the day.'
                                            },
                                            {
                                                time: '10:00 PM' as const,
                                                label: 'Evening Slot',
                                                tag: '🌙 Evening',
                                                desc: 'For night owls or applicants with daytime commitments.'
                                            }
                                        ].map((slot) => {
                                            const isSelected = meetingTime === slot.time;
                                            return (
                                                <button
                                                    key={slot.time}
                                                    type="button"
                                                    onClick={() => setMeetingTime(slot.time)}
                                                    className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all relative cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white border-amber-400 shadow-xl shadow-orange-950/20 scale-[1.01] sm:scale-[1.02]'
                                                            : 'bg-white hover:bg-amber-50/40 border-amber-100 text-zinc-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                            isSelected ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-amber-100/80 text-amber-900'
                                                        }`}>
                                                            {slot.tag}
                                                        </span>
                                                        {isSelected && (
                                                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white flex items-center justify-center">
                                                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h4 className="text-lg sm:text-xl font-black tracking-tight">{slot.time}</h4>
                                                    <p className={`text-[9px] sm:text-[10px] font-bold mt-0.5 ${isSelected ? 'text-amber-200' : 'text-zinc-500'}`}>
                                                        {slot.label}
                                                    </p>
                                                    <p className={`text-[8px] sm:text-[9px] mt-1.5 leading-relaxed ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                        {slot.desc}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-3 sm:pt-4 border-t border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setCurrentStep(2); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="text-xs font-bold text-zinc-600 hover:text-black py-1.5 self-start sm:self-auto cursor-pointer"
                                    >
                                        ← Back to Q&A Assessment
                                    </button>

                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={handleCompleteApplication}
                                        className="w-full sm:w-auto px-6 sm:px-8 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-98 shadow-lg shadow-rose-600/25 disabled:opacity-30 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 text-amber-200" />
                                                <span>Confirm Meeting & Send Code via Gmail</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== COMPLETION MODAL WITH GENERATED CODE - Automatic Gmail Redirect ===== */}
            <AnimatePresence>
                {showCompletionModal && completedApplicant?.application_code && (() => {
                    const { gmailUrl, mailtoUrl } = getEmailUrls(completedApplicant);
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-amber-100 p-5 sm:p-8 max-w-lg w-full max-h-[92dvh] overflow-y-auto shadow-2xl relative"
                            >
                                {/* SmartMenu Sun & Red Gradient Bar */}
                                <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-amber-400 via-red-500 to-rose-600" />

                                <div className="text-center space-y-1.5 sm:space-y-2 mt-1">
                                    <div className="inline-block p-1.5 bg-white rounded-2xl border border-amber-100 shadow-xs mb-1">
                                        <img 
                                            src="/smartmenu-logo.jpg" 
                                            alt="SmartMenu Logo" 
                                            className="h-10 sm:h-12 w-auto object-contain mx-auto"
                                        />
                                    </div>
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-100 to-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border border-amber-200">
                                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <span className="text-[8px] sm:text-[9px] font-black text-rose-700 uppercase tracking-[0.25em] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                        Application Complete
                                    </span>
                                    <h3 className="text-lg sm:text-2xl font-black tracking-tight text-zinc-950">
                                        Mabuhay, {completedApplicant.full_name}!
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-relaxed">
                                        Natanggap na ang iyong SmartMenu Sales Consultant Application at napili ang interview schedule.
                                    </p>
                                </div>

                                {/* Meeting Recap Box */}
                                <div className="mt-3.5 sm:mt-4 p-2.5 sm:p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl sm:rounded-2xl flex items-center justify-between text-xs">
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Scheduled Meeting</span>
                                        <span className="font-bold text-zinc-900 text-[11px] sm:text-xs">{completedApplicant.meeting_date}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Time Slot</span>
                                        <span className="font-black text-rose-600 text-[11px] sm:text-xs">{completedApplicant.meeting_time}</span>
                                    </div>
                                </div>

                                {/* Prominent Generated Code Box */}
                                <div className="mt-3 sm:mt-4 p-3.5 sm:p-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white rounded-xl sm:rounded-2xl text-center space-y-1.5 sm:space-y-2 relative overflow-hidden shadow-xl border border-amber-400/30">
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-amber-300">
                                        Ang Iyong Generated Code
                                    </p>
                                    <div className="text-xl sm:text-3xl font-black font-mono tracking-widest text-amber-400 py-0.5 sm:py-1 drop-shadow-sm">
                                        {completedApplicant.application_code}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyCode}
                                        className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-white/10"
                                    >
                                        {copiedCode ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                                    </button>
                                </div>

                                {/* Instruction Alert: Send to webnegosyo3@gmail.com */}
                                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-amber-50/90 border border-amber-200 rounded-xl sm:rounded-2xl space-y-2.5 text-xs">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-black text-amber-950 uppercase tracking-wide text-[9px] sm:text-[10px]">
                                                Mahalagang Hakbang:
                                            </p>
                                            <p className="text-amber-900 font-medium leading-relaxed mt-0.5 text-[10px] sm:text-xs">
                                                I-send ang iyong code na <strong className="font-mono">{completedApplicant.application_code}</strong> sa email na ito para ma-confirm ang interview:
                                            </p>
                                        </div>
                                    </div>

                                    {/* Email display & copy */}
                                    <div className="flex items-center justify-between bg-white border border-amber-200 p-2 sm:p-2.5 rounded-xl">
                                        <span className="font-mono font-bold text-zinc-900 text-xs sm:text-sm">
                                            {TARGET_EMAIL}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyEmail}
                                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-lg text-[9px] font-bold transition-all border border-amber-200"
                                        >
                                            {copiedEmail ? 'Copied!' : 'Copy Email'}
                                        </button>
                                    </div>

                                    {/* Direct Action Buttons for Gmail */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        <a
                                            href={gmailUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-98"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Open in Gmail (Web)</span>
                                            <ExternalLink className="w-3 h-3 opacity-80" />
                                        </a>

                                        <a
                                            href={mailtoUrl}
                                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-black hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-98"
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>Open Default Mail App</span>
                                        </a>
                                    </div>
                                </div>

                                <div className="mt-4 sm:mt-5">
                                    <button
                                        type="button"
                                        onClick={() => setShowCompletionModal(false)}
                                        className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Isara (Close Window)
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Footer */}
            <div className="text-center py-3 sm:py-4 mt-6 sm:mt-8 border-t border-amber-200/50">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-500">
                    SmartMenu & WebNegosyo Recruitment 2026
                </p>
            </div>
        </div>
    );
};
