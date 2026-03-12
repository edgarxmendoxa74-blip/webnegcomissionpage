import React, { useState, useEffect } from 'react';
import {
    Save,
    Image as ImageIcon,
    Camera,
    Plus,
    X,
    CheckCircle2,
    Trash2,
    QrCode,
    Mail,
    Phone,
    Wallet,
    Briefcase,
    Eye,
    EyeOff,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AppSettings {
    logo_url: string;
    app_name: string;
}

interface Worker {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    gcash_number: string;
    qr_code_url: string;
    photo_url: string;
    contact_email?: string;
    commission_percentage: number;
    active: boolean;
    assigned_webdev_id?: string;
    created_at: string;
}

export const SettingsPage: React.FC = () => {
    // App Settings State
    const [appSettings, setAppSettings] = useState<AppSettings>({ logo_url: '', app_name: 'WebNegosyo' });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

    // Workers State
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loadingWorkers, setLoadingWorkers] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
    const [showDealsModal, setShowDealsModal] = useState(false);
    const [allDeals, setAllDeals] = useState<any[]>([]);
    const [loadingDeals, setLoadingDeals] = useState(false);
    const [, setSelectedWorkerId] = useState<string | null>(null);
    const [selectedWorkerName, setSelectedWorkerName] = useState<string | null>(null);

    // Form State for Worker
    const [workerFormData, setWorkerFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Agent',
        gcash_number: '',
        contact_email: '',
        commission_percentage: 10,
        assigned_webdev_id: '',
        active: true
    });
    const [workerPhotoFile, setWorkerPhotoFile] = useState<File | null>(null);
    const [workerQrFile, setWorkerQrFile] = useState<File | null>(null);

    useEffect(() => {
        fetchAppSettings();
        fetchWorkers();
    }, []);

    const fetchAppSettings = async () => {
        const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (data) setAppSettings(data);
    };

    const fetchWorkers = async () => {
        setLoadingWorkers(true);
        const { data } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
        if (data) setWorkers(data);
        setLoadingWorkers(false);
    };

    const handleUpload = async (file: File, bucket: string, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrl;
    };

    const handleUpdateLogo = async () => {
        if (!logoFile) return;
        setIsUpdatingLogo(true);
        try {
            const logo_url = await handleUpload(logoFile, 'profiles', 'app');
            const { error } = await supabase.from('app_settings').update({ logo_url }).eq('id', 1);
            if (error) throw error;
            setAppSettings(prev => ({ ...prev, logo_url }));
            setLogoFile(null);
            alert('Logo updated successfully!');
        } catch (err) {
            console.error('Error updating logo:', err);
            alert('Failed to update logo.');
        } finally {
            setIsUpdatingLogo(false);
        }
    };

    const handleWorkerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingWorker(true);
        try {
            let photo_url = editingWorker?.photo_url || '';
            let qr_code_url = editingWorker?.qr_code_url || '';

            if (workerPhotoFile) photo_url = await handleUpload(workerPhotoFile, 'profiles', 'photos');
            if (workerQrFile) qr_code_url = await handleUpload(workerQrFile, 'profiles', 'qrcodes');

            // Handle Username to Pseudo-Email transition
            let emailValue = workerFormData.email.trim().toLowerCase();
            if (!emailValue.includes('@')) {
                emailValue = `${emailValue}@webnegosyo.internal`;
            }

            const payload = {
                ...workerFormData,
                email: emailValue,
                photo_url,
                qr_code_url,
                assigned_webdev_id: workerFormData.assigned_webdev_id || null
            };

            if (editingWorker) {
                const { error } = await supabase.from('workers').update(payload).eq('id', editingWorker.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('workers').insert([payload]);
                if (error) throw error;
            }

            setShowAddModal(false);
            setEditingWorker(null);
            resetWorkerForm();
            fetchWorkers();
        } catch (err) {
            console.error('Error saving worker:', err);
        } finally {
            setIsSubmittingWorker(false);
        }
    };

    const handleToggleVisibility = async (worker: Worker) => {
        const action = worker.active ? 'hide' : 'unhide';
        if (!confirm(`Are you sure you want to ${action} this person?`)) return;
        try {
            const { error } = await supabase.from('workers').update({ active: !worker.active }).eq('id', worker.id);
            if (error) throw error;
            fetchWorkers();
        } catch (err) {
            console.error(`Error trying to ${action} worker:`, err);
        }
    };

    const handleDeleteWorker = async (id: string) => {
        if (!confirm('Are you sure you want to delete this person?')) return;
        try {
            const { error } = await supabase.from('workers').delete().eq('id', id);
            if (error) throw error;
            fetchWorkers();
        } catch (err) {
            console.error('Error deleting worker:', err);
        }
    };

    const fetchAllDeals = async (workerId?: string) => {
        setLoadingDeals(true);
        try {
            let query = supabase
                .from('leads')
                .select('*, worker:workers!worker_id(name), webdev:workers!webdev_id(name)')
                .order('created_at', { ascending: false });

            if (workerId) {
                query = query.eq('worker_id', workerId);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (data) setAllDeals(data);
        } catch (err) {
            console.error('Error fetching all deals:', err);
        } finally {
            setLoadingDeals(false);
        }
    };

    const resetWorkerForm = () => {
        setWorkerFormData({ name: '', email: '', contact_email: '', phone: '', role: 'Agent', gcash_number: '', commission_percentage: 10, assigned_webdev_id: '', active: true });
        setWorkerPhotoFile(null);
        setWorkerQrFile(null);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in duration-700 pb-20">
            {/* GENERAL SECTION */}
            <section className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                        <Save className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase italic text-black leading-none">General Section</h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Application Branding & Settings</p>
                    </div>
                </div>

                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm overflow-hidden relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h3 className="text-xl font-black tracking-tight text-black">App Logo</h3>
                            <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                                Customize your application's identity by uploading a custom logo. This will appear on receipts and navigation sidebars.
                            </p>

                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <div className="w-32 h-32 bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-100 flex items-center justify-center overflow-hidden transition-all group-hover:border-black/20">
                                        {logoFile ? (
                                            <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-contain p-4" alt="Preview" />
                                        ) : appSettings.logo_url ? (
                                            <img src={appSettings.logo_url} className="w-full h-full object-contain p-4" alt="Logo" />
                                        ) : (
                                            <ImageIcon className="w-10 h-10 text-zinc-200" />
                                        )}
                                        <input
                                            title="Upload logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                </div>

                                {logoFile && (
                                    <button
                                        onClick={handleUpdateLogo}
                                        disabled={isUpdatingLogo}
                                        className="px-8 py-3.5 bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isUpdatingLogo ? 'Updating...' : 'Save Logo'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="hidden md:flex justify-center">
                            <div className="p-8 bg-zinc-50 rounded-[3rem] border border-zinc-100 rotate-3">
                                <div className="p-6 bg-white rounded-2xl shadow-xl flex items-center gap-4">
                                    <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-black">WN</div>
                                    <div className="h-2 w-24 bg-zinc-100 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SIGN UP NEW PEOPLE SECTION */}
            <section className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                            <Plus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic text-black leading-none">Sign Up New People</h2>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Manage Team Roles & Onboarding</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setSelectedWorkerId(null);
                                setSelectedWorkerName(null);
                                fetchAllDeals();
                                setShowDealsModal(true);
                            }}
                            className="px-8 py-4 bg-zinc-100 text-black border border-zinc-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-3"
                        >
                            <Briefcase className="w-4 h-4" />
                            Show All Deals List
                        </button>
                        <button
                            onClick={() => { resetWorkerForm(); setShowAddModal(true); }}
                            className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                            <Plus className="w-4 h-4" />
                            Onboard Person
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Identity</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Contact Info</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payment (GCash)</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {loadingWorkers ? (
                                    <tr className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-20 text-center text-zinc-300 font-black uppercase tracking-widest text-xs">Loading team records...</td>
                                    </tr>
                                ) : workers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-zinc-400 font-medium">No team members onboarded yet.</td>
                                    </tr>
                                ) : workers.map(worker => (
                                    <tr key={worker.id} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0">
                                                    {worker.photo_url ? (
                                                        <img src={worker.photo_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <span className="text-zinc-400 font-black">{worker.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-black text-sm">{worker.name}</div>
                                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{worker.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                                                    <Mail className="w-3 h-3 text-zinc-300" />
                                                    {worker.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                                    <Phone className="w-3 h-3 text-zinc-300" />
                                                    {worker.phone || 'No phone'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-black uppercase tracking-widest">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                {worker.gcash_number || 'NOT SET'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorkerId(worker.id);
                                                        setSelectedWorkerName(worker.name);
                                                        fetchAllDeals(worker.id);
                                                        setShowDealsModal(true);
                                                    }}
                                                    title="Show Deals"
                                                    className="p-3 bg-zinc-100 text-black rounded-xl hover:bg-black hover:text-white transition-all active:scale-90"
                                                >
                                                    <Briefcase className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleVisibility(worker)}
                                                    title={worker.active ? "Hide Record" : "Unhide Record"}
                                                    className={cn(
                                                        "p-3 rounded-xl transition-all active:scale-90",
                                                        worker.active
                                                            ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-300 hover:text-black"
                                                            : "bg-green-50 text-green-500 hover:bg-green-500 hover:text-white"
                                                    )}
                                                >
                                                    {worker.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteWorker(worker.id)}
                                                    title="Delete Record"
                                                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Modal for Adding/Editing Workers */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-10 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/30">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter uppercase italic text-black leading-none">{editingWorker ? 'Update Details' : 'New Sign Up'}</h2>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-2">Team Management Form</p>
                                </div>
                                <button title="Close modal" onClick={() => setShowAddModal(false)} className="p-4 hover:bg-white rounded-2xl transition-colors">
                                    <X className="w-6 h-6 text-zinc-300" />
                                </button>
                            </div>

                            <form onSubmit={handleWorkerSubmit} className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    {/* Left Column: Photos */}
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Profile Picture</span>
                                            <div className="relative group aspect-square rounded-[2.5rem] bg-zinc-50 border-2 border-dashed border-zinc-100 flex items-center justify-center overflow-hidden hover:border-black/20 transition-all">
                                                {workerPhotoFile ? (
                                                    <img src={URL.createObjectURL(workerPhotoFile)} className="w-full h-full object-cover" alt="" />
                                                ) : editingWorker?.photo_url ? (
                                                    <img src={editingWorker.photo_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="text-center">
                                                        <Camera className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                                                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Upload Photo</span>
                                                    </div>
                                                )}
                                                <input title="Profile photo" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setWorkerPhotoFile(e.target.files?.[0] || null)} />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">GCash QR Code</span>
                                            <div className="relative group aspect-square rounded-[2.5rem] bg-zinc-50 border-2 border-dashed border-zinc-100 flex items-center justify-center overflow-hidden hover:border-black/20 transition-all">
                                                {workerQrFile ? (
                                                    <img src={URL.createObjectURL(workerQrFile)} className="w-full h-full object-contain p-8" alt="" />
                                                ) : editingWorker?.qr_code_url ? (
                                                    <img src={editingWorker.qr_code_url} className="w-full h-full object-contain p-8" alt="" />
                                                ) : (
                                                    <div className="text-center">
                                                        <QrCode className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                                                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Upload QR</span>
                                                    </div>
                                                )}
                                                <input title="QR Code" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setWorkerQrFile(e.target.files?.[0] || null)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right 2 Columns: Fields */}
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Full Name</span>
                                                <div className="relative">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        required
                                                        title="Full Name"
                                                        placeholder="Enter full name"
                                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                                        value={workerFormData.name}
                                                        onChange={(e) => setWorkerFormData({ ...workerFormData, name: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Professional Role</span>
                                                <div className="relative">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300">
                                                        <Briefcase className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        required
                                                        placeholder="e.g. Lead Developer"
                                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                                        value={workerFormData.role}
                                                        onChange={(e) => setWorkerFormData({ ...workerFormData, role: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Account Username</span>
                                                <div className="relative">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        required
                                                        title="Account Username"
                                                        placeholder="e.g. juan_delacruz"
                                                        type="text"
                                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                                        value={workerFormData.email.split('@')[0]}
                                                        onChange={(e) => setWorkerFormData({ ...workerFormData, email: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Contact Number</span>
                                                <div className="relative">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300">
                                                        <Phone className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        title="Contact Number"
                                                        placeholder="Enter contact number"
                                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                                        value={workerFormData.phone}
                                                        onChange={(e) => setWorkerFormData({ ...workerFormData, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Professional Email</span>
                                                <div className="relative">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300"><Mail className="w-4 h-4" /></div>
                                                    <input
                                                        title="Professional Email"
                                                        placeholder="email@example.com"
                                                        type="email"
                                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                                        value={workerFormData.contact_email}
                                                        onChange={(e) => setWorkerFormData({ ...workerFormData, contact_email: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Cell Number</span>
                                                <div className="relative">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        title="GCash Number"
                                                        placeholder="Enter GCash number"
                                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                                        value={workerFormData.gcash_number}
                                                        onChange={(e) => setWorkerFormData({ ...workerFormData, gcash_number: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Assigned Webdev</span>
                                                <select
                                                    title="Assigned Webdev"
                                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all appearance-none"
                                                    value={workerFormData.assigned_webdev_id}
                                                    onChange={(e) => setWorkerFormData({ ...workerFormData, assigned_webdev_id: e.target.value })}
                                                >
                                                    <option value="">No Webdev Assigned</option>
                                                    {workers.filter(w => w.role.toLowerCase().includes('web') || w.role.toLowerCase().includes('dev')).map(webdev => (
                                                        <option key={webdev.id} value={webdev.id}>{webdev.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Status</span>
                                                <select
                                                    title="Account Status"
                                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all appearance-none"
                                                    value={workerFormData.active ? 'true' : 'false'}
                                                    onChange={(e) => setWorkerFormData({ ...workerFormData, active: e.target.value === 'true' })}
                                                >
                                                    <option value="true">Active Account</option>
                                                    <option value="false">Disabled Account</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="pt-10 border-t border-zinc-50 flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddModal(false)}
                                                className="flex-1 py-4 border border-zinc-100 rounded-2xl font-bold text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all uppercase tracking-widest text-[10px]"
                                            >
                                                Dismiss
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmittingWorker}
                                                className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
                                            >
                                                {isSubmittingWorker ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                {editingWorker ? 'Update Sign Up' : 'Complete Sign Up'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Deals List Modal */}
            <AnimatePresence>
                {showDealsModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setShowDealsModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-10 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/30">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter uppercase italic text-black leading-none">
                                        {selectedWorkerName ? `${selectedWorkerName}'s Deals` : 'Clients Deals List'}
                                    </h2>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-2">
                                        {selectedWorkerName ? `Viewing all projects for ${selectedWorkerName}` : 'All client projects and assignments'}
                                    </p>
                                </div>
                                <button title="Close modal" onClick={() => setShowDealsModal(false)} className="p-4 hover:bg-white rounded-2xl transition-colors">
                                    <X className="w-6 h-6 text-zinc-300" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Date/Month</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Client Info</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Agent</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Webdev</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Package</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Downpayment</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Tip</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Balance</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Commission</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {loadingDeals ? (
                                                    <tr className="animate-pulse">
                                                        <td colSpan={10} className="px-8 py-20 text-center text-zinc-300 font-black uppercase tracking-widest text-xs">Loading deals...</td>
                                                    </tr>
                                                ) : allDeals.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10} className="px-8 py-20 text-center text-zinc-400 font-medium">No deals found.</td>
                                                    </tr>
                                                ) : allDeals.map(deal => (
                                                    <tr key={deal.id} className={cn(
                                                        "group transition-all duration-300",
                                                        deal.payment_status === 'Fully Paid' ? "bg-green-600 text-white" :
                                                            deal.payment_status === 'Downpayment Only' ? "bg-zinc-600 text-white" :
                                                                deal.payment_status === 'Cancelled Project' ? "bg-red-600 text-white" :
                                                                    "hover:bg-zinc-50/50"
                                                    )}>
                                                        <td className="px-6 py-4">
                                                            <div className={cn("font-bold text-xs uppercase tracking-widest", deal.payment_status ? "text-white" : "text-black")}>{deal.month || new Date(deal.created_at).toLocaleString('default', { month: 'short' })}</div>
                                                            <div className={cn("text-[10px] font-black tabular-nums", deal.payment_status ? "text-white/60" : "text-zinc-400")}>{new Date(deal.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={cn("font-bold text-sm", deal.payment_status ? "text-white" : "text-black")}>{deal.client_name}</div>
                                                            <div className={cn("text-[10px] font-medium", deal.payment_status ? "text-white/60" : "text-zinc-400")}>{deal.contact_info}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={cn("text-xs font-bold", deal.payment_status ? "text-white" : "text-black")}>{deal.worker?.name || 'Unknown'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={cn("text-xs font-bold", deal.payment_status ? "text-white" : "text-black")}>{deal.webdev?.name || 'Unassigned'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("text-sm font-black tabular-nums", deal.payment_status ? "text-white" : "text-black")}>₱{Number(deal.deal_value).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("text-sm font-black tabular-nums", deal.payment_status ? "text-white" : "text-amber-600")}>₱{Number(deal.down_payment || 0).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("text-sm font-black tabular-nums", deal.payment_status ? "text-white" : "text-blue-600")}>₱{Number(deal.tip || 0).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("text-sm font-black tabular-nums", deal.payment_status ? "text-white" : "text-red-600")}>
                                                                ₱{Number(
                                                                    (deal.payment_status === 'Cancelled Project' || deal.payment_status === 'Downpayment Only')
                                                                        ? deal.down_payment - (deal.down_payment * 0.1)
                                                                        : deal.payment_status === 'Fully Paid'
                                                                            ? deal.deal_value - (deal.deal_value * (deal.commission_rate || 20) / 100)
                                                                            : deal.deal_value - deal.down_payment
                                                                ).toLocaleString()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                                                                deal.payment_status === 'Fully Paid' ? "bg-white/20 text-white border-white/30" :
                                                                    deal.payment_status === 'Downpayment Only' ? "bg-white/20 text-white border-white/30" :
                                                                        deal.payment_status === 'Cancelled Project' ? "bg-white/20 text-white border-white/30" :
                                                                            "bg-zinc-50 text-zinc-500 border-zinc-100"
                                                            )}>
                                                                {deal.payment_status || 'Downpayment Only'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn("text-sm font-black tabular-nums", deal.payment_status ? "text-white" : "text-green-600")}>
                                                                ₱{Number((deal.payment_status === 'Downpayment Only' || deal.payment_status === 'Cancelled Project') ? (deal.down_payment * 0.1) : (deal.deal_value * (deal.commission_rate || 20) / 100)).toLocaleString()}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))})
                                                {allDeals.length > 0 && (
                                                    <tr className="bg-zinc-50/50 font-black border-t-2 border-zinc-100">
                                                        <td colSpan={6} className="px-6 py-6 text-right text-[10px] uppercase tracking-[0.2em] text-zinc-400">Totals</td>
                                                        <td className="px-6 py-6 text-right text-base text-blue-600 tabular-nums">
                                                            ₱{allDeals.reduce((sum, deal) => sum + (Number(deal.tip) || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-6 text-right text-base text-red-600 tabular-nums">
                                                            ₱{allDeals.reduce((sum, deal) => {
                                                                const balance = (deal.payment_status === 'Cancelled Project' || deal.payment_status === 'Downpayment Only')
                                                                    ? deal.down_payment - (deal.down_payment * 0.1)
                                                                    : deal.payment_status === 'Fully Paid'
                                                                        ? deal.deal_value - (deal.deal_value * (deal.commission_rate || 20) / 100)
                                                                        : deal.deal_value - deal.down_payment;
                                                                return sum + (Number(balance) || 0);
                                                            }, 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-6"></td>
                                                        <td className="px-6 py-6 text-right text-base text-green-600 tabular-nums">
                                                            ₱{allDeals.reduce((sum, deal) => {
                                                                const commission = (deal.payment_status === 'Downpayment Only' || deal.payment_status === 'Cancelled Project')
                                                                    ? (deal.down_payment * 0.1)
                                                                    : (deal.deal_value * (deal.commission_rate || 20) / 100);
                                                                return sum + (Number(commission) || 0);
                                                            }, 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
