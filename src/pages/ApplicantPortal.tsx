import React, { useState } from 'react';
import {
    LogoMark
} from '../components/Logo';
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
    onBackToSelection: () => void;
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
        <div className="min-h-dvh bg-zinc-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
            {/* Top Navigation Bar */}
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 mb-6">
                <button
                    type="button"
                    onClick={onBackToSelection}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-200/60 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Portal Selection</span>
                </button>
            </div>

            {/* Main Container */}
            <div className="max-w-4xl w-full mx-auto flex-1">
                {/* Header Banner */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-black rounded-2xl mb-3 shadow-lg shadow-black/10">
                        <LogoMark className="h-10 w-auto text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-black">
                        Sales Consultant Careers
                    </h1>
                    <p className="text-zinc-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] mt-1">
                        WebNegosyo High-Commission Hiring Portal
                    </p>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Progress Stepper Bar */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { num: 1, label: 'Profile Details', desc: 'Basic Info & Socials' },
                            { num: 2, label: 'Q&A Assessment', desc: '10 Sales Questions' },
                            { num: 3, label: 'Meeting Slot', desc: '10 AM / 4 PM / 10 PM' }
                        ].map((step) => {
                            const isDone = currentStep > step.num || isCompleted;
                            const isCurrent = currentStep === step.num && !isCompleted;
                            return (
                                <div
                                    key={step.num}
                                    className={`p-2.5 rounded-xl border transition-all ${
                                        isCurrent
                                            ? 'bg-black text-white border-black shadow-sm'
                                            : isDone
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                            isCurrent ? 'bg-white text-black' : isDone ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                                        }`}>
                                            {isDone ? <Check className="w-3 h-3" /> : step.num}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider truncate leading-tight">
                                                {step.label}
                                            </p>
                                            <p className={`text-[8px] truncate hidden sm:block ${isCurrent ? 'text-zinc-300' : 'text-zinc-400'}`}>
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
                    <div className="max-w-xl mx-auto bg-white border border-zinc-200 rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5">
                        <form onSubmit={handleProceedToQA} className="space-y-4">
                            <div className="border-b border-zinc-100 pb-3 mb-2">
                                <h3 className="text-sm font-black uppercase tracking-wider text-black">
                                    Stage 1: Applicant Profile
                                </h3>
                                <p className="text-[10px] text-zinc-400 font-medium">
                                    Mag-fill up ng iyong impormasyon para makapagsimula sa hiring process.
                                </p>
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
                                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black transition-all"
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
                                            className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black transition-all"
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
                                            className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black transition-all"
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
                                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black transition-all"
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
                                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black transition-all"
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
                                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black transition-all"
                                    />
                                    <Share2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                                <span>Proceed to Stage 2 (Q&A)</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}

                {/* ===== STAGE 2: 10 QUESTIONS AND ANSWERS ===== */}
                {currentStep === 2 && (
                    <div className="bg-white border border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="border-b border-zinc-100 pb-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                        Assessment Stage
                                    </span>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-black">
                                        Stage 2: Question & Answer Portion
                                    </h3>
                                </div>
                                <div className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-700">
                                    {Object.keys(answers).filter(k => answers[k]?.trim()).length} of 10 Answered
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                                May 10 katanungan tungkol sa iyong sarili at mga practical na sitwasyon sa sales call. Sagutan nang tapat at detalyado.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {SALES_QUESTIONS.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="bg-zinc-50/80 border border-zinc-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 transition-all hover:border-zinc-300"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                            q.category === 'personal'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            {q.badge}
                                        </span>
                                        <span className="text-[9px] font-bold text-zinc-400">
                                            Q#{idx + 1}
                                        </span>
                                    </div>

                                    <p className="font-extrabold text-sm text-black leading-snug">
                                        {q.question}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 font-medium italic">
                                        💡 Tip: {q.hint}
                                    </p>

                                    <textarea
                                        rows={3}
                                        placeholder="I-type dito ang iyong sagot..."
                                        value={answers[q.id] || ''}
                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                        className="w-full p-3 bg-white border border-zinc-200 rounded-xl font-medium text-xs outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all resize-y min-h-[80px]"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => { setCurrentStep(1); setError(null); }}
                                className="text-xs font-bold text-zinc-500 hover:text-black py-2"
                            >
                                ← Edit Profile Details
                            </button>

                            <button
                                type="button"
                                onClick={handleProceedToMeeting}
                                className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                                <span>I-save ang Sagot at Pumili ng Meeting Slot</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== STAGE 3: SCHEDULE INTERVIEW MEETING ===== */}
                {currentStep === 3 && (
                    <div className="bg-white border border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="border-b border-zinc-100 pb-4">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                Final Stage
                            </span>
                            <h3 className="text-lg font-black uppercase tracking-tight text-black">
                                Stage 3: Interview & Meeting Schedule
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1">
                                Pumili ng isa sa 3 schedule slots para sa iyong 1-on-1 interview via Google Meet o Phone Call.
                            </p>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-1.5 max-w-sm">
                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-black" />
                                Piliin ang Araw ng Meeting
                            </label>
                            <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black"
                            />
                        </div>

                        {/* 3 Schedule Choices */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-black" />
                                Piliin ang Oras ng Meeting (3 Choices)
                            </span>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                                            className={`p-4 rounded-2xl border text-left transition-all relative ${
                                                isSelected
                                                    ? 'bg-black text-white border-black shadow-lg shadow-black/10 scale-[1.02]'
                                                    : 'bg-zinc-50 hover:bg-white border-zinc-200 text-zinc-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                    isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                                                }`}>
                                                    {slot.tag}
                                                </span>
                                                {isSelected && (
                                                    <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>
                                                )}
                                            </div>

                                            <h4 className="text-xl font-black tracking-tight">{slot.time}</h4>
                                            <p className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                {slot.label}
                                            </p>
                                            <p className={`text-[9px] mt-2 leading-relaxed ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>
                                                {slot.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => { setCurrentStep(2); setError(null); }}
                                className="text-xs font-bold text-zinc-500 hover:text-black py-2"
                            >
                                ← Balikan ang Q&A Stage
                            </button>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleCompleteApplication}
                                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-98 shadow-lg shadow-emerald-600/20 disabled:opacity-30 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                        <span>I-confirm ang Meeting at Kunin ang Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== COMPLETION MODAL WITH GENERATED CODE ===== */}
            <AnimatePresence>
                {showCompletionModal && completedApplicant?.application_code && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] border border-zinc-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Confetti decoration bar */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-600" />

                            <div className="text-center space-y-2 mt-2">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.25em] bg-emerald-50 px-3 py-1 rounded-full">
                                    Application Complete
                                </span>
                                <h3 className="text-2xl font-black tracking-tight text-black">
                                    Mabuhay, {completedApplicant.full_name}!
                                </h3>
                                <p className="text-xs text-zinc-500 font-medium">
                                    Matagumpay na natanggap ang iyong Sales Consultant Application at napili ang iyong interview schedule.
                                </p>
                            </div>

                            {/* Meeting Recap Box */}
                            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Scheduled Meeting</span>
                                    <span className="font-bold text-black">{completedApplicant.meeting_date}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Time Slot</span>
                                    <span className="font-black text-emerald-700">{completedApplicant.meeting_time}</span>
                                </div>
                            </div>

                            {/* Prominent Generated Code Box */}
                            <div className="mt-4 p-5 bg-black text-white rounded-2xl text-center space-y-2 relative overflow-hidden shadow-lg">
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                                    Ang Iyong Generated Code
                                </p>
                                <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-emerald-400 py-1">
                                    {completedApplicant.application_code}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                >
                                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                                </button>
                            </div>

                            {/* Instruction Alert: Send to webnegosyp */}
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-black text-amber-900 uppercase tracking-wide text-[10px]">
                                            Mahalagang Hakbang:
                                        </p>
                                        <p className="text-amber-800 font-medium leading-relaxed mt-0.5">
                                            I-send ang iyong code na <strong className="font-mono">{completedApplicant.application_code}</strong> sa email na ito para ma-confirm ang iyong interview:
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-white border border-amber-200 p-2.5 rounded-xl">
                                    <span className="font-mono font-bold text-black text-xs">
                                        webnegosyp@gmail.com
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={handleCopyEmail}
                                            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[9px] font-bold transition-all"
                                        >
                                            {copiedEmail ? 'Copied!' : 'Copy Email'}
                                        </button>
                                        <a
                                            href={`mailto:webnegosyp@gmail.com?subject=Sales%20Consultant%20Application%20Code:%20${completedApplicant.application_code}&body=Hi%20WebNegosyo%20Team,%0D%0A%0D%0AAng%20aking%20pangalan%20ay%20${encodeURIComponent(completedApplicant.full_name)}.%0D%0AIto%20po%20ang%20aking%20Application%20Code:%20${completedApplicant.application_code}%0D%0AScheduled%20Meeting:%20${completedApplicant.meeting_date}%20at%20${completedApplicant.meeting_time}%0D%0APhone:%20${completedApplicant.phone_number}%0D%0A%0D%0ASalamat%20po!`}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-zinc-800 transition-all"
                                        >
                                            <Send className="w-3 h-3" />
                                            <span>Send Now</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
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
            <div className="text-center py-4 mt-8 border-t border-zinc-200/80">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                    WebNegosyo Recruitment & Sales Consultant Hiring 2026
                </p>
            </div>
        </div>
    );
};
