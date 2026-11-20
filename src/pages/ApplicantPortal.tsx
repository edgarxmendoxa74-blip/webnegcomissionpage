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
    PhoneCall,
    FileText,
    GraduationCap,
    Briefcase,
    X,
    Video,
    PlayCircle,
    Award,
    CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type TrainingVideo,
    DEFAULT_TRAINING_VIDEOS,
    fetchTrainingVideos,
    getWatchedVideoIds,
    markVideoWatched
} from '../lib/trainingVideos';

const TARGET_EMAIL = 'webnegosyo3@gmail.com';

interface ApplicantPortalProps {
    onBackToSelection?: () => void;
}

export const ApplicantPortal: React.FC<ApplicantPortalProps> = ({ onBackToSelection }) => {
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
    const [showJobDescModal, setShowJobDescModal] = useState(false);
    const [completedApplicant, setCompletedApplicant] = useState<Applicant | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    // Step 3 Training Videos State
    const [showTrainingModal, setShowTrainingModal] = useState(false);
    const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(DEFAULT_TRAINING_VIDEOS);
    const [activeTrainingTab, setActiveTrainingTab] = useState<1 | 2 | 3>(1);
    const [watchedVideoIds, setWatchedVideoIds] = useState<number[]>([]);
    const [showTrainingCompleteModal, setShowTrainingCompleteModal] = useState(false);
    const [applicantTrainingName, setApplicantTrainingName] = useState('');
    const [copiedTrainingEmail, setCopiedTrainingEmail] = useState(false);

    const isCompleted = !!completedApplicant;

    const handleCloseCompletionModal = () => {
        setShowCompletionModal(false);
        setShowApplicationForm(false);
        setCurrentStep(1);
        setCompletedApplicant(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Load Training Videos and Watched State
    useEffect(() => {
        const loadVideos = async () => {
            try {
                const list = await fetchTrainingVideos();
                setTrainingVideos(list);
            } catch {
                // ignore
            }
        };
        loadVideos();
        setWatchedVideoIds(getWatchedVideoIds());

        const handleVideosChanged = (e: any) => {
            if (e.detail) setTrainingVideos(e.detail);
        };
        const handleWatchedChanged = (e: any) => {
            if (e.detail) setWatchedVideoIds(e.detail);
        };
        window.addEventListener('smartmenu_training_videos_changed', handleVideosChanged);
        window.addEventListener('smartmenu_watched_videos_changed', handleWatchedChanged);

        return () => {
            window.removeEventListener('smartmenu_training_videos_changed', handleVideosChanged);
            window.removeEventListener('smartmenu_watched_videos_changed', handleWatchedChanged);
        };
    }, []);

    // Sync applicant name for training email
    useEffect(() => {
        if (fullName.trim() && !applicantTrainingName) {
            setApplicantTrainingName(fullName.trim());
        }
    }, [fullName, applicantTrainingName]);

    // Handle Marking a Training Video as Watched
    const handleMarkWatched = (videoId: number) => {
        const updated = markVideoWatched(videoId);
        setWatchedVideoIds(updated);
        if (updated.length === 3) {
            setShowTrainingCompleteModal(true);
        }
    };

    // Helper: is this a YouTube URL for embed
    const getYouTubeEmbedUrl = (url?: string) => {
        if (!url) return null;
        try {
            if (url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                const videoId = urlObj.searchParams.get('v');
                return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
            }
            if (url.includes('youtu.be/')) {
                const parts = url.split('youtu.be/');
                const videoId = parts[1]?.split('?')[0];
                return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
            }
        } catch {
            return null;
        }
        return null;
    };

    // Training Completion Email URLs
    const getTrainingCompletionEmailUrls = () => {
        const name = (applicantTrainingName || fullName || 'SmartMenu Sales Applicant').trim();
        const subject = `SmartMenu 3-Video Training Completed - ${name}`;
        const body =
            `Hi WebNegosyo / SmartMenu Team,\n\n` +
            `I have successfully watched and completed all 3 Training Videos for the Sales Consultant position.\n\n` +
            `🎓 TRAINING MODULES COMPLETED:\n` +
            `• Training 1: ${trainingVideos.find(v => v.id === 1)?.title || 'Sales Consultant Pitch & Overview'}\n` +
            `• Training 2: ${trainingVideos.find(v => v.id === 2)?.title || 'Objection Handling & Cold Calling'}\n` +
            `• Training 3: ${trainingVideos.find(v => v.id === 3)?.title || 'Closing the Deal & Dashboard Lead Submission'}\n\n` +
            `📋 APPLICANT DETAILS:\n` +
            `• Full Name: ${name}\n` +
            (phoneNumber ? `• Phone Number: ${phoneNumber}\n` : '') +
            (email ? `• Email: ${email}\n` : '') +
            (completedApplicant?.application_code ? `• Application Code: ${completedApplicant.application_code}\n` : '') +
            `• Status: 100% Completed (Training 1, 2, and 3)\n` +
            `• Date Completed: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
            `I am ready for the next steps and account onboarding. Please confirm. Thank you!\n\n` +
            `Respectfully,\n` +
            `${name}`;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${TARGET_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        return { gmailUrl, mailtoUrl, subject, body };
    };

    const handleCopyTrainingEmail = () => {
        navigator.clipboard.writeText(TARGET_EMAIL);
        setCopiedTrainingEmail(true);
        setTimeout(() => setCopiedTrainingEmail(false), 2000);
    };

    const personalityQuestions = SALES_QUESTIONS.filter(q => q.category === 'personality');
    const salesQuestions = SALES_QUESTIONS.filter(q => q.category === 'sales_call');
    const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    const personalityAnswered = personalityQuestions.filter(q => answers[q.id]?.trim()).length;
    const salesAnswered = salesQuestions.filter(q => answers[q.id]?.trim()).length;

    // Autoplay slideshow on the home view (3 slides)
    useEffect(() => {
        if (showApplicationForm) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
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
                <div className="text-center space-y-1.5 mb-2.5 sm:mb-3 animate-in fade-in relative">
                    {onBackToSelection && (
                        <button
                            type="button"
                            onClick={onBackToSelection}
                            className="absolute left-0 top-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-800 bg-white/80 hover:bg-white border border-amber-200/80 px-2.5 py-1 rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Go to WebNegosyo portals"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WebNegosyo</span>
                        </button>
                    )}
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
                                        /* Slide 1: Official Hiring Poster / Job Description */
                                        <motion.div
                                            key="slide-1"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="w-full h-full p-0 bg-white flex items-center justify-center cursor-pointer group relative"
                                            onClick={() => setShowJobDescModal(true)}
                                            title="Click to view full job description"
                                        >
                                            <img
                                                src="/smartmenu-job-description.jpg"
                                                alt="SmartMenu Sales Consultant — We're Hiring!"
                                                className="w-full h-full object-cover rounded-2xl transition-transform group-hover:scale-[1.02]"
                                            />
                                            {/* Click-to-view overlay hint */}
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                                Tap to view details
                                            </div>
                                        </motion.div>
                                    ) : currentSlide === 1 ? (
                                        /* Slide 2: Official Hiring Banner */
                                        <motion.div
                                            key="slide-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="w-full h-full p-0 bg-white flex items-center justify-center cursor-pointer group"
                                            onClick={() => setShowJobDescModal(true)}
                                        >
                                            <img
                                                src="/smartmenu-hiring-banner.jpg"
                                                alt="SmartMenu — We're Hiring Sales Consultant"
                                                className="w-full h-full object-cover rounded-2xl"
                                            />
                                        </motion.div>
                                    ) : (
                                        /* Slide 3: Key Highlights Card */
                                        <motion.div
                                            key="slide-3"
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
                                    onClick={() => setCurrentSlide((prev) => (prev - 1 + 3) % 3)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Previous"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentSlide((prev) => (prev + 1) % 3)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Next"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Dots */}
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                                {[0, 1, 2].map((idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`transition-all rounded-full cursor-pointer ${
                                            currentSlide === idx
                                                ? 'w-5 h-1.5 bg-gradient-to-r from-red-600 to-amber-500'
                                                : 'w-1.5 h-1.5 bg-zinc-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* CTA ACTION BUTTONS: Apply Now + Watch Videos + View Job Description */}
                        <div className="pt-1 max-w-[320px] sm:max-w-[360px] mx-auto space-y-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => {
                                    setShowApplicationForm(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-amber-200" />
                                <span>Apply as Sales Consultant</span>
                                <ArrowRight className="w-4 h-4" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => setShowJobDescModal(true)}
                                className="w-full py-2.5 bg-white hover:bg-amber-50/60 text-zinc-800 border-2 border-amber-300 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <FileText className="w-4 h-4 text-orange-600" />
                                <span>Job Description & Qualifications</span>
                            </motion.button>
                        </div>

                        {/* 3-STEP HIRING PROCESS ROADMAP (BAGO MATANGGAP) */}
                        <div className="pt-2 max-w-[360px] sm:max-w-md mx-auto text-left">
                            <div className="bg-white/95 backdrop-blur-xs border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-amber-500 text-white flex items-center justify-center shadow-xs">
                                            <Briefcase className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                                Hiring Process
                                            </h3>
                                            <p className="text-[10px] text-zinc-500 font-semibold">
                                                Roadmap bago matanggap bilang Sales Consultant
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        3 Steps
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {/* Step 1 */}
                                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 transition-all hover:bg-amber-50">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-amber-500 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                                            1
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="text-xs font-black text-zinc-900">
                                                    Application & Scheduled Meeting
                                                </h4>
                                                <span className="text-[8px] font-bold text-red-700 bg-red-100/80 px-1.5 py-0.2 rounded">
                                                    Step 1
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">
                                                Kumpletuhin ang online application form at pumili ng interview schedule (10:00 AM, 4:00 PM, o 10:00 PM) para sa initial screening.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/70 transition-all hover:bg-orange-50">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                                            2
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="text-xs font-black text-zinc-900">
                                                    3 Days Sales Training
                                                </h4>
                                                <span className="text-[8px] font-bold text-orange-700 bg-orange-100/80 px-1.5 py-0.2 rounded">
                                                    Step 2
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">
                                                Sasailalim sa 3-araw na komprehensibong remote training: sales calls, pitch scripts, objection handling, at pag-close ng SmartMenu deals.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 3: Watch 3 Videos for Training */}
                                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 transition-all hover:bg-emerald-50">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                                            3
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="text-xs font-black text-zinc-900">
                                                    Watch 3 Videos for Training
                                                </h4>
                                                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                                    Step 3
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">
                                                Panoorin nang buo ang 3 Training Videos (Training 1, 2, at 3) para sa sales pitch, objection handling, at closing bago magsimula.
                                            </p>

                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                {/* Top-right Close Button */}
                                <button
                                    type="button"
                                    onClick={handleCloseCompletionModal}
                                    className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Close and return to hiring portal"
                                    title="Close and return to hiring portal"
                                >
                                    <X className="w-4 h-4" />
                                </button>

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
                                    onClick={handleCloseCompletionModal}
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                                >
                                    Done / Back to Hiring Portal
                                </button>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* ===== JOB DESCRIPTION & QUALIFICATIONS MODAL ===== */}
            <AnimatePresence>
                {showJobDescModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="bg-white rounded-3xl border border-amber-200 max-w-md w-full shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <FileText className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                                            Job Description & Qualifications
                                        </h3>
                                        <p className="text-[10px] text-amber-100 font-semibold">
                                            SmartMenu Sales Consultant Position
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowJobDescModal(false)}
                                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-left">
                                {/* Poster Image Preview */}
                                <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm bg-white">
                                    <img
                                        src="/smartmenu-job-description.jpg"
                                        alt="SmartMenu We're Hiring Sales Consultant"
                                        className="w-full h-auto object-contain"
                                    />
                                </div>

                                {/* Key Highlights Tags */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-xs">
                                        Part-Time Online Job
                                    </div>
                                    <div className="p-2 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-xs">
                                        Flexible Hours
                                    </div>
                                    <div className="p-2 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-xs">
                                        Commission Based
                                    </div>
                                </div>

                                {/* WE'RE HIRING headline */}
                                <div className="text-center space-y-0.5">
                                    <span className="inline-block px-4 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                                        We're Hiring!
                                    </span>
                                    <h2 className="text-xl font-black text-zinc-950 leading-tight">Sales Consultant</h2>
                                    <p className="text-[10px] text-zinc-500 font-bold">SmartMenu · Growing Restaurants. Together.</p>
                                </div>

                                {/* What You'll Do & Qualifications */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* What You'll Do */}
                                    <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl space-y-2">
                                        <h4 className="text-xs font-black uppercase text-red-700 tracking-wider flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-red-600" />
                                            <span>What You'll Do</span>
                                        </h4>
                                        <ul className="space-y-1.5 text-xs text-zinc-800 font-bold">
                                            {[
                                                'Sales calls',
                                                'Offer web services to local clients',
                                                'Assist clients',
                                            ].map((item) => (
                                                <li key={item} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">✓</div>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Qualifications */}
                                    <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-2">
                                        <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                                            <span>Qualifications</span>
                                        </h4>
                                        <ul className="space-y-1.5 text-xs text-zinc-800 font-bold">
                                            {[
                                                'Good communicator',
                                                'At least High School graduate',
                                                'Good attitude',
                                                'Willing to be trained',
                                            ].map((item) => (
                                                <li key={item} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0 text-[10px] font-black">✓</div>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* 3 Steps Hiring Roadmap summary */}
                                <div className="p-3.5 bg-zinc-950 text-white rounded-2xl space-y-2.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                                        📋 Hiring Process — Roadmap Bago Matanggap
                                    </span>
                                    <div className="space-y-2 text-[11px] font-bold text-zinc-200">
                                        <div className="flex items-start gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                                            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">1</span>
                                            <div>
                                                <span className="text-amber-300 font-black block text-[10px]">Application &amp; Scheduled Meeting</span>
                                                <span className="text-zinc-400 text-[10px] font-medium">Kumpletuhin ang online application at pumili ng interview schedule.</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                                            <span className="w-5 h-5 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">2</span>
                                            <div>
                                                <span className="text-orange-300 font-black block text-[10px]">3 Days Sales Training</span>
                                                <span className="text-zinc-400 text-[10px] font-medium">Remote coaching — sales pitch, objection handling, at closing ng SmartMenu deals.</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">3</span>
                                            <div>
                                                <span className="text-emerald-300 font-black block text-[10px]">Watch 3 Videos for Training</span>
                                                <span className="text-zinc-400 text-[10px] font-medium">Panoorin ang Training 1, 2, at 3 — pagkatapos ay mag-send ng email confirmation sa management.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Resume Destination Notice */}
                                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl text-center space-y-0.5 shadow-xs">
                                    <span className="text-[10px] text-zinc-600 font-bold block">
                                        📧 Interested? Send your resume here:
                                    </span>
                                    <span className="text-sm font-black text-red-600 block">
                                        webnegosyo3@gmail.com
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                                        SmartMenu · Growing Restaurants. Together.
                                    </span>
                                </div>
                            </div>

                            {/* Modal Footer CTA */}
                            <div className="p-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowJobDescModal(false)}
                                    className="px-4 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowJobDescModal(false);
                                        setShowApplicationForm(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                    <span>Apply as Sales Consultant Now</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== STEP 3: WATCH 3 TRAINING VIDEOS MODAL ===== */}
            <AnimatePresence>
                {showTrainingModal && (() => {
                    const activeVideo = trainingVideos.find(v => v.id === activeTrainingTab) || DEFAULT_TRAINING_VIDEOS[activeTrainingTab - 1];
                    const youtubeEmbed = getYouTubeEmbedUrl(activeVideo.video_url);
                    const isCurrentWatched = watchedVideoIds.includes(activeTrainingTab);
                    const allWatched = watchedVideoIds.length === 3;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                className="bg-white rounded-3xl border border-zinc-200 max-w-xl w-full shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <PlayCircle className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-black uppercase tracking-wider">
                                                    Sales Consultant Training Videos
                                                </h3>
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-emerald-800">
                                                    Step 3
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-emerald-100 font-semibold">
                                                Panoorin ang 3 Video Modules para Makumpleto ang Training
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowTrainingModal(false)}
                                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Progress Bar Header */}
                                <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-100 space-y-1.5 shrink-0 text-left">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-emerald-950 flex items-center gap-1.5">
                                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Training Progress</span>
                                        </span>
                                        <span className="text-emerald-700">
                                            {watchedVideoIds.length} of 3 Videos Completed ({Math.round((watchedVideoIds.length / 3) * 100)}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(watchedVideoIds.length / 3) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Tabs for Training 1, 2, 3 */}
                                <div className="p-2.5 bg-zinc-100/90 border-b border-zinc-200 grid grid-cols-3 gap-1.5 shrink-0">
                                    {[1, 2, 3].map((num) => {
                                        const isTabActive = activeTrainingTab === num;
                                        const isTabWatched = watchedVideoIds.includes(num);

                                        return (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setActiveTrainingTab(num as 1 | 2 | 3)}
                                                className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                                                    isTabActive
                                                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm ring-2 ring-emerald-500/40'
                                                        : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider block">
                                                        Training {num}
                                                    </span>
                                                    {isTabWatched ? (
                                                        <span className="text-[9px] text-emerald-400 font-black">✓</span>
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-bold block truncate mt-0.5 ${
                                                    isTabWatched ? 'text-emerald-400 font-black' : isTabActive ? 'text-zinc-300' : 'text-zinc-500'
                                                }`}>
                                                    {isTabWatched ? '✓ Watched' : 'Watch Now'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Video Player & Details Body */}
                                <div className="p-4 overflow-y-auto space-y-3.5 text-left flex-1">
                                    {/* Video Player Display */}
                                    <div className="rounded-2xl overflow-hidden border border-zinc-300 bg-black aspect-video relative flex items-center justify-center shadow-inner">
                                        {youtubeEmbed ? (
                                            <iframe
                                                src={youtubeEmbed}
                                                title={activeVideo.title}
                                                className="w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        ) : activeVideo.video_url ? (
                                            <video
                                                key={activeVideo.video_url}
                                                src={activeVideo.video_url}
                                                controls
                                                playsInline
                                                onEnded={() => handleMarkWatched(activeTrainingTab)}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="p-6 text-center text-zinc-400 space-y-2">
                                                <Video className="w-10 h-10 mx-auto text-zinc-500" />
                                                <p className="text-xs font-bold text-zinc-300">
                                                    Video is being updated by Management
                                                </p>
                                                <p className="text-[10px] text-zinc-400 max-w-xs mx-auto">
                                                    Maaari mong basahin ang module description sa ibaba at i-click ang button sa ibaba upang i-mark bilang watched.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Module Info */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                Module {activeTrainingTab} of 3
                                            </span>
                                            {isCurrentWatched && (
                                                <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    <span>Completed</span>
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-sm font-black text-zinc-900 leading-snug">
                                            {activeVideo.title}
                                        </h4>
                                        <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                                            {activeVideo.description}
                                        </p>
                                    </div>

                                    {/* Mark as Watched & Navigation */}
                                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => handleMarkWatched(activeTrainingTab)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                                isCurrentWatched
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                                            }`}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>{isCurrentWatched ? '✓ Marked as Watched' : `Mark Training ${activeTrainingTab} as Watched`}</span>
                                        </button>

                                        {activeTrainingTab < 3 ? (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTrainingTab((activeTrainingTab + 1) as 1 | 2 | 3)}
                                                className="px-3.5 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                            >
                                                <span>Training {activeTrainingTab + 1}</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            allWatched && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTrainingCompleteModal(true)}
                                                    className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                                    <span>Send Confirmation</span>
                                                </button>
                                            )
                                        )}
                                    </div>

                                    {/* 100% Completed Banner inside modal */}
                                    {allWatched && (
                                        <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-300 rounded-2xl text-center space-y-2 animate-in fade-in">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                                                🎉 All 3 Training Videos Watched!
                                            </span>
                                            <p className="text-xs font-bold text-zinc-800">
                                                Kumpleto mo nang napanood ang Training 1, 2, at 3! Ipadala na ang iyong completion confirmation via email sa management.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setShowTrainingCompleteModal(true)}
                                                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                <span>Send Email Confirmation Now</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between shrink-0">
                                    <span className="text-[10px] text-zinc-500 font-bold">
                                        Step 3 of Hiring Process • SmartMenu
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowTrainingModal(false)}
                                        className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* ===== CONGRATULATIONS: 3-VIDEO TRAINING COMPLETE POP-UP MODAL ===== */}
            <AnimatePresence>
                {showTrainingCompleteModal && (() => {
                    const { gmailUrl, mailtoUrl } = getTrainingCompletionEmailUrls();

                    return (
                        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-3xl border border-amber-300 p-5 sm:p-6 max-w-sm w-full shadow-2xl relative text-center space-y-3.5 my-auto"
                            >
                                {/* Top-right Close Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowTrainingCompleteModal(false)}
                                    className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Trophy Icon */}
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 via-teal-100 to-amber-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                                    <Award className="w-8 h-8 text-emerald-600" />
                                </div>

                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300">
                                        ✓ 100% Training Completed
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1">
                                        Congratulations! You Complete the Training!
                                    </h3>
                                    <p className="text-[10px] text-zinc-600 mt-1 font-medium leading-relaxed">
                                        Matagumpay mong natapos panoorin ang lahat ng 3 Training Videos para sa posisyong <strong>Sales Consultant</strong>!
                                    </p>
                                </div>

                                {/* 3 Module Checklist Box */}
                                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-left space-y-1.5 text-xs font-bold text-zinc-800">
                                    <div className="flex items-center gap-2 text-emerald-700">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                        <span className="truncate">Training 1: Overview & Pitching</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-700">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                        <span className="truncate">Training 2: Objection Handling</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-700">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                        <span className="truncate">Training 3: Closing & Lead Submission</span>
                                    </div>
                                </div>

                                {/* Applicant Full Name Input */}
                                <div className="text-left space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-700 block">
                                        Your Full Name (Pangalan ng Aplikante):
                                    </label>
                                    <input
                                        type="text"
                                        value={applicantTrainingName}
                                        onChange={(e) => setApplicantTrainingName(e.target.value)}
                                        placeholder="Ilagay ang iyong buong pangalan..."
                                        className="w-full px-3 py-2 text-xs font-bold border border-zinc-300 rounded-xl focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white"
                                    />
                                </div>

                                {/* Send Email Action Card */}
                                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-left space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-800 font-bold block">
                                            Send message thru email to:
                                        </span>
                                        <span className="text-[10px] font-mono font-black text-red-600">
                                            {TARGET_EMAIL}
                                        </span>
                                    </div>

                                    {/* Primary CTA: SEND THE MESSAGE THRU EMAIL (Direct Gmail Link) */}
                                    <a
                                        href={gmailUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full py-3 px-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
                                    >
                                        <Send className="w-4 h-4 text-amber-200" />
                                        <span>Send the Message Thru Email</span>
                                    </a>

                                    {/* Helper options */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <a
                                            href={mailtoUrl}
                                            className="py-1.5 px-2 bg-white border border-zinc-200 hover:border-black text-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1 active:scale-95 transition-all"
                                        >
                                            <Mail className="w-3 h-3 text-zinc-500" />
                                            <span>Open Mail App</span>
                                        </a>

                                        <button
                                            type="button"
                                            onClick={handleCopyTrainingEmail}
                                            className="py-1.5 px-2 bg-white border border-zinc-200 hover:border-black text-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-wider text-center active:scale-95 transition-all cursor-pointer"
                                        >
                                            {copiedTrainingEmail ? '✓ Copied' : 'Copy Email'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowTrainingCompleteModal(false)}
                                    className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Close / Done
                                </button>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Footer */}
            <div className="text-center py-3 mt-4 space-y-1">
                <p className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                    Interested? Message us to apply!
                </p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    SmartMenu · Growing Restaurants. Together.
                </p>
            </div>
        </div>
    );
};
