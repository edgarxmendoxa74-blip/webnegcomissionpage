import { supabase } from './supabase';

export interface TrainingVideo {
    id: 1 | 2 | 3;
    title: string;
    description: string;
    video_url: string;
    file_name?: string;
    duration?: string;
    updated_at?: string;
}

export const DEFAULT_TRAINING_VIDEOS: TrainingVideo[] = [
    {
        id: 1,
        title: 'Training 1: Sales Consultant Pitch & SmartMenu Overview',
        description: 'Panimulang gabay sa SmartMenu, uncapped commissions, at tamang diskarte sa pag-pitch sa mga may-ari ng restaurant.',
        video_url: '',
        file_name: '',
        duration: '10-15 mins',
        updated_at: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Training 2: Objection Handling & Cold Calling Techniques',
        description: 'Paano sagutin ang "Masyadong mahal", "Wala kaming oras", at paano makipag-usap nang may kumpiyansa sa tawag.',
        video_url: '',
        file_name: '',
        duration: '15-20 mins',
        updated_at: new Date().toISOString()
    },
    {
        id: 3,
        title: 'Training 3: Closing the Deal & Dashboard Lead Submission',
        description: 'Hakbang sa pag-secure ng client commitment, pag-submit ng details sa dashboard, at payout process ng commission.',
        video_url: '',
        file_name: '',
        duration: '10-15 mins',
        updated_at: new Date().toISOString()
    }
];

const LOCAL_STORAGE_KEY = 'smartmenu_training_videos_v1';
const WATCHED_STORAGE_KEY = 'smartmenu_applicant_watched_videos_v1';

/**
 * Fetch all 3 training videos (Supabase + LocalStorage fallback)
 */
export const fetchTrainingVideos = async (): Promise<TrainingVideo[]> => {
    // 1. Check local storage first for quick load
    let currentVideos = [...DEFAULT_TRAINING_VIDEOS];
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                currentVideos = DEFAULT_TRAINING_VIDEOS.map(def => {
                    const found = parsed.find((p: any) => p.id === def.id);
                    return found ? { ...def, ...found } : def;
                });
            }
        }
    } catch {
        // ignore parse error
    }

    // 2. Try fetching from Supabase table `training_videos`
    try {
        const { data, error } = await supabase
            .from('training_videos')
            .select('*')
            .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
            currentVideos = DEFAULT_TRAINING_VIDEOS.map(def => {
                const found = data.find((d: any) => d.id === def.id);
                return found ? { ...def, ...found } : def;
            });
            // Update local cache
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentVideos));
            } catch {
                // ignore
            }
            return currentVideos;
        }
    } catch {
        // Fallback to local storage if table is not yet created
    }

    // 3. Try checking system_settings if training_videos table does not exist
    try {
        const { data: settingData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'training_videos')
            .maybeSingle();

        if (settingData?.value) {
            const parsed = typeof settingData.value === 'string' ? JSON.parse(settingData.value) : settingData.value;
            if (Array.isArray(parsed)) {
                currentVideos = DEFAULT_TRAINING_VIDEOS.map(def => {
                    const found = parsed.find((p: any) => p.id === def.id);
                    return found ? { ...def, ...found } : def;
                });
                try {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentVideos));
                } catch {
                    // ignore
                }
                return currentVideos;
            }
        }
    } catch {
        // ignore
    }

    return currentVideos;
};

/**
 * Save / Update a training video (for Owner)
 */
export const saveTrainingVideo = async (video: TrainingVideo): Promise<TrainingVideo[]> => {
    // Fetch current list
    const list = await fetchTrainingVideos();
    const updated = list.map(v => (v.id === video.id ? { ...video, updated_at: new Date().toISOString() } : v));

    // Save to LocalStorage immediately
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('smartmenu_training_videos_changed', { detail: updated }));
    } catch {
        // ignore
    }

    // Try saving to Supabase `training_videos` table
    try {
        const { error } = await supabase
            .from('training_videos')
            .upsert([{
                id: video.id,
                title: video.title,
                description: video.description,
                video_url: video.video_url,
                file_name: video.file_name || null,
                duration: video.duration || null,
                updated_at: new Date().toISOString()
            }], { onConflict: 'id' });

        if (error) {
            console.warn('Could not upsert into training_videos table, attempting system_settings:', error.message);
            // Fallback: save to system_settings
            await supabase
                .from('system_settings')
                .upsert([{
                    key: 'training_videos',
                    value: JSON.stringify(updated),
                    updated_at: new Date().toISOString()
                }], { onConflict: 'key' });
        }
    } catch (err) {
        console.warn('Network or DB error saving training video:', err);
    }

    return updated;
};

