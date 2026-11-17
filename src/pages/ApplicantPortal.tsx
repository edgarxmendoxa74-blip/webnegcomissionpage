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
    ChevronRight
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
    const [error, setError] = useState<string | null>(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completedApplicant, setCompletedApplicant] = useState<Applicant | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const isCompleted = !!completedApplicant;

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
            const compressed = await compressImage(file);
            setResumeLink(compressed);
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

    // Stage 1 → Stage 2
    const handleProceedToQA = (e: React.FormEvent) => {
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

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Stage 2 → Stage 3
    const handleProceedToMeeting = () => {
        setError(null);
        const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
        if (answeredCount < 5) {
            setError(`Please answer at least 5 questions (${answeredCount}/10 answered).`);
            return;
        }

        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Generate Gmail URLs
    const getEmailUrls = (app: Applicant) => {
        const subject = `SmartMenu Sales Consultant Application Code: ${app.application_code}`;
        const body =
            `Hi WebNegosyo / SmartMenu Team,\n\n` +
            `My name is ${app.full_name}.\n` +
            `Application Code: ${app.application_code}\n\n` +
            `Scheduled Interview: ${app.meeting_date} at ${app.meeting_time}\n` +
            `Phone: ${app.phone_number}\n` +
            `Email: ${app.email}\n\n` +
            `Thank you!`;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${TARGET_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        return { gmailUrl, mailtoUrl };
    };

    // Stage 3 → Submit & Redirect
    const handleCompleteApplication = async () => {
        setError(null);
        if (!meetingDate) {
            setError('Please choose a meeting date.');
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

            // Automatically open Gmail
            const { gmailUrl, mailtoUrl } = getEmailUrls(result);
            try {
                const opened = window.open(gmailUrl, '_blank');
                if (!opened || opened.closed || typeof opened.closed === 'undefined') {
                    window.location.href = mailtoUrl;
                }
            } catch {
                window.location.href = mailtoUrl;
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

                {/* ============================================================== */}
                {/* VIEW 1: HERO HOME PAGE (POSTER & DIRECT APPLY BUTTON)          */}
                {/* ============================================================== */}
                {!showApplicationForm ? (
                    <div className="space-y-3 sm:space-y-4 text-center animate-in fade-in duration-200">
                        {/* Compact Top Header Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-amber-200/80 shadow-2xs">
                            <img src="/smartmenu-logo.jpg" alt="SmartMenu" className="h-4 w-auto object-contain" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-800">
                                SmartMenu Careers
                            </span>
                        </div>

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
                                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                            Other Socials (Optional)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="e.g. TikTok, LinkedIn, IG"
                                                value={otherSocials}
                                                onChange={(e) => setOtherSocials(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                            />
                                            <Share2 className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full mt-2 py-3 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Continue to Q&A</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ===== STAGE 2: Q&A (CLEAN & LESS TEXT) ===== */}
                        {currentStep === 2 && (
                            <div className="bg-white/95 border border-amber-100 rounded-2xl p-3.5 sm:p-5 shadow-md shadow-orange-500/5 space-y-3">
                                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                        Sales Assessment
                                    </h3>
                                    <span className="text-[10px] font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {Object.keys(answers).filter(k => answers[k]?.trim()).length}/10 answered
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {SALES_QUESTIONS.map((q, idx) => (
                                        <div
                                            key={q.id}
                                            className="bg-zinc-50/90 border border-zinc-200/80 rounded-xl p-3 space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                                    {q.badge}
                                                </span>
                                                <span className="text-[9px] font-bold text-zinc-400">
                                                    #{idx + 1}
                                                </span>
                                            </div>

                                            <p className="font-extrabold text-xs text-zinc-900 leading-snug">
                                                {q.question}
                                            </p>

                                            <textarea
                                                rows={2}
                                                placeholder="Your answer..."
                                                value={answers[q.id] || ''}
                                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:border-red-500 resize-y min-h-[56px]"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 flex items-center justify-between gap-2">
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
                            <div className="bg-white/95 border border-amber-100 rounded-2xl p-4 sm:p-5 shadow-md shadow-orange-500/5 space-y-3.5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 pb-1.5 border-b border-zinc-100">
                                    Select Meeting Schedule
                                </h3>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-orange-600" />
                                        <span>Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={meetingDate}
                                        onChange={(e) => setMeetingDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-600" />
                                        <span>Time Slot</span>
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
                                                            ? 'bg-zinc-950 text-white border-amber-400 shadow-md'
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

                                <div className="pt-2 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="text-xs font-bold text-zinc-600 py-1"
                                    >
                                        ← Q&A
                                    </button>

                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={handleCompleteApplication}
                                        className="px-5 py-3 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                                <span>Confirm & Send Code</span>
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
                    const { gmailUrl } = getEmailUrls(completedApplicant);
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl border border-amber-100 p-4 sm:p-6 max-w-sm w-full shadow-2xl relative text-center space-y-3"
                            >
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className="text-base font-black text-zinc-950">
                                        Application Submitted!
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        {completedApplicant.meeting_date} at {completedApplicant.meeting_time}
                                    </p>
                                </div>

                                {/* Code Box */}
                                <div className="p-3 bg-zinc-950 text-white rounded-xl space-y-1">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-300 block">
                                        Your Code
                                    </span>
                                    <div className="text-xl font-black font-mono text-amber-400">
                                        {completedApplicant.application_code}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyCode}
                                        className="text-[9px] font-bold text-zinc-300 hover:text-white underline pt-0.5"
                                    >
                                        {copiedCode ? '✓ Copied' : 'Copy Code'}
                                    </button>
                                </div>

                                {/* Instructions */}
                                <div className="p-2.5 bg-amber-50 rounded-xl text-left text-xs space-y-2">
                                    <p className="text-[10px] text-amber-900 font-bold leading-tight">
                                        Send code to <strong className="font-mono">{TARGET_EMAIL}</strong> to confirm interview.
                                    </p>

                                    <div className="grid grid-cols-2 gap-1.5">
                                        <a
                                            href={gmailUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="py-2 px-2 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase text-center flex items-center justify-center gap-1 shadow-xs"
                                        >
                                            <Send className="w-3 h-3" />
                                            <span>Open Gmail</span>
                                        </a>

                                        <button
                                            type="button"
                                            onClick={handleCopyEmail}
                                            className="py-2 px-2 bg-white border border-amber-200 text-amber-950 rounded-lg text-[9px] font-black uppercase text-center"
                                        >
                                            {copiedEmail ? '✓ Copied' : 'Copy Email'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowCompletionModal(false)}
                                    className="w-full py-2 bg-zinc-100 text-zinc-800 rounded-lg text-xs font-bold"
                                >
                                    Close
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
