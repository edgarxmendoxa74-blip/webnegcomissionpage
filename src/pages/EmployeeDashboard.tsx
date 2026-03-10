import React, { useState, useEffect } from 'react';
import {
    LogOut,
    Save,
    Plus,
    Edit2,
    Trash2,
    X,
    CheckCircle2,
    Camera,
    QrCode,
    Phone,
    Wallet,
    EyeOff,
    User,
    Mail,
    Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Lead {
    id: string;
    client_name: string;
    contact_info: string;
    ad_source: string;
    status: 'pending' | 'closed' | 'failed';
    payment_status: 'Fully Paid' | 'Cancelled Project' | 'Downpayment Only';
    deal_value: number;
    down_payment: number;
    worker_id: string;
    is_hidden: boolean;
    month: string;
    created_at: string;
}

interface ProfileData {
    name: string;
    phone: string;
    email: string;
    gcash_number: string;
    role: string;
    photo_url: string;
    qr_code_url: string;
    contact_email?: string;
}

export const EmployeeDashboard: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'deals' | 'profile'>('deals');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        client_name: '',
        deal_value: 0,
        down_payment: 0,
        payment_status: 'Downpayment Only' as string,
    });

    // Add client form state
    const [addForm, setAddForm] = useState({
        month: new Date().toLocaleString('default', { month: 'long' }),
        date: new Date().toISOString().split('T')[0],
        client_name: '',
        contact_info: '',
        ad_source: 'Direct',
        deal_value: 0,
        down_payment: 0,
        payment_status: 'Downpayment Only' as string,
    });

    // Profile form state
    const [profileForm, setProfileForm] = useState<ProfileData>({
        name: '',
        phone: '',
        email: '',
        gcash_number: '',
        role: '',
        photo_url: '',
        qr_code_url: '',
        contact_email: '',
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    useEffect(() => {
        fetchLeads();
        fetchLogo();
        if (profile) {
            setProfileForm({
                name: profile.name || '',
                phone: profile.phone || '',
                email: profile.email?.split('@')[0] || '',
                gcash_number: profile.gcash_number || '',
                role: profile.role || 'Employee',
                photo_url: profile.photo_url || '',
                qr_code_url: profile.qr_code_url || '',
                contact_email: profile.contact_email || '',
            });
        }
    }, [profile]);

    const fetchLogo = async () => {
        const { data } = await supabase.from('app_settings').select('logo_url').eq('id', 1).single();
        if (data?.logo_url) setLogoUrl(data.logo_url);
    };

    const fetchLeads = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('worker_id', profile.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (lead: Lead) => {
        setEditingId(lead.id);
        setEditForm({
            client_name: lead.client_name,
            deal_value: lead.deal_value,
            down_payment: lead.down_payment,
            payment_status: lead.payment_status || 'Downpayment Only',
        });
    };

    const getBalance = (lead: Lead) => {
        if (lead.payment_status === 'Cancelled Project') return 0;
        return Number(lead.deal_value) - Number(lead.down_payment);
    };

    const saveEdit = async (id: string) => {
        setIsSaving(true);
        try {
            const balance = editForm.deal_value - editForm.down_payment;
            const { error } = await supabase
                .from('leads')
                .update({
                    client_name: editForm.client_name,
                    deal_value: editForm.deal_value,
                    down_payment: editForm.down_payment,
                    payment_status: (editForm.payment_status === 'Cancelled Project' || editForm.payment_status === 'Downpayment Only')
                        ? editForm.payment_status
                        : (balance <= 0 ? 'Fully Paid' : editForm.payment_status),
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                alert(`Error saving changes: ${error.message}`);
                throw error;
            }
            setEditingId(null);
            fetchLeads();
        } catch (err) {
            console.error('Error saving edit:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const balance = addForm.deal_value - addForm.down_payment;
            // Use the manual date or today's time
            const createdAt = new Date(addForm.date).toISOString();

            const { error } = await supabase.from('leads').insert({
                client_name: addForm.client_name,
                contact_info: addForm.contact_info,
                ad_source: addForm.ad_source,
                deal_value: addForm.deal_value,
                down_payment: addForm.down_payment,
                payment_status: (addForm.payment_status === 'Cancelled Project' || addForm.payment_status === 'Downpayment Only')
                    ? addForm.payment_status
                    : (balance <= 0 ? 'Fully Paid' : addForm.payment_status),
                status: 'closed',
                worker_id: profile?.id,
                month: addForm.month,
                closed_at: createdAt,
                created_at: createdAt
            });
            if (error) {
                alert(`Error adding client: ${error.message}`);
                throw error;
            }
            setShowAddModal(false);
            setAddForm({
                month: new Date().toLocaleString('default', { month: 'long' }),
                date: new Date().toISOString().split('T')[0],
                client_name: '',
                contact_info: '',
                ad_source: 'Direct',
                deal_value: 0,
                down_payment: 0,
                payment_status: 'Downpayment Only'
            });
            fetchLeads();
        } catch (err) {
            console.error('Error adding client:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            fetchLeads();
        } catch (err) {
            console.error('Error deleting lead:', err);
        }
    };

    const handleUpload = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('profiles').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);
        return publicUrl;
    };

    const handleProfileSave = async () => {
        if (!profile?.id) return;
        setProfileSaving(true);
        try {
            let photo_url = profileForm.photo_url;
            let qr_code_url = profileForm.qr_code_url;

            if (photoFile) photo_url = await handleUpload(photoFile, 'photos');
            if (qrFile) qr_code_url = await handleUpload(qrFile, 'qrcodes');

            const { error } = await supabase
                .from('workers')
                .update({
                    name: profileForm.name,
                    phone: profileForm.phone,
                    role: profileForm.role,
                    gcash_number: profileForm.gcash_number,
                    photo_url,
                    qr_code_url,
                    contact_email: profileForm.contact_email,
                })
                .eq('id', profile.id);

            if (error) throw error;
            setProfileSuccess(true);
            setIsEditingProfile(false);
            setTimeout(() => setProfileSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving profile:', err);
        } finally {
            setProfileSaving(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#fafafa]">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-zinc-100">
                <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src={logoUrl || "/logo.png"}
                            alt="Logo"
                            className="w-10 h-10 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-black">
                                WEB<span className="font-light text-zinc-400">NEGOSYO</span>
                            </h1>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Employee Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 bg-zinc-50 rounded-2xl px-5 py-2.5">
                            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs overflow-hidden">
                                {profile?.photo_url ? (
                                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    profile?.name?.charAt(0) || 'E'
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-black text-black">{profile?.name || 'Employee'}</p>
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{profile?.role || 'Employee'}</p>
                            </div>
                        </div>
                        <button
                            onClick={signOut}
                            className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Switcher */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8">
                <div className="flex gap-2 bg-white border border-zinc-100 rounded-2xl p-1.5 w-fit shadow-sm">
                    <button
                        onClick={() => setActiveSection('deals')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'deals' ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'
                            }`}
                    >
                        My Deals
                    </button>
                    <button
                        onClick={() => setActiveSection('profile')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'profile' ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'
                            }`}
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
                <AnimatePresence mode="wait">
                    {activeSection === 'deals' ? (
                        <motion.div key="deals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {/* DEALS SECTION */}
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tighter text-black uppercase italic">Client Deals</h2>
                                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Your closed deals and project collections</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Client
                                    </button>
                                </div>

                                {/* Deals Table */}
                                <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Month</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Date</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Client Name</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Package Avail</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Down Payment</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Fully Paid</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Balance</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-green-600 text-right">Commission</th>
                                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {loading ? (
                                                    [1, 2, 3].map(i => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td colSpan={8} className="px-6 py-10"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                                        </tr>
                                                    ))
                                                ) : leads.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-20 text-center">
                                                            <div className="text-zinc-300 mb-4">
                                                                <Briefcase className="w-12 h-12 mx-auto" />
                                                            </div>
                                                            <p className="text-zinc-400 font-bold text-sm">No deals yet</p>
                                                            <p className="text-zinc-300 text-xs mt-1">Click "Add Client" to record your first deal.</p>
                                                        </td>
                                                    </tr>
                                                ) : leads.map((lead) => (
                                                    <tr key={lead.id} className={cn(
                                                        "group transition-colors",
                                                        lead.payment_status === 'Fully Paid' ? "bg-yellow-50/50 hover:bg-yellow-100/50" :
                                                            lead.payment_status === 'Downpayment Only' ? "bg-blue-50/50 hover:bg-blue-100/50" :
                                                                lead.payment_status === 'Cancelled Project' ? "bg-red-50/50 hover:bg-red-100/50" :
                                                                    "hover:bg-zinc-50/50"
                                                    )}>
                                                        <td className="px-6 py-4">
                                                            <span className="font-bold text-black text-xs uppercase tracking-widest">
                                                                {lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs text-zinc-400 font-bold tabular-nums">
                                                                {new Date(lead.created_at).toLocaleDateString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="text"
                                                                    title="Client Name"
                                                                    placeholder="Client name"
                                                                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-black transition-all"
                                                                    value={editForm.client_name}
                                                                    onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                                                                />
                                                            ) : (
                                                                <span className="font-bold text-black text-sm">{lead.client_name}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="number"
                                                                    title="Package Value"
                                                                    placeholder="0"
                                                                    className="w-28 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-black transition-all text-right"
                                                                    value={editForm.deal_value || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, deal_value: Number(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-black text-black tabular-nums">₱{Number(lead.deal_value).toLocaleString()}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="number"
                                                                    title="Down Payment"
                                                                    placeholder="0"
                                                                    className="w-28 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-black transition-all text-right"
                                                                    value={editForm.down_payment || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, down_payment: Number(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-black text-amber-600 tabular-nums">₱{Number(lead.down_payment).toLocaleString()}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {editingId === lead.id ? (
                                                                <select
                                                                    title="Payment Status"
                                                                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black transition-all"
                                                                    value={editForm.payment_status}
                                                                    onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                                                                >
                                                                    <option value="Downpayment Only">Downpayment Only</option>
                                                                    <option value="Fully Paid">Fully Paid</option>
                                                                    <option value="Cancelled Project">Cancelled Project</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${lead.payment_status === 'Fully Paid'
                                                                    ? 'bg-green-50 text-green-600 border-green-100'
                                                                    : lead.payment_status === 'Downpayment Only'
                                                                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                                        : lead.payment_status === 'Cancelled Project'
                                                                            ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                                                            : 'bg-red-50 text-red-500 border-red-100'
                                                                    }`}>
                                                                    {lead.payment_status || 'Downpayment Only'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`text-sm font-black tabular-nums ${getBalance(lead) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ₱{Math.abs(getBalance(lead)).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-sm font-black text-green-600 tabular-nums">
                                                                ₱{Number(lead.deal_value * (lead.payment_status === 'Cancelled Project' ? 0.1 : 0.2)).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {editingId === lead.id ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => saveEdit(lead.id)}
                                                                            disabled={isSaving}
                                                                            className="p-2 bg-black text-white rounded-xl hover:shadow-lg transition-all active:scale-90 disabled:opacity-50"
                                                                            title="Save"
                                                                        >
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingId(null)}
                                                                            className="p-2 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-all active:scale-90"
                                                                            title="Cancel"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => startEditing(lead)}
                                                                            className="p-2 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-black hover:text-white transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteLead(lead.id)}
                                                                            className="p-2 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {/* PROFILE SECTION */}
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tighter text-black uppercase italic">My Profile</h2>
                                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Your personal and payment information</p>
                                    </div>
                                    {!isEditingProfile && (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit Profile
                                        </button>
                                    )}
                                </div>

                                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm relative">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                        {/* Photo Uploads */}
                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Profile Picture</span>
                                                <div className="relative group aspect-square rounded-[2.5rem] bg-zinc-50 border-2 border-dashed border-zinc-100 flex items-center justify-center overflow-hidden hover:border-black/20 transition-all">
                                                    {photoFile ? (
                                                        <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover" alt="" />
                                                    ) : profileForm.photo_url ? (
                                                        <img src={profileForm.photo_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Camera className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                                                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Upload Photo</span>
                                                        </div>
                                                    )}
                                                    {isEditingProfile && (
                                                        <input title="Profile photo" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">GCash QR Code</span>
                                                <div className="relative group aspect-square rounded-[2.5rem] bg-zinc-50 border-2 border-dashed border-zinc-100 flex items-center justify-center overflow-hidden hover:border-black/20 transition-all">
                                                    {qrFile ? (
                                                        <img src={URL.createObjectURL(qrFile)} className="w-full h-full object-contain p-8" alt="" />
                                                    ) : profileForm.qr_code_url ? (
                                                        <img src={profileForm.qr_code_url} className="w-full h-full object-contain p-8" alt="" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <QrCode className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                                                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Upload QR</span>
                                                        </div>
                                                    )}
                                                    {isEditingProfile && (
                                                        <input title="QR Code" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Form Fields */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Full Name</span>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300"><User className="w-4 h-4" /></div>
                                                        <input
                                                            title="Full Name"
                                                            placeholder="Your name"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-12 pr-6 py-4 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-transparent border-transparent text-zinc-600 cursor-default'}`}
                                                            value={profileForm.name}
                                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Role</span>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300"><Briefcase className="w-4 h-4" /></div>
                                                        <input
                                                            title="Role"
                                                            placeholder="Your role"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-12 pr-6 py-4 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-transparent border-transparent text-zinc-600 cursor-default'}`}
                                                            value={profileForm.role}
                                                            onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Cell Number</span>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300"><Phone className="w-4 h-4" /></div>
                                                        <input
                                                            title="Cell Number"
                                                            placeholder="09xx-xxx-xxxx"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-12 pr-6 py-4 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-transparent border-transparent text-zinc-600 cursor-default'}`}
                                                            value={profileForm.phone}
                                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Username</span>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300"><User className="w-4 h-4" /></div>
                                                        <input
                                                            title="Username"
                                                            disabled
                                                            className="w-full pl-12 pr-6 py-4 bg-zinc-100 border border-zinc-100 rounded-2xl outline-none font-bold text-sm text-zinc-400 cursor-not-allowed"
                                                            value={profileForm.email}
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
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-12 pr-6 py-4 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-transparent border-transparent text-zinc-600 cursor-default'}`}
                                                            value={profileForm.contact_email}
                                                            onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">GCash Number</span>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300"><Wallet className="w-4 h-4" /></div>
                                                        <input
                                                            title="GCash Number"
                                                            placeholder="09xx-xxx-xxxx"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-12 pr-6 py-4 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-transparent border-transparent text-zinc-600 cursor-default'}`}
                                                            value={profileForm.gcash_number}
                                                            onChange={(e) => setProfileForm({ ...profileForm, gcash_number: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {isEditingProfile && (
                                                <div className="pt-8 border-t border-zinc-50 flex gap-4">
                                                    <button
                                                        onClick={handleProfileSave}
                                                        disabled={profileSaving}
                                                        className="flex items-center gap-3 px-10 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {profileSaving ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : profileSuccess ? (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                        {profileSaving ? 'Saving...' : profileSuccess ? 'Saved!' : 'Save Changes'}
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditingProfile(false)}
                                                        className="px-10 py-4 border border-zinc-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-50 transition-all text-zinc-400 hover:text-black"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Add Client Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-10 border-b border-zinc-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase italic text-black">New Client Record</h2>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Complete all details for the client deal</p>
                                </div>
                                <button title="Close" onClick={() => setShowAddModal(false)} className="p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                                    <X className="w-5 h-5 text-zinc-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddClient} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Month</span>
                                        <select
                                            title="Month"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all appearance-none"
                                            value={addForm.month}
                                            onChange={(e) => setAddForm({ ...addForm, month: e.target.value })}
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Date Selection</span>
                                        <input
                                            type="date"
                                            required
                                            title="Date"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.date}
                                            onChange={(e) => {
                                                const d = new Date(e.target.value);
                                                setAddForm({
                                                    ...addForm,
                                                    date: e.target.value,
                                                    month: d.toLocaleString('default', { month: 'long' })
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Client Name</span>
                                    <input
                                        required
                                        title="Client Name"
                                        placeholder="Full Name of the client"
                                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                        value={addForm.client_name}
                                        onChange={(e) => setAddForm({ ...addForm, client_name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Package Avail (₱)</span>
                                        <input
                                            type="number"
                                            required
                                            title="Package Value"
                                            placeholder="0"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.deal_value || ''}
                                            onChange={(e) => setAddForm({ ...addForm, deal_value: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Down Payment (₱)</span>
                                        <input
                                            type="number"
                                            title="Down Payment"
                                            placeholder="0"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.down_payment || ''}
                                            onChange={(e) => setAddForm({ ...addForm, down_payment: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2 text-red-500">Balance/Natira (₱)</span>
                                        <div className="w-full px-6 py-4 bg-red-50 border border-red-100 rounded-2xl font-black text-sm text-red-600 tabular-nums">
                                            ₱{Number(addForm.deal_value - addForm.down_payment).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2 text-green-600">Comission (20%)</span>
                                        <div className="w-full px-6 py-4 bg-green-50 border border-green-100 rounded-2xl font-black text-sm text-green-600 tabular-nums">
                                            ₱{Number(addForm.deal_value * 0.2).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Fully Paid / Status</span>
                                    <select
                                        title="Payment Status"
                                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs uppercase tracking-widest transition-all appearance-none"
                                        value={addForm.payment_status}
                                        onChange={(e) => setAddForm({ ...addForm, payment_status: e.target.value })}
                                    >
                                        <option value="Fully Paid">Fully Paid</option>
                                        <option value="Cancelled Project">Cancelled Project</option>
                                        <option value="Downpayment Only">Downpayment Only</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-4 border border-zinc-100 rounded-2xl font-bold text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
                                    >
                                        {isSaving ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        Save Client Record
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
