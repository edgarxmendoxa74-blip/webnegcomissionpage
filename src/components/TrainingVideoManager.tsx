import React, { useState, useEffect, useRef } from 'react';
import {
    type TrainingVideo,
    fetchTrainingVideos,
    saveTrainingVideo,
    deleteTrainingVideo,
    uploadTrainingVideoFile,
} from '../lib/trainingVideos';
import {
    Video,
    UploadCloud,
    Save,
    Trash2,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    FileVideo,
    AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrainingVideoManagerProps {
    isOpen?: boolean;
    onClose?: () => void;
    isPageSection?: boolean;
}

export const TrainingVideoManager: React.FC<TrainingVideoManagerProps> = ({
    isOpen = true,
    onClose: _onClose,
    isPageSection = false
}) => {
    const [videos, setVideos] = useState<TrainingVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (isOpen || isPageSection) loadVideos();
    }, [isOpen, isPageSection]);

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
            setSuccessMessage({
                title: `Training ${activeTab} uploaded!`,
                subtitle: `"${res.fileName}" is now live for applicants.`
            });
            setShowSuccessPopup(true);
        } catch (err: any) {
            setErrorMessage(err.message || 'Upload failed. Try pasting a URL instead.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            setErrorMessage('Please enter a title.');
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
                title: `Training ${activeTab} saved!`,
                subtitle: 'Changes are now live for applicants.'
            });
            setShowSuccessPopup(true);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

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

    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return null;
        try {
            if (url.includes('youtube.com/watch')) {
                const vid = new URL(url).searchParams.get('v');
                return vid ? `https://www.youtube.com/embed/${vid}` : null;
            }
            if (url.includes('youtu.be/')) {
                const vid = url.split('youtu.be/')[1]?.split('?')[0];
                return vid ? `https://www.youtube.com/embed/${vid}` : null;
            }
        } catch { return null; }
        return null;
    };

    const getDriveEmbedUrl = (url: string) => {
        if (!url) return null;
        try {
            const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
        } catch { return null; }
        return null;
    };

    const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);
    const driveEmbed = getDriveEmbedUrl(videoUrl);
    const isDirectVideoFile = Boolean(
        videoUrl && (
            fileName ||
            videoUrl.includes('/storage/v1/object/public/') ||
            videoUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)
        )
    );

    if (!isOpen && !isPageSection) return null;

    const hasActiveVideo = Boolean(videoUrl);

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-2">

            {/* Page title */}
            <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">Training Videos</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Manage the 3 training videos shown to applicants in Step 3.</p>
            </div>

            {/* Module tabs */}
            <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((num) => {
                    const v = videos.find(item => item.id === num);
                    const hasUrl = !!v?.video_url;
                    const isActive = activeTab === num;
                    return (
                        <button
                            key={num}
                            type="button"
                            onClick={() => setActiveTab(num)}
                            className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">Module {num}</span>
                                {hasUrl
                                    ? <span className="text-[9px] font-bold text-emerald-500">● Live</span>
                                    : <span className="text-[9px] font-bold text-zinc-400">○ Empty</span>
                                }
                            </div>
                            <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
                                {v?.file_name || v?.title || 'No video yet'}
                            </p>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                    <span className="text-sm">Loading...</span>
                </div>
            ) : (
                <div className="space-y-5">

                    {/* Error */}
                    {errorMessage && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMessage}
                        </div>
                    )}

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-600">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Training 1: Sales Pitch Overview"
                            className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-600">Description</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe what applicants will learn..."
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 transition-colors resize-none"
                        />
                    </div>

                    {/* Video source */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-zinc-600">Video Source</label>

                        {/* Upload area */}
                        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />

                        {uploading ? (
                            <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-zinc-600">
                                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
                                    Uploading... {uploadProgress}%
                                </div>
                                <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-zinc-800 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        ) : fileName && videoUrl ? (
                            <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileVideo className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-sm font-medium text-zinc-800 truncate">{fileName}</span>
                                    <span className="text-xs text-emerald-600 font-medium shrink-0">✓ Uploaded</span>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-2.5 py-1 text-xs border border-zinc-300 bg-white rounded-lg hover:bg-zinc-50 cursor-pointer"
                                    >
                                        Replace
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-3 p-4 border border-dashed border-zinc-300 rounded-xl bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 transition-colors cursor-pointer text-left"
                            >
                                <UploadCloud className="w-5 h-5 text-zinc-400 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-zinc-700">Upload a video file</p>
                                    <p className="text-xs text-zinc-400">MP4, WebM, or MOV</p>
                                </div>
                            </button>
                        )}

                        {/* URL input */}
                        <div className="flex items-center gap-2">
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="Or paste a YouTube / direct video URL"
                                className="flex-1 px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 transition-colors"
                            />
                            {videoUrl && !fileName && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2.5 text-red-500 hover:bg-red-50 border border-zinc-200 rounded-xl cursor-pointer transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Video preview */}
                    {videoUrl ? (
                        <div className="rounded-xl overflow-hidden border border-zinc-200 bg-black aspect-video">
                            {youtubeEmbed ? (
                                <iframe src={youtubeEmbed} title={`Training ${activeTab}`} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            ) : driveEmbed ? (
                                <iframe src={driveEmbed} title={`Training ${activeTab}`} className="w-full h-full border-0" allow="autoplay" allowFullScreen />
                            ) : isDirectVideoFile ? (
                                <video key={videoUrl} src={videoUrl} controls playsInline className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
                                    <Video className="w-8 h-8 text-zinc-600" />
                                    <p className="text-xs text-zinc-500 max-w-xs text-center truncate px-4">{videoUrl}</p>
                                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors">
                                        <ExternalLink className="w-3.5 h-3.5" /> Open link
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 p-6 border border-dashed border-zinc-200 rounded-xl text-zinc-400">
                            <Video className="w-5 h-5" />
                            <span className="text-sm">No video for Module {activeTab} yet</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                        {hasActiveVideo ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-zinc-200 rounded-xl transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete video
                            </button>
                        ) : <div />}

                        <button
                            type="button"
                            disabled={saving || uploading}
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-5 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Module {activeTab}
                        </button>
                    </div>
                </div>
            )}

            {/* Success popup */}
            <AnimatePresence>
                {showSuccessPopup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl border border-zinc-200 p-6 max-w-sm w-full shadow-xl text-center space-y-4"
                        >
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">{successMessage.title}</h3>
                                <p className="text-sm text-zinc-500 mt-1">{successMessage.subtitle}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSuccessPopup(false)}
                                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete confirm */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl border border-zinc-200 p-6 max-w-sm w-full shadow-xl text-center space-y-4"
                        >
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">Delete Module {activeTab} video?</h3>
                                <p className="text-sm text-zinc-500 mt-1">The video will be removed and applicants won't see it anymore.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="py-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={handleDeleteVideo}
                                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {deleting
                                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : 'Delete'
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete success toast */}
            <AnimatePresence>
                {showDeleteSuccessPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-zinc-900 text-white text-sm rounded-xl shadow-lg"
                    >
                        <Trash2 className="w-4 h-4 text-red-400" />
                        Module {activeTab} video deleted.
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
