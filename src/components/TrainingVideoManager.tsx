import React, { useState, useEffect, useRef } from 'react';
import {
    type TrainingVideo,
    fetchTrainingVideos,
    saveTrainingVideo,
    deleteTrainingVideo,
    uploadTrainingVideoFile,
    TRAINING_VIDEOS_SQL_SETUP
} from '../lib/trainingVideos';
import {
    Video,
    UploadCloud,
    CheckCircle2,
    Save,
    Link2,
    X,
    FileVideo,
    Trash2,
    AlertCircle,
    Check,
    Eye,
    Copy,
    Code,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrainingVideoManagerProps {
    isOpen?: boolean;
    onClose?: () => void;
    isPageSection?: boolean;
}

export const TrainingVideoManager: React.FC<TrainingVideoManagerProps> = ({
    isOpen = true,
    onClose,
    isPageSection = false
}) => {
    const [videos, setVideos] = useState<TrainingVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

    // Form editing state for active video
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modals & Popups
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState<{ title: string; subtitle: string }>({
        title: 'Video Uploaded Successfully!',
        subtitle: 'The video is now live for applicants in Step 3.'
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);

    // SQL modal
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [copiedSql, setCopiedSql] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load videos
    const loadVideos = async () => {
        setLoading(true);
        try {
            const list = await fetchTrainingVideos();
            setVideos(list);
            const current = list.find(v => v.id === activeTab);
            if (current) {
                setTitle(current.title);
                setDescription(current.description);
                setVideoUrl(current.video_url || '');
                setFileName(current.file_name || '');
            }
        } catch (err) {
            console.error('Failed to load training videos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen || isPageSection) {
            loadVideos();
        }
    }, [isOpen, isPageSection]);

    // When tab changes, populate form
    useEffect(() => {
        const current = videos.find(v => v.id === activeTab);
        if (current) {
            setTitle(current.title);
            setDescription(current.description);
            setVideoUrl(current.video_url || '');
            setFileName(current.file_name || '');
            setErrorMessage(null);
        }
    }, [activeTab, videos]);

    // Handle video file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            setErrorMessage('Please select a valid video file (MP4, WebM, MOV).');
            return;
        }

        setUploading(true);
        setUploadProgress(10);
        setErrorMessage(null);

        try {
            const res = await uploadTrainingVideoFile(file, activeTab, (p) => setUploadProgress(p));
            setVideoUrl(res.url);
            setFileName(res.fileName);

            // Auto-save the uploaded video
            const updatedVideo: TrainingVideo = {
                id: activeTab,
                title: title.trim() || `Training ${activeTab}: Sales Video`,
                description: description.trim(),
                video_url: res.url,
                file_name: res.fileName,
                updated_at: new Date().toISOString()
            };
            const updatedList = await saveTrainingVideo(updatedVideo);
            setVideos(updatedList);

            // Trigger Success Popup
            setSuccessMessage({
                title: `Training ${activeTab} Video Uploaded Successfully!`,
                subtitle: `"${res.fileName}" is now ready and saved for applicants in Step 3.`
            });
            setShowSuccessPopup(true);
        } catch (err: any) {
            setErrorMessage(err.message || 'Video upload failed. You can paste a direct video or YouTube URL instead.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Save active video (manual save)
    const handleSave = async () => {
        if (!title.trim()) {
            setErrorMessage('Please enter a title for this training video.');
            return;
        }

        setSaving(true);
        setErrorMessage(null);

        try {
            const updatedVideo: TrainingVideo = {
                id: activeTab,
                title: title.trim(),
                description: description.trim(),
                video_url: videoUrl.trim(),
                file_name: fileName || undefined,
                updated_at: new Date().toISOString()
            };

            const updatedList = await saveTrainingVideo(updatedVideo);
            setVideos(updatedList);

            setSuccessMessage({
                title: `Training ${activeTab} Saved Successfully!`,
                subtitle: `Details and video link for Module ${activeTab} have been updated.`
            });
            setShowSuccessPopup(true);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to save training video.');
        } finally {
            setSaving(false);
        }
    };

    // Delete active video
    const handleDeleteVideo = async () => {
        setDeleting(true);
        try {
            const updated = await deleteTrainingVideo(activeTab);
            setVideos(updated);
            setVideoUrl('');
            setFileName('');
            if (fileInputRef.current) fileInputRef.current.value = '';

            const current = updated.find(v => v.id === activeTab);
            if (current) {
                setTitle(current.title);
                setDescription(current.description);
            }

            setShowDeleteConfirm(false);
            setShowDeleteSuccessPopup(true);
            setTimeout(() => setShowDeleteSuccessPopup(false), 2500);
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to delete video.');
        } finally {
            setDeleting(false);
        }
    };

    const handleCopySql = () => {
        navigator.clipboard.writeText(TRAINING_VIDEOS_SQL_SETUP);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
    };

    // Helper: is this a YouTube URL
    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return null;
        try {
            if (url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                const vid = urlObj.searchParams.get('v');
                return vid ? `https://www.youtube.com/embed/${vid}` : null;
            }
            if (url.includes('youtu.be/')) {
                const parts = url.split('youtu.be/');
                const vid = parts[1]?.split('?')[0];
                return vid ? `https://www.youtube.com/embed/${vid}` : null;
            }
        } catch {
            return null;
        }
        return null;
    };

    const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);

    if (!isOpen && !isPageSection) return null;

    const currentVideo = videos.find(v => v.id === activeTab);
    const hasActiveVideo = Boolean(videoUrl || currentVideo?.video_url);

    // Main Manager Content (Shared between Page Section and Modal)
    const content = (
        <div className="bg-white rounded-3xl border border-zinc-200 w-full shadow-xl relative overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-red-600 to-amber-500 rounded-2xl text-white shadow-md">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                                Training Videos Manager
                            </h3>
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                                Step 3 Hiring
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium">
                            Pamahalaan ang 3 Training Videos para sa Sales Consultant applicants
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowSqlModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                        title="Database Table SQL Setup"
                    >
                        <Code className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">SQL Setup</span>
                    </button>
                    {!isPageSection && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs for Video 1, 2, and 3 */}
            <div className="p-3 bg-zinc-100/80 border-b border-zinc-200 grid grid-cols-3 gap-2 shrink-0">
                {[1, 2, 3].map((num) => {
                    const v = videos.find(item => item.id === num);
                    const hasUrl = !!v?.video_url;
                    const isActive = activeTab === num;

                    return (
                        <button
                            key={num}
                            type="button"
                            onClick={() => setActiveTab(num as 1 | 2 | 3)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                isActive
                                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-red-500/40'
                                    : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider block">
                                    Training {num}
                                </span>
                                {hasUrl ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                                        ✓ Uploaded
                                    </span>
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Pending video" />
                                )}
                            </div>
                            <span className={`text-[10px] font-semibold truncate block mt-1 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {hasUrl ? (v?.file_name || 'Video ready') : 'No video yet'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Body Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left flex-1 max-h-[75vh]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                        <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold">Loading training video details...</span>
                    </div>
                ) : (
                    <>
                        {/* Error Message Notice */}
                        {errorMessage && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Title and Description Inputs */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-zinc-800">
                                    Video Title / Module Name *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Training 1: Sales Consultant Pitch & Overview"
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-red-600 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-zinc-800">
                                    Module Description / Instructions
                                </label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ilarawan ang matututunan ng aplikante sa module na ito..."
                                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:border-red-600 focus:bg-white transition-all resize-y"
                                />
                            </div>
                        </div>

                        {/* Video Source Option 1: File Upload (MP4 / WebM / MOV) */}
                        <div className="p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/40 border-2 border-dashed border-amber-300 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                                    <UploadCloud className="w-4 h-4 text-orange-600" />
                                    <span>Upload Video File (MP4, WebM, MOV)</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 font-semibold">
                                    Directly uploaded to Supabase Storage
                                </span>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />

                            {uploading ? (
                                <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-2 text-center">
                                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-xs font-bold text-zinc-700">
                                        Uploading Training {activeTab} Video ({uploadProgress}%)...
                                    </p>
                                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : fileName && videoUrl ? (
                                <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <FileVideo className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-zinc-900 truncate">{fileName}</p>
                                            <span className="text-[10px] text-emerald-600 font-bold">✓ Ready & Uploaded</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                        >
                                            Change File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                            title="Delete Video"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-6 bg-white hover:bg-amber-50/50 rounded-xl border border-zinc-200 text-center cursor-pointer transition-all hover:border-amber-400 group"
                                >
                                    <UploadCloud className="w-8 h-8 mx-auto text-amber-500 group-hover:scale-110 transition-transform mb-2" />
                                    <p className="text-xs font-black text-zinc-800">
                                        Pindutin dito para mag-upload ng video file
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Tumatanggap ng MP4, WebM, o MOV files
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Video Source Option 2: Direct URL / YouTube */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                                <span>O maglagay ng Direct Video URL / YouTube Link</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=... o direct .mp4 link"
                                    className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-red-600 focus:bg-white transition-all"
                                />
                                {videoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                        title="Delete Video Link"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Delete</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Live Video Preview Box */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-red-600" />
                                    <span>Live Video Player Preview</span>
                                </label>
                                {hasActiveVideo && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-[10px] font-black text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete Video {activeTab}</span>
                                    </button>
                                )}
                            </div>

                            {videoUrl ? (
                                <div className="rounded-2xl overflow-hidden border border-zinc-300 bg-black aspect-video relative flex items-center justify-center shadow-inner">
                                    {youtubeEmbed ? (
                                        <iframe
                                            src={youtubeEmbed}
                                            title={`Training Video ${activeTab}`}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <video
                                            key={videoUrl}
                                            src={videoUrl}
                                            controls
                                            playsInline
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center text-zinc-400 space-y-1">
                                    <Video className="w-8 h-8 mx-auto text-zinc-300" />
                                    <p className="text-xs font-bold text-zinc-500">
                                        Walang video na naka-load sa Training {activeTab}
                                    </p>
                                    <p className="text-[10px]">
                                        Mag-upload ng video file o mag-paste ng URL sa itaas para makita ang live preview.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    {!isPageSection && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            Close
                        </button>
                    )}
                    {hasActiveVideo && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Video {activeTab}</span>
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    disabled={saving || uploading}
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                    {saving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Save Training Video {activeTab}</span>
                        </>
                    )}
                </button>
            </div>

            {/* ===== POP-UP: SUCCESSFUL UPLOAD & SAVE MODAL ===== */}
            <AnimatePresence>
                {showSuccessPopup && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl border border-amber-300 p-6 max-w-sm w-full shadow-2xl relative text-center space-y-4"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300">
                                    ✓ Video Upload Successful
                                </span>
                                <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1">
                                    {successMessage.title}
                                </h3>
                                <p className="text-xs text-zinc-600 mt-1 font-medium leading-relaxed">
                                    {successMessage.subtitle}
                                </p>
                            </div>

                            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-left space-y-1 text-xs">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                                    Module Details:
                                </span>
                                <p className="font-extrabold text-zinc-900 truncate">
                                    Training {activeTab}: {title}
                                </p>
                                {fileName && (
                                    <p className="text-[10px] text-zinc-500 font-mono truncate">
                                        File: {fileName}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowSuccessPopup(false)}
                                className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:from-red-700 hover:to-amber-600 transition-all cursor-pointer"
                            >
                                Continue / Okay
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== POP-UP: DELETE CONFIRMATION MODAL ===== */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl border border-rose-200 p-6 max-w-sm w-full shadow-2xl relative text-center space-y-4"
                        >
                            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                <AlertTriangle className="w-8 h-8" />
                            </div>

                            <div>
                                <h3 className="text-base font-black text-zinc-950">
                                    Delete Training {activeTab} Video?
                                </h3>
                                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                                    Sigurado ka bang nais mong tanggalin ang video para sa <strong>Training {activeTab}</strong>?
                                    Mawawala ang link at file para sa mga aplikante.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={handleDeleteVideo}
                                    className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {deleting ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Yes, Delete</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== POP-UP: DELETE SUCCESS TOAST ===== */}
            <AnimatePresence>
                {showDeleteSuccessPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed bottom-6 right-6 z-70 bg-zinc-950 text-white p-4 rounded-2xl shadow-2xl border border-zinc-800 flex items-center gap-3 text-xs font-bold"
                    >
                        <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                        </div>
                        <span>Training {activeTab} Video has been successfully deleted & reset.</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SQL Setup Modal */}
            <AnimatePresence>
                {showSqlModal && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-950 text-white rounded-3xl border border-zinc-800 p-5 sm:p-6 max-w-lg w-full shadow-2xl relative space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <Code className="w-5 h-5 text-amber-400" />
                                    <h4 className="text-sm font-black uppercase tracking-wide">
                                        Supabase SQL Setup for Training Videos
                                    </h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSqlModal(false)}
                                    className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-zinc-400">
                                I-paste ito sa iyong Supabase SQL Editor kung nais mong mag-create ng dedicated <code className="text-amber-300">training_videos</code> table. Kahit hindi mo ito i-run agad, gagana pa rin ito gamit ang auto-resilient local cache at system_settings.
                            </p>

                            <pre className="p-3 bg-black rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-52 border border-zinc-800">
                                {TRAINING_VIDEOS_SQL_SETUP}
                            </pre>

                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={handleCopySql}
                                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowSqlModal(false)}
                                    className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );

    // If it's a section inside the Owner Portal, render directly:
    if (isPageSection) {
        return (
            <div className="space-y-4">
                {content}
            </div>
        );
    }

    // Otherwise render as a modal popup
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="max-w-3xl w-full my-auto">
                {content}
            </div>
        </div>
    );
};
