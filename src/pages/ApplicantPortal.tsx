import React, { useState } from 'react';
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
    ArrowLeft,
    ArrowRight,
    Send,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApplicantPortalProps {
    onBackToSelection?: () => void;
}

export const ApplicantPortal: React.FC<ApplicantPortalProps> = ({ onBackToSelection }) => {
    // Current step: 1 = Profile, 2 = Q&A, 3 = Meeting
    const [currentStep, setCurrentStep] = useState(1);

    // Stage 1: Profile Info
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [resumeLink, setResumeLink] = useState('');
    const [fbLink, setFbLink] = useState('');
    const [otherSocials, setOtherSocials] = useState('');

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

    // Handle Stage 1 → Stage 2
    const handleProceedToQA = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!fullName.trim() || !email.trim() || !phoneNumber.trim()) {
            setError('Pakipunan ang lahat ng mahahalagang fields (Pangalan, Email, Phone Number).');
            return;
        }
        if (!resumeLink.trim()) {
            setError('Pakilagay ang link ng iyong Resume (Google Drive, LinkedIn, o Portfolio).');
            return;
        }
        if (!fbLink.trim()) {
            setError('Pakilagay ang link ng iyong Facebook profile para sa pag-verify.');
            return;
        }

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSuccessMessage('Na-save ang iyong profile! Magpatuloy sa Q&A Portion.');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Handle Stage 2 → Stage 3
    const handleProceedToMeeting = () => {
        setError(null);
        const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
        if (answeredCount < 5) {
            setError(`Pakisagutan ang kahit 5 o higit pang katanungan bago magpatuloy (Kasalukuyang nasagutan: ${answeredCount} / 10).`);
            return;
        }

        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSuccessMessage('Naitala ang iyong mga sagot! Pumili ng schedule para sa iyong meeting.');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Handle Final Submission (Stage 3 → Complete)
    const handleCompleteApplication = async () => {
        setError(null);
        if (!meetingDate) {
            setError('Pumili ng petsa para sa iyong scheduled meeting.');
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
        } catch (err: any) {
            setError(err?.message || 'Nabigong kumpletuhin ang application. Pakisubukang muli.');
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
        navigator.clipboard.writeText('webnegosyp@gmail.com');
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const isCompleted = !!completedApplicant;

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

            {/* Top Navigation Bar */}
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-1 mb-4 sm:mb-6">
                <button
                    type="button"
                    onClick={() => {
                        if (onBackToSelection) {
                            onBackToSelection();
                        } else {
                            window.location.href = '/';
                        }
                    }}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-zinc-700 hover:text-black bg-white/80 hover:bg-white border border-amber-200/70 hover:border-amber-400 shadow-2xs transition-all active:scale-95 backdrop-blur-xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                    <span>Back to Home</span>
                </button>
            </div>

            {/* Main Container */}
            <div className="max-w-4xl w-full mx-auto flex-1">
                {/* SmartMenu Branding & Header Banner */}
                <div className="text-center mb-5 sm:mb-8">
                    {/* Glowing Logo Card Container */}
                    <div className="relative inline-block mb-3">
                        <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-orange-500 rounded-3xl blur-xs opacity-25" />
                        <div className="relative p-2.5 sm:p-3.5 bg-white rounded-2xl sm:rounded-3xl border border-amber-100/80 shadow-lg shadow-orange-500/5">
                            <img 
                                src="/smartmenu-logo.jpg" 
                                alt="SmartMenu - Growing Restaurants. Together." 
                                className="h-16 sm:h-20 md:h-24 w-auto object-contain mx-auto"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 border border-amber-300 text-rose-950 text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>Sales Consultant Careers</span>
                        </span>
                    </div>

                    <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950">
                        SmartMenu Hiring Portal
                    </h1>
                    <p className="text-zinc-600 text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] mt-0.5">
                        High-Commission Remote Sales Program • WebNegosyo
                    </p>
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

                {/* Progress Stepper Bar - Styled with SmartMenu Brand Theme */}
                <div className="bg-white/90 backdrop-blur-xs border border-amber-100/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm mb-4 sm:mb-6">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {[
                            { num: 1, label: 'Profile', sub: 'Details', desc: 'Basic Info & Socials' },
                            { num: 2, label: 'Q&A', sub: '10 Qs', desc: '10 Sales Questions' },
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
                                        Mag-fill up ng iyong impormasyon para makapagsimula sa hiring process.
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
                                        placeholder="Hal. Juan Dela Cruz"
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

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                    Resume Link (Google Drive / Portfolio URL) *
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://drive.google.com/... o LinkedIn"
                                        value={resumeLink}
                                        onChange={(e) => setResumeLink(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                    />
                                    <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-[8px] text-zinc-400">Siguraduhing naka-"Anyone with the link can view" ang iyong Google Drive link.</p>
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
                                        placeholder="Hal. LinkedIn: ... / TikTok: @handle"
                                        value={otherSocials}
                                        onChange={(e) => setOtherSocials(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                    />
                                    <Share2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-3 sm:mt-4 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                                <span>Proceed to Stage 2 (Q&A)</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}

                {/* ===== STAGE 2: 10 QUESTIONS AND ANSWERS ===== */}
                {currentStep === 2 && (
                    <div className="bg-white/95 backdrop-blur-xs border border-amber-100/90 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-xl shadow-orange-500/5 space-y-5 sm:space-y-6">
                        <div className="border-b border-amber-100/80 pb-3 sm:pb-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-600">
                                        Assessment Stage
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-950">
                                        Stage 2: Question & Answer Portion
                                    </h3>
                                </div>
                                <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] sm:text-xs font-bold text-amber-900">
                                    {Object.keys(answers).filter(k => answers[k]?.trim()).length} of 10 Answered
                                </div>
                            </div>
                            <p className="text-[11px] sm:text-xs text-zinc-500 mt-1">
                                May 10 katanungan tungkol sa iyong sarili at mga practical na sitwasyon sa sales call. Sagutan nang tapat at detalyado.
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
                                        placeholder="I-type dito ang iyong sagot..."
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
                                className="text-xs font-bold text-zinc-600 hover:text-black py-1.5 self-start sm:self-auto"
                            >
                                ← Edit Profile Details
                            </button>

                            <button
                                type="button"
                                onClick={handleProceedToMeeting}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
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
                                Pumili ng isa sa 3 schedule slots para sa iyong 1-on-1 interview via Google Meet o Phone Call.
                            </p>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-1.5 max-w-sm">
                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                                Piliin ang Araw ng Meeting
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
                                Piliin ang Oras ng Meeting (3 Choices)
                            </span>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                                {[
                                    {
                                        time: '10:00 AM' as const,
                                        label: 'Morning Slot',
                                        tag: '🌅 Umaga',
                                        desc: 'Perpekto para sa maagang briefing at Q&A session.'
                                    },
                                    {
                                        time: '4:00 PM' as const,
                                        label: 'Afternoon Slot',
                                        tag: '☀️ Hapon',
                                        desc: 'Mainam para sa hapon bago matapos ang araw.'
                                    },
                                    {
                                        time: '10:00 PM' as const,
                                        label: 'Evening Slot',
                                        tag: '🌙 Gabi',
                                        desc: 'Para sa mga may daytime commitment o night owl sales reps.'
                                    }
                                ].map((slot) => {
                                    const isSelected = meetingTime === slot.time;
                                    return (
                                        <button
                                            key={slot.time}
                                            type="button"
                                            onClick={() => setMeetingTime(slot.time)}
                                            className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all relative ${
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
                                className="text-xs font-bold text-zinc-600 hover:text-black py-1.5 self-start sm:self-auto"
                            >
                                ← Balikan ang Q&A Stage
                            </button>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleCompleteApplication}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:via-rose-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-98 shadow-lg shadow-rose-600/25 disabled:opacity-30 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 text-amber-200" />
                                        <span>Confirm Meeting & Get Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== COMPLETION MODAL WITH GENERATED CODE - Branded & Mobile-Optimized ===== */}
            <AnimatePresence>
                {showCompletionModal && completedApplicant?.application_code && (
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

                            {/* Instruction Alert: Send to webnegosyp */}
                            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-amber-50/90 border border-amber-200 rounded-xl sm:rounded-2xl space-y-2 text-xs">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-black text-amber-950 uppercase tracking-wide text-[9px] sm:text-[10px]">
                                            Mahalagang Hakbang:
                                        </p>
                                        <p className="text-amber-900 font-medium leading-relaxed mt-0.5 text-[10px] sm:text-xs">
                                            I-send ang code na <strong className="font-mono">{completedApplicant.application_code}</strong> sa email na ito para ma-confirm ang interview:
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-amber-200 p-2 sm:p-2.5 rounded-xl gap-2">
                                    <span className="font-mono font-bold text-zinc-900 text-[11px] sm:text-xs break-all">
                                        webnegosyp@gmail.com
                                    </span>
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={handleCopyEmail}
                                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-lg text-[9px] font-bold transition-all border border-amber-200"
                                        >
                                            {copiedEmail ? 'Copied!' : 'Copy Email'}
                                        </button>
                                        <a
                                            href={`mailto:webnegosyp@gmail.com?subject=SmartMenu%20Sales%20Consultant%20Application%20Code:%20${completedApplicant.application_code}&body=Hi%20WebNegosyo%20/%20SmartMenu%20Team,%0D%0A%0D%0AAng%20aking%20pangalan%20ay%20${encodeURIComponent(completedApplicant.full_name)}.%0D%0AIto%20po%20ang%20aking%20Application%20Code:%20${completedApplicant.application_code}%0D%0AScheduled%20Meeting:%20${completedApplicant.meeting_date}%20at%20${completedApplicant.meeting_time}%0D%0APhone:%20${completedApplicant.phone_number}%0D%0A%0D%0ASalamat%20po!`}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-xs"
                                        >
                                            <Send className="w-3 h-3" />
                                            <span>Send Now</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 sm:mt-5">
                                <button
                                    type="button"
                                    onClick={() => setShowCompletionModal(false)}
                                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                    Isara (Close Window)
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
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
