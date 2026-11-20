import React, { useState, useEffect, useRef } from 'react';
import {
    type TrainingVideo,
    fetchTrainingVideos,
    saveTrainingVideo,
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
    Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrainingVideoManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TrainingVideoManager: React.FC<TrainingVideoManagerProps> = ({ isOpen, onClose }) => {
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
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        if (isOpen) {
            loadVideos();
        }
    }, [isOpen]);

    // When tab changes, populate form
    useEffect(() => {
        const current = videos.find(v => v.id === activeTab);
        if (current) {
            setTitle(current.title);
            setDescription(current.description);
            setVideoUrl(current.video_url || '');
            setFileName(current.file_name || '');
            setErrorMessage(null);
            setSaveSuccess(false);
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
            setSaveSuccess(false);
        } catch (err: any) {
            setErrorMessage(err.message || 'Video upload failed. You can paste a direct video or YouTube URL instead.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Save active video
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
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to save training video.');
        } finally {
            setSaving(false);
        }
    };

    const handleClearVideo = () => {
        setVideoUrl('');
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
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

    const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl border border-zinc-200 max-w-3xl w-full shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-red-600 to-amber-500 rounded-xl text-white shadow-md">
                            <Video className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                                    Training Videos Manager
                                </h3>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                                    Step 3
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-medium">
                                Mag-upload o maglagay ng Training 1, 2, at 3 para sa mga aplikante
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowSqlModal(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                            title="Database Table SQL Setup"
                        >
                            <Code className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">SQL Setup</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
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
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                                    isActive
                                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-red-500/30'
                                        : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider block">
                                        Training {num}
                                    </span>
                                    {hasUrl ? (
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-emerald-500'}`} title="Video uploaded" />
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Pending video" />
                                    )}
                                </div>
                                <span className={`text-[10px] font-semibold truncate block mt-0.5 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                    {hasUrl ? '✓ Video Ready' : 'No video yet'}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                            <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-bold">Loading training video details...</span>
                        </div>
                    ) : (
                        <>
                            {/* Error or Success Alerts */}
                            {errorMessage && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {saveSuccess && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-black flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Training Video {activeTab} saved successfully! Live na ito sa applicant portal.</span>
                                </div>
                            )}

                            {/* Title & Description Fields */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-wider text-zinc-800 block mb-1">
                                        Training Video {activeTab} Title <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={`e.g. Training ${activeTab}: Sales Script & Pitching Mastery`}
                                        className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-300 rounded-xl focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase tracking-wider text-zinc-800 block mb-1">
                                        Module Description & Instructions
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Maikling gabay kung ano ang matututunan ng applicant sa video na ito..."
                                        className="w-full px-3.5 py-2 text-xs font-medium border border-zinc-300 rounded-xl focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white resize-none"
                                    />
                                </div>
                            </div>

                            {/* Video Source Upload / URL Section */}
                            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                                        <FileVideo className="w-4 h-4 text-red-600" />
                                        <span>Video Source (File Upload o Direct Video URL)</span>
                                    </span>
                                    {videoUrl && (
                                        <button
                                            type="button"
                                            onClick={handleClearVideo}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Remove Video</span>
                                        </button>
                                    )}
                                </div>

                                {/* Option 1: File Upload */}
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full p-4 border-2 border-dashed border-zinc-300 hover:border-red-500 rounded-xl bg-white hover:bg-red-50/20 text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                            <UploadCloud className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-bold text-zinc-800">
                                            {uploading
                                                ? `Uploading video file (${uploadProgress}%)...`
                                                : 'Click here to upload Video File (MP4, WebM, MOV)'}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            Automatic na mai-upload sa Supabase Storage para mapanood ng applicants
                                        </span>
                                    </button>
                                </div>

                                {/* Option 2: Direct Video URL or YouTube */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                                        <label className="text-[11px] font-bold text-zinc-700">
                                            O mag-paste ng Direct Video URL (YouTube, Vimeo, Google Drive, MP4 CDN):
                                        </label>
                                    </div>
                                    <input
                                        type="url"
                                        value={videoUrl}
                                        onChange={(e) => {
                                            setVideoUrl(e.target.value);
                                            setFileName('');
                                        }}
                                        placeholder="https://www.youtube.com/watch?v=... o https://.../video.mp4"
                                        className="w-full px-3.5 py-2 text-xs font-mono border border-zinc-300 rounded-xl focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none bg-white"
                                    />
                                </div>

                                {fileName && (
                                    <div className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                                        <span>Uploaded File:</span>
                                        <span className="text-zinc-800 font-mono">{fileName}</span>
                                    </div>
                                )}
                            </div>

                            {/* Live Video Preview Box */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-red-600" />
                                    <span>Live Video Player Preview</span>
                                </label>

                                {videoUrl ? (
                                    <div className="rounded-2xl overflow-hidden border border-zinc-300 bg-black aspect-video relative flex items-center justify-center">
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
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        disabled={saving || uploading}
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
            </motion.div>

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
};