/**
 * Delete / Reset a training video (for Owner)
 */
export const deleteTrainingVideo = async (videoId: number): Promise<TrainingVideo[]> => {
    const list = await fetchTrainingVideos();
    const defaultItem = DEFAULT_TRAINING_VIDEOS.find(d => d.id === videoId);

    const updated = list.map(v => {
        if (v.id === videoId) {
            return {
                ...v,
                video_url: '',
                file_name: '',
                title: defaultItem?.title || v.title,
                description: defaultItem?.description || v.description,
                updated_at: new Date().toISOString()
            };
        }
        return v;
    });

    // Save to LocalStorage immediately
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('smartmenu_training_videos_changed', { detail: updated }));
    } catch {
        // ignore
    }

    // Try updating Supabase `training_videos` table
    try {
        const { error } = await supabase
            .from('training_videos')
            .update({
                video_url: '',
                file_name: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', videoId);

        if (error) {
            console.warn('Could not update training_videos table on delete:', error.message);
        }
    } catch (err) {
        console.warn('Network or DB error deleting training video:', err);
    }

    // Fallback sync to system_settings
    try {
        await supabase
            .from('system_settings')
            .upsert([{
                key: 'training_videos',
                value: JSON.stringify(updated),
                updated_at: new Date().toISOString()
            }], { onConflict: 'key' });
    } catch {
        // ignore
    }

    return updated;
};

/**
 * Upload Video File to Supabase Storage Bucket ('profiles' or 'training_videos')
 */
export const uploadTrainingVideoFile = async (
    file: File,
    videoId: number,
    onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string; fileSize: string }> => {
    const ext = file.name.split('.').pop() || 'mp4';
    const fileName = `training_video_${videoId}_${Date.now()}.${ext}`;
    const filePath = `training_videos/${fileName}`;

    if (onProgress) onProgress(20);

    // Try storage in 'profiles' bucket (already verified to exist)
    const { error: upErr } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type || 'video/mp4'
        });

    if (onProgress) onProgress(80);

    if (upErr) {
        console.warn('Supabase storage upload failed:', upErr.message);
        throw new Error(`Upload failed: ${upErr.message}. You can also paste a direct YouTube or video URL.`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

    if (onProgress) onProgress(100);

    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);

    return {
        url: publicUrl,
        fileName: file.name,
        fileSize: `${fileSizeMb} MB`
    };
};

/**
 * Applicant Watched Tracking
 */
export const getWatchedVideoIds = (applicantKey = 'current'): number[] => {
    try {
        const raw = localStorage.getItem(`${WATCHED_STORAGE_KEY}_${applicantKey}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // ignore
    }
    return [];
};

export const markVideoWatched = (videoId: number, applicantKey = 'current'): number[] => {
    const current = getWatchedVideoIds(applicantKey);
    if (!current.includes(videoId)) {
        const updated = [...current, videoId].sort((a, b) => a - b);
        try {
            localStorage.setItem(`${WATCHED_STORAGE_KEY}_${applicantKey}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('smartmenu_watched_videos_changed', { detail: updated }));
        } catch {
            // ignore
        }
        return updated;
    }
    return current;
};

export const resetWatchedVideos = (applicantKey = 'current'): void => {
    try {
        localStorage.removeItem(`${WATCHED_STORAGE_KEY}_${applicantKey}`);
        window.dispatchEvent(new CustomEvent('smartmenu_watched_videos_changed', { detail: [] }));
    } catch {
        // ignore
    }
};

/**
 * SQL Setup script for owner reference if they wish to create training_videos table in Supabase
 */
export const TRAINING_VIDEOS_SQL_SETUP = `
-- Create training_videos table
CREATE TABLE IF NOT EXISTS public.training_videos (
    id INT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    file_name TEXT,
    duration TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to training_videos"
ON public.training_videos FOR SELECT USING (true);

-- Allow public or authenticated write
CREATE POLICY "Allow authenticated or anon insert/update to training_videos"
ON public.training_videos FOR ALL USING (true);
`;
