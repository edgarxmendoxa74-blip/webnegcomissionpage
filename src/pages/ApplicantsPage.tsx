import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    type Applicant,
    SALES_QUESTIONS,
    fetchAllApplicants,
    updateApplicantReview
} from '../lib/applicants';
import {
    Users,
    CheckCircle2,
    Clock,
    Calendar,
    Phone,
    Mail,
    FileText,
    Facebook,
    Search,
    ExternalLink,
    Filter,
    RefreshCw,
    UserCheck,
    PhoneCall,
    ArrowLeft,
    Eye,
    MessageSquare,
    Save,
    Link2,
    Check
} from 'lucide-react';

export const ApplicantsPage: React.FC = () => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete' | 'hired'>('all');
    const [timeFilter, setTimeFilter] = useState<'all' | '10:00 AM' | '4:00 PM' | '10:00 PM'>('all');

    // Selected applicant for detailed modal view
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [reviewStatus, setReviewStatus] = useState<Applicant['status']>('completed');
    const [ownerNotes, setOwnerNotes] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const handleCopyHiringLink = () => {
        const url = `${window.location.origin}/hiring`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const list = await fetchAllApplicants();
            setApplicants(list);
        } catch (err) {
            console.error('Error loading applicants:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('applicants_realtime_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'applicants' },
                () => {
                    loadData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Open detail page and sync state
    const handleOpenDetail = (app: Applicant) => {
        setSelectedApplicant(app);
        setReviewStatus(app.status);
        setOwnerNotes(app.owner_notes || '');
        setReviewSuccess(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveReview = async () => {
        if (!selectedApplicant) return;
        setSavingReview(true);
        try {
            await updateApplicantReview(selectedApplicant.id, reviewStatus, ownerNotes);
            setReviewSuccess(true);
            setTimeout(() => setReviewSuccess(false), 2000);
            await loadData();
            setSelectedApplicant(prev => prev ? { ...prev, status: reviewStatus, owner_notes: ownerNotes } : null);
        } catch (err) {
            console.error('Error saving review:', err);
        } finally {
            setSavingReview(false);
        }
    };

    // Filtered applicants
    const filteredApplicants = useMemo(() => {
        return applicants.filter(app => {
            // Status tab filter
            if (statusFilter === 'completed' && app.status !== 'completed' && app.status !== 'interview_scheduled') {
                return false;
            }
            if (statusFilter === 'incomplete' && app.status !== 'incomplete') {
                return false;
            }
            if (statusFilter === 'hired' && app.status !== 'hired') {
                return false;
            }

            // Time slot filter
            if (timeFilter !== 'all' && app.meeting_time !== timeFilter) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (app.full_name || '').toLowerCase().includes(q);
                const matchEmail = (app.email || '').toLowerCase().includes(q);
                const matchPhone = (app.phone_number || '').toLowerCase().includes(q);
                const matchCode = (app.application_code || '').toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchPhone && !matchCode) {
                    return false;
                }
            }

            return true;
        });
    }, [applicants, statusFilter, timeFilter, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        const total = applicants.length;
        const completed = applicants.filter(a => a.status === 'completed' || a.status === 'interview_scheduled' || a.status === 'hired').length;
        const incomplete = applicants.filter(a => a.status === 'incomplete').length;
        const morningCount = applicants.filter(a => a.meeting_time === '10:00 AM').length;
        const afternoonCount = applicants.filter(a => a.meeting_time === '4:00 PM').length;
        const eveningCount = applicants.filter(a => a.meeting_time === '10:00 PM').length;

        return {
            total,
            completed,
            incomplete,
            morningCount,
            afternoonCount,
            eveningCount
        };
    }, [applicants]);

    // =========================================================================
    // VIEW 2: APPLICANT DETAILS NEXT PAGE (FULL-PAGE DOSSIER VIEW)
    // =========================================================================
    if (selectedApplicant) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Top Navigation & Dossier Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedApplicant(null);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-300 hover:border-black rounded-xl text-xs font-black uppercase tracking-wider text-zinc-800 hover:text-black transition-all shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Applicants</span>
                        </button>
                        <span className="text-zinc-300 hidden sm:inline">|</span>
                        <div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 block">
                                Candidate Dossier
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-black">
                                {selectedApplicant.full_name}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            selectedApplicant.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : selectedApplicant.status === 'hired'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : selectedApplicant.status === 'interview_scheduled'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : selectedApplicant.status === 'reviewed'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : selectedApplicant.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-zinc-100 text-zinc-600'
                        }`}>
                            {selectedApplicant.status.replace('_', ' ')}
                        </span>
                        {selectedApplicant.application_code && (
                            <div className="px-3 py-1 bg-black text-white rounded-xl text-xs font-mono font-black">
                                Code: {selectedApplicant.application_code}
                            </div>
                        )}
                    </div>
                </div>

                {/* Candidate Overview & Quick Actions Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left: Contact & Profile Details */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                Contact & Application Information
                            </h3>
                            <span className="text-[9px] text-zinc-400 font-bold">
                                Registered: {selectedApplicant.created_at ? new Date(selectedApplicant.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Full Name</span>
                                <p className="font-extrabold text-sm text-black">{selectedApplicant.full_name}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Email Address</span>
                                <a
                                    href={`mailto:${selectedApplicant.email}`}
                                    className="font-bold text-zinc-800 hover:text-black hover:underline flex items-center gap-1.5"
                                >
                                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>{selectedApplicant.email}</span>
                                </a>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Phone Number</span>
                                <a
                                    href={`tel:${selectedApplicant.phone_number}`}
                                    className="font-bold text-zinc-800 hover:text-black hover:underline flex items-center gap-1.5"
                                >
                                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>{selectedApplicant.phone_number || 'None'}</span>
                                </a>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Meeting Schedule</span>
                                <p className="font-black text-emerald-700 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{selectedApplicant.meeting_time ? `${selectedApplicant.meeting_time} (${selectedApplicant.meeting_date})` : 'Not yet selected'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Social Links & Direct Action Buttons */}
                        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center gap-2">
                            {selectedApplicant.phone_number && (
                                <a
                                    href={`tel:${selectedApplicant.phone_number}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Call Phone</span>
                                </a>
                            )}
                            {selectedApplicant.email && (
                                <a
                                    href={`mailto:${selectedApplicant.email}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Send Email</span>
                                </a>
                            )}
                            {selectedApplicant.fb_link && (
                                <a
                                    href={selectedApplicant.fb_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                                >
                                    <Facebook className="w-3.5 h-3.5" />
                                    <span>Facebook Profile</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        {selectedApplicant.other_socials && (
                            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                                    Other Social Accounts / Links
                                </span>
                                <p className="font-semibold text-zinc-800 mt-0.5">{selectedApplicant.other_socials}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Owner Decision & Notes */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4 text-black" />
                                    <span>Owner Evaluation</span>
                                </h3>
                                {reviewSuccess && (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Saved ✓
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                    Applicant Status
                                </label>
                                <select
                                    value={reviewStatus}
                                    onChange={(e) => setReviewStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs outline-none focus:border-black focus:bg-white"
                                >
                                    <option value="completed">Completed (Pending Interview)</option>
                                    <option value="interview_scheduled">Interview Scheduled</option>
                                    <option value="reviewed">Reviewed / Shortlisted</option>
                                    <option value="hired">Hired / Passed 🎉</option>
                                    <option value="rejected">Not Qualified</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                    Internal Owner Notes / Comments
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Add evaluation comments, sales call impressions, next steps..."
                                    value={ownerNotes}
                                    onChange={(e) => setOwnerNotes(e.target.value)}
                                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-xs outline-none focus:border-black focus:bg-white resize-y"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={savingReview}
                            onClick={handleSaveReview}
                            className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingReview ? 'Saving...' : reviewSuccess ? 'Saved Successfully!' : 'Save Owner Evaluation'}</span>
                        </button>
                    </div>
                </div>

                {/* Uploaded Resume Photo Card (Full Preview) */}
                {selectedApplicant.resume_link && (
                    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-black" />
                                <span>Uploaded Resume Dossier</span>
                            </h3>
                            <a
                                href={selectedApplicant.resume_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-rose-600 hover:underline inline-flex items-center gap-1"
                            >
                                <span>Open Full Size</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        {selectedApplicant.resume_link.startsWith('data:image/') ? (
                            <div className="max-h-[600px] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2 flex justify-center">
                                <img
                                    src={selectedApplicant.resume_link}
                                    alt="Candidate Resume"
                                    className="max-w-full h-auto object-contain rounded-lg shadow-sm"
                                />
                            </div>
                        ) : (
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                                <span className="font-bold text-xs text-zinc-700">Resume Link: {selectedApplicant.resume_link}</span>
                                <a
                                    href={selectedApplicant.resume_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                                >
                                    <span>Open Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Candidate Assessment Answers (2 Sections) */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-black" />
                                <span>Candidate Assessment ({SALES_QUESTIONS.length} Questions)</span>
                            </h3>
                            <p className="text-[10px] text-zinc-400 font-bold">
                                Candidate's submitted answers to HR personality & sales call scenarios
                            </p>
                        </div>
                        <span className="text-[10px] font-black text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
                            {Object.keys(selectedApplicant.answers || {}).length}/{SALES_QUESTIONS.length} Answered
                        </span>
                    </div>

                    {/* SECTION 1: HR & Personality Interview */}
                    <div className="space-y-3">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-amber-700" />
                                <span className="font-black text-xs uppercase tracking-wider text-amber-950">
                                    Section 1: HR & Personality Interview
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-amber-800 bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Strengths, Weaknesses & Contribution
                            </span>
                        </div>

                        <div className="space-y-3">
                            {SALES_QUESTIONS.filter(q => q.category === 'personality').map((q, idx) => {
                                const answer = selectedApplicant.answers?.[q.id]
                                    || (q.id === 'q_hr_background' ? selectedApplicant.answers?.['q1_background'] : undefined)
                                    || (q.id === 'q_hr_motivation_goals' ? selectedApplicant.answers?.['q2_motivation'] : undefined)
                                    || (q.id === 'q_hr_pressure_resilience' ? selectedApplicant.answers?.['q3_discipline'] : undefined)
                                    || (q.id === 'q_hr_strengths_weaknesses' ? selectedApplicant.answers?.['q4_strengths'] : undefined);

                                return (
                                    <div key={q.id} className="p-4 bg-zinc-50/80 rounded-xl border border-zinc-200/80 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                                                Q{idx + 1}: {q.badge}
                                            </span>
                                            {!answer && (
                                                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                                    Walang Sagot
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-extrabold text-black text-xs leading-snug">{q.question}</p>
                                        <div className="p-3 bg-white rounded-lg border border-zinc-200 font-medium text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                                            {answer || <span className="text-zinc-400 italic">Walang ibinigay na sagot.</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: Sales Call Scenarios */}
                    <div className="space-y-3 pt-2">
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PhoneCall className="w-4 h-4 text-rose-700" />
                                <span className="font-black text-xs uppercase tracking-wider text-rose-950">
                                    Section 2: Sales Call Scenarios
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-rose-800 bg-white/80 px-2.5 py-0.5 rounded-full border border-rose-200">
                                Objections, Phone Pitch & Closing
                            </span>
                        </div>

                        <div className="space-y-3">
                            {SALES_QUESTIONS.filter(q => q.category === 'sales_call').map((q, idx) => {
                                const answer = selectedApplicant.answers?.[q.id]
                                    || (q.id === 'q_sales_first_minute' ? selectedApplicant.answers?.['q5_first_minute'] : undefined)
                                    || (q.id === 'q_sales_price_objection' ? selectedApplicant.answers?.['q6_price_objection'] : undefined)
                                    || (q.id === 'q_sales_busy_client' ? selectedApplicant.answers?.['q7_busy_client'] : undefined)
                                    || (q.id === 'q_sales_think_about_it' ? selectedApplicant.answers?.['q8_think_about_it'] : undefined)
                                    || (q.id === 'q_sales_closing_deal' ? selectedApplicant.answers?.['q9_closing_downpayment'] : undefined)
                                    || (q.id === 'q_sales_rejection_resilience' ? selectedApplicant.answers?.['q10_rejection_resilience'] : undefined);

                                return (
                                    <div key={q.id} className="p-4 bg-zinc-50/80 rounded-xl border border-zinc-200/80 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded">
                                                Q{SALES_QUESTIONS.filter(sq => sq.category === 'personality').length + idx + 1}: {q.badge}
                                            </span>
                                            {!answer && (
                                                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                                    Walang Sagot
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-extrabold text-black text-xs leading-snug">{q.question}</p>
                                        <div className="p-3 bg-white rounded-lg border border-zinc-200 font-medium text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                                            {answer || <span className="text-zinc-400 italic">Walang ibinigay na sagot.</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Back Button & Save Action */}
                <div className="pt-2 pb-6 flex items-center justify-between border-t border-zinc-200">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedApplicant(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-300 hover:border-black rounded-xl text-xs font-black uppercase tracking-wider text-zinc-800 hover:text-black transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to All Applicants</span>
                    </button>

                    <button
                        type="button"
                        disabled={savingReview}
                        onClick={handleSaveReview}
                        className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingReview ? 'Saving...' : reviewSuccess ? 'Saved!' : 'Save Owner Evaluation'}</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">
                        Recruitment & Hiring Pipeline
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
                            Sales Consultant Applicants
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-black text-white">
                            {applicants.length} Total
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handleCopyHiringLink}
                        title="Copy hiring page link to share with candidates"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
                    >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-zinc-300" />}
                        <span>{copiedLink ? 'Copied /hiring Link!' : 'Copy /hiring Link'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 hover:border-black rounded-xl text-xs font-bold text-zinc-700 hover:text-black transition-all shadow-2xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh List</span>
                    </button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Total Applicants</p>
                        <Users className="w-4 h-4 text-zinc-400" />
                    </div>
                    <p className="text-2xl font-black tracking-tight text-black tabular-nums mt-1">
                        {stats.total}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1">All registered inquiries</p>
                </div>

                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Completed (Stage 3)</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black tracking-tight text-emerald-700 tabular-nums mt-1">
                        {stats.completed}
                    </p>
                    <p className="text-[9px] text-emerald-600/80 font-bold mt-1">With meeting schedule & code</p>
                </div>

                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black uppercase tracking-widest text-amber-600">Incomplete</p>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black tracking-tight text-amber-600 tabular-nums mt-1">
                        {stats.incomplete}
                    </p>
                    <p className="text-[9px] text-amber-600/80 font-bold mt-1">Dropped off at Stage 1 or 2</p>
                </div>

                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Scheduled Slots</p>
                        <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xs font-bold text-black">10AM: <strong className="text-emerald-700">{stats.morningCount}</strong></span>
                        <span className="text-xs font-bold text-black">4PM: <strong className="text-blue-700">{stats.afternoonCount}</strong></span>
                        <span className="text-xs font-bold text-black">10PM: <strong className="text-purple-700">{stats.eveningCount}</strong></span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1">Meeting distribution</p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {[
                            { id: 'all', label: `All (${applicants.length})` },
                            { id: 'completed', label: `Completed (${stats.completed})` },
                            { id: 'incomplete', label: `Incomplete (${stats.incomplete})` },
                            { id: 'hired', label: `Hired (${applicants.filter(a => a.status === 'hired').length})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id as any)}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    statusFilter === tab.id
                                        ? 'bg-black text-white shadow-xs'
                                        : 'text-zinc-500 hover:text-black'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Time Slot Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Meeting Slot:</span>
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value as any)}
                            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold outline-none focus:border-black"
                        >
                            <option value="all">All Times</option>
                            <option value="10:00 AM">🌅 10:00 AM</option>
                            <option value="4:00 PM">☀️ 4:00 PM</option>
                            <option value="10:00 PM">🌙 10:00 PM</option>
                        </select>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search applicants by name, email, phone number, or application code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                    />
                </div>
            </div>

            {/* Applicants List / Table */}
            <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-xs font-bold text-zinc-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                        <span>Loading applicants list...</span>
                    </div>
                ) : filteredApplicants.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <Users className="w-10 h-10 text-zinc-200 mx-auto" />
                        <p className="text-sm font-black uppercase tracking-wider text-zinc-600">Walang natagpuang aplikante</p>
                        <p className="text-xs text-zinc-400">
                            {searchQuery ? 'Subukang baguhin ang iyong search query o filter.' : 'Wala pang nag-a-apply sa kasalukuyan.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/70 border-b border-zinc-100 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    <th className="px-4 py-3">Applicant Name</th>
                                    <th className="px-4 py-3">Status & Code</th>
                                    <th className="px-4 py-3">Scheduled Meeting</th>
                                    <th className="px-4 py-3">Contact & Links</th>
                                    <th className="px-4 py-3">Progress</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 text-xs">
                                {filteredApplicants.map((app) => {
                                    const isDone = app.status === 'completed' || app.status === 'interview_scheduled' || app.status === 'hired';
                                    const qCount = app.answers ? Object.keys(app.answers).filter(k => app.answers![k]?.trim()).length : 0;

                                    return (
                                        <tr key={app.id} className="hover:bg-zinc-50/60 transition-colors">
                                            {/* Name & Date */}
                                            <td className="px-4 py-3">
                                                <div className="min-w-[160px]">
                                                    <p className="font-black text-black text-xs leading-snug">{app.full_name}</p>
                                                    <p className="text-[10px] text-zinc-400 font-medium truncate">{app.email}</p>
                                                    <p className="text-[8px] text-zinc-400 mt-0.5">
                                                        Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Status & Code */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {isDone ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Completed</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Incomplete (Stage {app.current_stage || 1})</span>
                                                        </span>
                                                    )}

                                                    {app.application_code && (
                                                        <div className="font-mono font-bold text-[10px] text-black tracking-wider">
                                                            {app.application_code}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Scheduled Meeting */}
                                            <td className="px-4 py-3">
                                                {app.meeting_time ? (
                                                    <div className="space-y-0.5">
                                                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            app.meeting_time === '10:00 AM'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : app.meeting_time === '4:00 PM'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                            {app.meeting_time}
                                                        </span>
                                                        <p className="text-[10px] font-bold text-zinc-600">
                                                            {app.meeting_date || 'Date Pending'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-zinc-400 italic">No schedule yet</span>
                                                )}
                                            </td>

                                            {/* Contact & Links */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {app.phone_number && (
                                                        <a
                                                            href={`tel:${app.phone_number}`}
                                                            className="flex items-center gap-1 text-[11px] font-bold text-black hover:underline"
                                                        >
                                                            <Phone className="w-3 h-3 text-zinc-400" />
                                                            <span>{app.phone_number}</span>
                                                        </a>
                                                    )}
                                                    <div className="flex items-center gap-2 pt-0.5">
                                                        {app.resume_link && (
                                                            <a
                                                                href={app.resume_link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-800"
                                                                title="View Resume"
                                                            >
                                                                <FileText className="w-3 h-3" />
                                                                <span>{app.resume_link.startsWith('data:image/') ? 'Resume (Image)' : 'Resume'}</span>
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                        {app.fb_link && (
                                                            <a
                                                                href={app.fb_link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800"
                                                                title="View Facebook"
                                                            >
                                                                <Facebook className="w-3 h-3" />
                                                                <span>FB</span>
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Q&A Progress */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-zinc-600">
                                                        {qCount} / 10 Q&A
                                                    </span>
                                                    <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${qCount >= 10 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                            style={{ width: `${(qCount / 10) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Action Button */}
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDetail(app)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-800 transition-all active:scale-95"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    <span>View Details</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
