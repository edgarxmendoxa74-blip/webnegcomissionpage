import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    type Applicant,
    SALES_QUESTIONS,
    fetchAllApplicants,
    updateApplicantReview,
    checkApplicantsTable,
    APPLICANTS_SQL_SETUP,
    deleteApplicant
} from '../lib/applicants';
import {
    getTelHref,
    getMailtoHref,
    getFacebookUrl,
    getSocialUrl,
    sanitizePhoneNumber
} from '../lib/contactLinks';
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
    ArrowLeft,
    MessageSquare,
    Save,
    Link2,
    Check,
    ChevronRight,
    AlertTriangle,
    Copy,
    Trash2,
    LayoutGrid,
    Table2,
    Bell,
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
    const [tableMissing, setTableMissing] = useState(false);
    const [copiedSql, setCopiedSql] = useState(false);
    const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'sheet'>('grid');
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
    const copiedPhoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── new-applicant notification ──────────────────────────────────────────
    const knownCountRef = useRef<number | null>(null); // null = not yet initialised
    const [newApplicantToast, setNewApplicantToast] = useState<{ name: string } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const playNotificationSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

            const playTone = (freq: number, startAt: number, duration: number, vol = 0.4) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
                gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
                gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
                osc.start(ctx.currentTime + startAt);
                osc.stop(ctx.currentTime + startAt + duration);
            };

            // Three-note ascending chime: C5 → E5 → G5
            playTone(523, 0.00, 0.18);
            playTone(659, 0.18, 0.18);
            playTone(784, 0.36, 0.30);

            setTimeout(() => ctx.close(), 1200);
        } catch {
            // Browser blocked AudioContext — silently ignore
        }
    };

    const showNewApplicantToast = (name: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setNewApplicantToast({ name });
        toastTimerRef.current = setTimeout(() => setNewApplicantToast(null), 5000);
    };

    // Desktop browsers usually have no dialer app, so clicking "Call Phone"
    // would silently do nothing. Copy the number as a fallback (mobile keeps
    // using the native tel: dialer).
    const handleCallClick = (phone?: string | null) => {
        const number = sanitizePhoneNumber(phone);
        if (!number) return;

        const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        if (isMobileDevice) return;

        navigator.clipboard?.writeText(number).catch(() => { /* clipboard blocked */ });
        if (copiedPhoneTimerRef.current) clearTimeout(copiedPhoneTimerRef.current);
        setCopiedPhone(number);
        copiedPhoneTimerRef.current = setTimeout(() => setCopiedPhone(null), 3000);
    };

    const handleCopyHiringLink = () => {
        const url = `${window.location.origin}/hiring`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopySql = () => {
        navigator.clipboard.writeText(APPLICANTS_SQL_SETUP);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
    };

    const handleDeleteApplicant = async (id: string) => {
        setDeletingApplicantId(id);
        try {
            await deleteApplicant(id);
            setApplicants(prev => prev.filter(a => a.id !== id));
            setConfirmDeleteId(null);
            if (selectedApplicant?.id === id) setSelectedApplicant(null);
            setDeleteSuccess(true);
            setTimeout(() => setDeleteSuccess(false), 2500);
        } catch (err) {
            console.error('Delete applicant error:', err);
        } finally {
            setDeletingApplicantId(null);
        }
    };

    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const tableStatus = await checkApplicantsTable();
            setTableMissing(!tableStatus.exists);

            const list = await fetchAllApplicants();

            // Detect new applicant on background refreshes
            if (isBackground && knownCountRef.current !== null && list.length > knownCountRef.current) {
                const newest = list[0]; // fetchAllApplicants returns newest first
                playNotificationSound();
                showNewApplicantToast(newest?.full_name || 'Someone');
            }
            knownCountRef.current = list.length;

            setApplicants(list);
        } catch (err) {
            console.error('Error loading applicants:', err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        loadData(false);

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`applicants_realtime_${Date.now()}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'applicants' },
                (payload) => {
                    const name = (payload.new as any)?.full_name || 'Someone';
                    playNotificationSound();
                    showNewApplicantToast(name);
                    loadData(true);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'applicants' },
                () => { loadData(true); }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'applicants' },
                () => { loadData(true); }
            )
            .subscribe();

        // High frequency auto-sync (every 5 seconds) & on window focus
        const autoSyncInterval = setInterval(() => {
            loadData(true);
        }, 5000);

        const handleFocus = () => {
            loadData(true);
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(autoSyncInterval);
            window.removeEventListener('focus', handleFocus);
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

        return {
            total,
            completed,
            incomplete
        };
    }, [applicants]);

    // =========================================================================
    // VIEW 2: APPLICANT DETAILS NEXT PAGE (FULL-PAGE DOSSIER VIEW)
    // =========================================================================
    if (selectedApplicant) {
        // Normalize whatever the applicant typed into working links
        const phoneHref = getTelHref(selectedApplicant.phone_number);
        const emailSubject = selectedApplicant.application_code
            ? `SmartMenu Sales Consultant Application — ${selectedApplicant.application_code}`
            : 'SmartMenu Sales Consultant Application';
        const emailHref = getMailtoHref(selectedApplicant.email, emailSubject);
        const facebookUrl = getFacebookUrl(selectedApplicant.fb_link);

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Copied number toast (desktop has no dialer app) */}
                {copiedPhone && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-zinc-900 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2">
                        <Copy className="w-4 h-4 text-emerald-400" />
                        <span>
                            Number copied: <span className="font-mono">{copiedPhone}</span>
                        </span>
                    </div>
                )}

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
                                {emailHref ? (
                                    <a
                                        href={emailHref}
                                        className="font-bold text-zinc-800 hover:text-black hover:underline flex items-center gap-1.5"
                                    >
                                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>{selectedApplicant.email}</span>
                                    </a>
                                ) : (
                                    <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>{selectedApplicant.email || 'None'}</span>
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Phone Number</span>
                                {phoneHref ? (
                                    <a
                                        href={phoneHref}
                                        onClick={() => handleCallClick(selectedApplicant.phone_number)}
                                        className="font-bold text-zinc-800 hover:text-black hover:underline flex items-center gap-1.5"
                                    >
                                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>{selectedApplicant.phone_number}</span>
                                    </a>
                                ) : (
                                    <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>None</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Social Links & Direct Action Buttons */}
                        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center gap-2">
                            {phoneHref && (
                                <a
                                    href={phoneHref}
                                    onClick={() => handleCallClick(selectedApplicant.phone_number)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Call Phone</span>
                                </a>
                            )}
                            {emailHref && (
                                <a
                                    href={emailHref}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-2xs"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Send Email</span>
                                </a>
                            )}
                            {facebookUrl && (
                                <a
                                    href={facebookUrl}
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
                                {getSocialUrl(selectedApplicant.other_socials) ? (
                                    <a
                                        href={getSocialUrl(selectedApplicant.other_socials)!}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold text-blue-600 hover:underline mt-0.5 inline-flex items-center gap-1"
                                    >
                                        <span>{selectedApplicant.other_socials}</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <p className="font-semibold text-zinc-800 mt-0.5">{selectedApplicant.other_socials}</p>
                                )}
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
                        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-zinc-100 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-black shrink-0" />
                                <span className="truncate">Uploaded Resume Dossier</span>
                            </h3>
                            <a
                                href={selectedApplicant.resume_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-rose-600 hover:underline inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
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
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="min-w-0 flex-1 text-left">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                                        Resume Link
                                    </span>
                                    <p className="font-bold text-xs text-zinc-700 break-all line-clamp-2 leading-relaxed">
                                        {selectedApplicant.resume_link.startsWith('data:')
                                            ? 'Uploaded file (embedded)'
                                            : selectedApplicant.resume_link}
                                    </p>
                                </div>
                                <a
                                    href={selectedApplicant.resume_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 self-start sm:self-auto whitespace-nowrap px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                                >
                                    <span>Open Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Candidate Assessment Answers */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-black" />
                                <span>Candidate Assessment ({SALES_QUESTIONS.length} Questions)</span>
                            </h3>
                            <p className="text-[10px] text-zinc-400 font-bold">
                                Candidate's submitted answers to the HR & personality questions
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

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                        type="button"
                        onClick={handleCopyHiringLink}
                        title="Copy hiring page link to share with candidates"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-zinc-300" />}
                        <span>{copiedLink ? 'Copied /hiring Link!' : 'Copy /hiring Link'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => loadData(false)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 hover:border-black rounded-xl text-xs font-bold text-zinc-700 hover:text-black transition-all shadow-2xs cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh List</span>
                    </button>
                </div>
            </div>

            {/* Supabase Table Missing Setup Banner */}
            {tableMissing && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-xs">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-black text-sm text-black uppercase tracking-tight">
                                    One-Time Setup: Applicants Database Table Not Found
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                                    Action Required
                                </span>
                            </div>
                            <p className="text-xs text-zinc-700 font-medium mt-1 leading-relaxed">
                                Para pumasok nang <strong>awtomatiko ang lahat ng nag-aapply</strong> mula sa kahit saang cellphone o computer papunta dito sa Owner Portal, kailangan patakbuhin ang table script sa Supabase SQL Editor nang isang beses lang.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/80">
                        <button
                            type="button"
                            onClick={handleCopySql}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSql ? 'SQL Script Copied!' : 'Copy SQL Script'}</span>
                        </button>

                        <a
                            href="https://supabase.com/dashboard/project/tctqctqsuibfrktmirzc/sql/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-50 border border-zinc-300 hover:border-black text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Supabase SQL Editor</span>
                        </a>

                        <button
                            type="button"
                            onClick={() => loadData(false)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 sm:ml-auto"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span>Check Now</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    <p className="text-[9px] text-emerald-600/80 font-bold mt-1">Finished the full assessment</p>
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

            {/* Applicants — Responsive Card Grid / Sheet */}
            <div>
                {/* View toggle */}
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-zinc-400 font-medium">
                        {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''} shown
                    </p>
                    <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grid
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('sheet')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'sheet' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
                        >
                            <Table2 className="w-3.5 h-3.5" />
                            Sheet
                        </button>
                    </div>
                </div>

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
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredApplicants.map((app) => {
                            const isDone = app.status === 'completed' || app.status === 'interview_scheduled' || app.status === 'hired' || app.status === 'reviewed';
                            const isHired = app.status === 'hired';
                            const qCount = app.answers ? Object.keys(app.answers).filter(k => app.answers![k]?.trim()).length : 0;
                            const totalQ = SALES_QUESTIONS.length;
                            const qPct = Math.round((qCount / totalQ) * 100);

                            const statusConfig: Record<string, { label: string; color: string }> = {
                                completed:            { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                                interview_scheduled:  { label: 'Interview Set', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                                reviewed:             { label: 'Reviewed', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                                hired:                { label: 'Hired 🎉', color: 'bg-purple-100 text-purple-900 border-purple-200' },
                                rejected:             { label: 'Not Qualified', color: 'bg-rose-100 text-rose-800 border-rose-200' },
                                incomplete:           { label: 'Incomplete', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
                            };
                            const sc = statusConfig[app.status] ?? statusConfig.incomplete;

                            return (
                                <button
                                    key={app.id}
                                    type="button"
                                    onClick={() => handleOpenDetail(app)}
                                    className={`group w-full text-left bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-98 cursor-pointer ${isHired ? 'border-purple-200 ring-1 ring-purple-200' : isDone ? 'border-emerald-200/70' : 'border-zinc-100'}`}
                                >
                                    {/* Card Top Row: Avatar + Name + Status */}
                                    <div className="flex items-start gap-3">
                                        {/* Avatar Circle */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isHired ? 'bg-purple-100 text-purple-800' : isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>
                                            {(app.full_name || '?').charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm text-black truncate leading-tight">
                                                {app.full_name}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 font-medium truncate">{app.email}</p>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 shrink-0 mt-0.5 transition-colors" />
                                    </div>

                                    {/* Status Badge Row */}
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${sc.color}`}>
                                            {isDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                            {sc.label}
                                        </span>
                                        {app.application_code && (
                                            <span className="font-mono text-[9px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded-md">
                                                {app.application_code}
                                            </span>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-zinc-100 my-3" />

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                                        {/* Phone */}
                                        <div className="flex items-center gap-1.5 text-zinc-600 font-semibold truncate">
                                            <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                                            <span className="truncate">{app.phone_number || '—'}</span>
                                        </div>

                                        {/* Meeting Time */}
                                        <div className="flex items-center gap-1.5 font-semibold truncate">
                                            <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                                            {app.meeting_time ? (
                                                <span className={`font-black truncate ${
                                                    app.meeting_time === '10:00 AM' ? 'text-emerald-700'
                                                    : app.meeting_time === '4:00 PM' ? 'text-blue-700'
                                                    : 'text-purple-700'
                                                }`}>{app.meeting_time}</span>
                                            ) : (
                                                <span className="text-zinc-400 italic">No schedule</span>
                                            )}
                                        </div>

                                        {/* Applied Date */}
                                        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                                            <Clock className="w-3 h-3 shrink-0" />
                                            <span>
                                                {app.created_at
                                                    ? new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'Recently'}
                                            </span>
                                        </div>

                                        {/* Links: FB / Resume */}
                                        <div className="flex items-center gap-2">
                                            {getFacebookUrl(app.fb_link) && (
                                                <span
                                                    role="link"
                                                    tabIndex={0}
                                                    title="Open Facebook profile"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(getFacebookUrl(app.fb_link)!, '_blank', 'noopener,noreferrer');
                                                    }}
                                                    className="inline-flex items-center gap-0.5 text-blue-600 font-bold hover:text-blue-800 hover:underline cursor-pointer"
                                                >
                                                    <Facebook className="w-3 h-3" />
                                                    <span>FB</span>
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </span>
                                            )}
                                            {app.resume_link && (
                                                <span className="inline-flex items-center gap-0.5 text-zinc-600 font-bold">
                                                    <FileText className="w-3 h-3" />
                                                    <span>Resume</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Q&A Progress Bar */}
                                    <div className="mt-3 space-y-1">
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                            <span>Assessment Progress</span>
                                            <span className={qCount >= totalQ ? 'text-emerald-600' : 'text-amber-600'}>
                                                {qCount}/{totalQ} Q&A
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${qCount >= totalQ ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                style={{ width: `${qPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <div className="mt-3 flex justify-end">
                                        {confirmDeleteId === app.id ? (
                                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                <span className="text-[9px] font-black text-red-600 uppercase tracking-wide">Sigurado ka?</span>
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); handleDeleteApplicant(app.id!); }}
                                                    disabled={deletingApplicantId === app.id}
                                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer disabled:opacity-60"
                                                >
                                                    {deletingApplicantId === app.id ? 'Deleting...' : 'Oo, Delete'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                                    className="px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer"
                                                >
                                                    Hindi
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={e => { e.stopPropagation(); setConfirmDeleteId(app.id!); }}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wide border border-red-200 cursor-pointer transition-colors"
                                                title="Delete applicant"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                <span>Delete</span>
                                            </button>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* ── Sheet / Table View ── */
                    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50">
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Name</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Contact</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Status</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Meeting</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Code</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Q&A</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Applied</th>
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Links</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {filteredApplicants.map((app) => {
                                        const isDone = app.status === 'completed' || app.status === 'interview_scheduled' || app.status === 'hired' || app.status === 'reviewed';
                                        const isHired = app.status === 'hired';
                                        const qCount = app.answers ? Object.keys(app.answers).filter(k => app.answers![k]?.trim()).length : 0;
                                        const totalQ = SALES_QUESTIONS.length;
                                        const qPct = Math.round((qCount / totalQ) * 100);

                                        const statusConfig: Record<string, { label: string; color: string }> = {
                                            completed:           { label: 'Completed',     color: 'bg-emerald-100 text-emerald-800' },
                                            interview_scheduled: { label: 'Interview Set', color: 'bg-blue-100 text-blue-800' },
                                            reviewed:            { label: 'Reviewed',      color: 'bg-amber-100 text-amber-800' },
                                            hired:               { label: 'Hired 🎉',      color: 'bg-purple-100 text-purple-900' },
                                            rejected:            { label: 'Rejected',      color: 'bg-rose-100 text-rose-800' },
                                            incomplete:          { label: 'Incomplete',    color: 'bg-zinc-100 text-zinc-600' },
                                        };
                                        const sc = statusConfig[app.status] ?? statusConfig.incomplete;

                                        return (
                                            <tr
                                                key={app.id}
                                                className={`group hover:bg-zinc-50 transition-colors ${isHired ? 'bg-purple-50/40' : ''}`}
                                            >
                                                {/* Name */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetail(app)}
                                                        className="text-left cursor-pointer hover:underline"
                                                    >
                                                        <p className="font-bold text-black">{app.full_name}</p>
                                                        <p className="text-zinc-400 text-[10px] truncate max-w-[160px]">{app.email}</p>
                                                    </button>
                                                </td>

                                                {/* Contact */}
                                                <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                                                    {getTelHref(app.phone_number)
                                                        ? (
                                                            <a
                                                                href={getTelHref(app.phone_number)!}
                                                                onClick={() => handleCallClick(app.phone_number)}
                                                                className="hover:text-black hover:underline flex items-center gap-1"
                                                            >
                                                                <Phone className="w-3 h-3 shrink-0" />{app.phone_number}
                                                            </a>
                                                        )
                                                        : <span className="text-zinc-300">—</span>
                                                    }
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${sc.color}`}>
                                                        {isDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                                        {sc.label}
                                                    </span>
                                                </td>

                                                {/* Meeting */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {app.meeting_time ? (
                                                        <span className={`font-bold ${app.meeting_time === '10:00 AM' ? 'text-emerald-700' : app.meeting_time === '4:00 PM' ? 'text-blue-700' : 'text-purple-700'}`}>
                                                            {app.meeting_time}
                                                        </span>
                                                    ) : <span className="text-zinc-300">—</span>}
                                                </td>

                                                {/* Code */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {app.application_code
                                                        ? <span className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">{app.application_code}</span>
                                                        : <span className="text-zinc-300">—</span>
                                                    }
                                                </td>

                                                {/* Q&A progress */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${qCount >= totalQ ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                                style={{ width: `${qPct}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${qCount >= totalQ ? 'text-emerald-600' : 'text-amber-600'}`}>{qCount}/{totalQ}</span>
                                                    </div>
                                                </td>

                                                {/* Applied date */}
                                                <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                                                    {app.created_at ? new Date(app.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                </td>

                                                {/* Links */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {getFacebookUrl(app.fb_link) && (
                                                            <a href={getFacebookUrl(app.fb_link)!} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="Facebook">
                                                                <Facebook className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                        {app.resume_link && (
                                                            <a href={app.resume_link} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-black" title="Resume">
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDetail(app)}
                                                            className="px-2 py-1 bg-zinc-900 text-white rounded-lg text-[10px] font-bold hover:bg-zinc-700 cursor-pointer"
                                                        >
                                                            View
                                                        </button>
                                                        {confirmDeleteId === app.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteApplicant(app.id!)}
                                                                    disabled={deletingApplicantId === app.id}
                                                                    className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-60"
                                                                >
                                                                    {deletingApplicantId === app.id ? '...' : 'Confirm'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                    className="px-2 py-1 bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmDeleteId(app.id!)}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Copied number toast (desktop has no dialer app) */}
            {copiedPhone && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-zinc-900 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>
                        Number copied: <span className="font-mono">{copiedPhone}</span>
                    </span>
                </div>
            )}

            {/* New Applicant Notification Toast */}
            {newApplicantToast && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900 text-white rounded-2xl shadow-2xl border border-zinc-700 animate-in slide-in-from-top-2 duration-300 max-w-xs">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-400">New Applicant!</p>
                        <p className="text-sm font-bold text-white truncate">{newApplicantToast.name}</p>
                        <p className="text-[10px] text-zinc-400">Just applied via the hiring portal</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNewApplicantToast(null)}
                        className="ml-1 text-zinc-500 hover:text-white shrink-0 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Delete Success Toast */}
            {deleteSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl text-sm font-black flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Applicant deleted successfully!</span>
                </div>
            )}
        </div>
    );
};
