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
    User,
    Mail,
    Briefcase,
    Search,
    Download,
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
    tip: number;
    worker_id: string;
    webdev_id?: string;
    is_hidden: boolean;
    month: string;
    commission_rate?: number;
    created_at: string;
    webdev?: { name: string };
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
    assigned_webdev_id?: string;
}

export const EmployeeDashboard: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'deals' | 'profile' | 'terms'>('deals');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [workers, setWorkers] = useState<{ id: string, name: string }[]>([]);

    // Edit form state
    const [editForm, setEditForm] = useState({
        client_name: '',
        deal_value: 0,
        down_payment: 0,
        tip: 0,
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
        tip: 0,
        payment_status: 'Downpayment Only' as string,
        commission_rate: 20,
        webdev_id: '',
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
        fetchWorkers();
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
                assigned_webdev_id: profile.assigned_webdev_id || '',
            });
        }

        // Subscribe to real-time changes exactly like LeadsTracker does
        const channel = supabase
            .channel('schema-db-changes-employee-leads')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leads'
                },
                () => {
                    fetchLeads();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);

    const fetchLogo = async () => {
        const { data } = await supabase.from('app_settings').select('logo_url').eq('id', 1).single();
        if (data?.logo_url) setLogoUrl(data.logo_url);
    };

    const fetchWorkers = async () => {
        try {
            const { data, error } = await supabase
                .from('workers')
                .select('id, name')
                .eq('active', true);
            if (error) throw error;
            setWorkers(data || []);
        } catch (err) {
            console.error('Error fetching workers:', err);
        }
    };

    const fetchLeads = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*, webdev:workers!webdev_id(name)')
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

    const updatePaymentStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    payment_status: newStatus,
                    commission_rate: (newStatus === 'Cancelled Project' || newStatus === 'Downpayment Only') ? 10 : 20
                })
                .eq('id', id);
            if (error) throw error;
            fetchLeads();
        } catch (err) {
            console.error('Error updating payment status:', err);
        }
    };

    const filteredLeads = leads.filter(lead =>
        lead.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startEditing = (lead: Lead) => {
        setEditingId(lead.id);
        setEditForm({
            client_name: lead.client_name,
            deal_value: lead.deal_value,
            down_payment: lead.down_payment,
            tip: lead.tip || 0,
            payment_status: lead.payment_status || 'Downpayment Only',
        });
    };

    const getBalance = (lead: Lead) => {
        const isCancelledOrDP = lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project';
        const commission = isCancelledOrDP ? (Number(lead.down_payment) * 0.1) : (Number(lead.deal_value) * ((lead.commission_rate || 20) / 100));

        if (isCancelledOrDP) {
            return Number(lead.down_payment) - commission;
        }
        if (lead.payment_status === 'Fully Paid') {
            return Number(lead.deal_value) - commission;
        }
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
                    tip: editForm.tip,
                    payment_status: (editForm.payment_status === 'Cancelled Project' || editForm.payment_status === 'Downpayment Only')
                        ? editForm.payment_status
                        : (balance <= 0 ? 'Fully Paid' : editForm.payment_status),
                    commission_rate: (editForm.payment_status === 'Cancelled Project' || editForm.payment_status === 'Downpayment Only') ? 10 : 20,
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
                tip: addForm.tip,
                payment_status: (addForm.payment_status === 'Cancelled Project' || addForm.payment_status === 'Downpayment Only')
                    ? addForm.payment_status
                    : (balance <= 0 ? 'Fully Paid' : addForm.payment_status),
                status: 'closed',
                worker_id: profile?.id,
                webdev_id: addForm.webdev_id || profile?.assigned_webdev_id || null,
                month: addForm.month,
                commission_rate: (addForm.payment_status === 'Cancelled Project' || addForm.payment_status === 'Downpayment Only') ? 10 : addForm.commission_rate,
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
                tip: 0,
                payment_status: 'Downpayment Only',
                commission_rate: 20,
                webdev_id: profile?.assigned_webdev_id || '',
            });
            fetchLeads();
        } catch (err) {
            console.error('Error adding client:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!confirm('are you sure you want to delete it?')) return;
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            fetchLeads();
        } catch (err) {
            console.error('Error deleting lead:', err);
        }
    };

    const handleDownloadCSV = () => {
        const headers = [
            'Month', 'Date', 'Client Name', 'Webdev', 'Package Avail',
            'Down Payment', 'Tip', 'Payment Status', 'Balance', 'Commission'
        ];

        const csvData = filteredLeads.map(lead => {
            const commission = (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project')
                ? (Number(lead.down_payment) * 0.1)
                : (Number(lead.deal_value) * ((lead.commission_rate || 20) / 100));

            return [
                lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' }),
                new Date(lead.created_at).toLocaleDateString(),
                `"${lead.client_name}"`,
                `"${lead.webdev?.name || 'Unassigned'}"`,
                lead.deal_value,
                lead.down_payment,
                lead.tip || 0,
                lead.payment_status || 'Downpayment Only',
                getBalance(lead),
                commission
            ].join(',');
        });

        const csvString = [headers.join(','), ...csvData].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'client_deals.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
                    <button
                        onClick={() => setActiveSection('terms')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'terms' ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'
                            }`}
                    >
                        Terms & Conditions
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
                                        <h2 className="text-2xl font-black tracking-tighter text-black uppercase italic">Client Deals</h2>
                                        <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Your closed deals and project collections</p>
                                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                                                We release the commissions of webnegosyo employees every 2 weeks.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center gap-4">
                                        <div className="relative group w-full md:w-72">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search client name..."
                                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-[10px] uppercase tracking-widest transition-all"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                                            <button
                                                onClick={handleDownloadCSV}
                                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-100 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all active:scale-95"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download CSV
                                            </button>
                                            <div className="text-[8px] font-black text-zinc-400 text-center uppercase tracking-widest leading-tight mt-1">
                                                Please download only after 2 weeks
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Client
                                        </button>
                                    </div>
                                </div>

                                {/* Deals Table */}
                                <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Month</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Date</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Client Name</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Webdev</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Package Avail</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Down Payment</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Tip</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Fully Paid</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Balance</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-green-600 text-right">Commission</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {loading ? (
                                                    [1, 2, 3].map(i => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td colSpan={8} className="px-6 py-10"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                                        </tr>
                                                    ))
                                                ) : filteredLeads.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="px-6 py-20 text-center">
                                                            <div className="text-zinc-300 mb-4">
                                                                <Briefcase className="w-12 h-12 mx-auto" />
                                                            </div>
                                                            <p className="text-zinc-400 font-bold text-sm">
                                                                {searchQuery ? "No matching clients found" : "No deals yet"}
                                                            </p>
                                                            <p className="text-zinc-300 text-xs mt-1">
                                                                {searchQuery ? "Try searching for a different name." : "Click \"Add Client\" to record your first deal."}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ) : filteredLeads.map((lead) => (
                                                    <tr key={lead.id} className={cn(
                                                        "group transition-all duration-300",
                                                        lead.payment_status === 'Fully Paid' ? "bg-green-600 text-white shadow-lg scale-[1.01] z-10" :
                                                            lead.payment_status === 'Downpayment Only' ? "bg-zinc-600 text-white shadow-lg scale-[1.01] z-10" :
                                                                lead.payment_status === 'Cancelled Project' ? "bg-red-600 text-white shadow-lg scale-[1.01] z-10" :
                                                                    "hover:bg-zinc-50/50"
                                                    )}>
                                                        <td className="px-4 py-3">
                                                            <span className={cn("font-bold text-[10px] uppercase tracking-widest", !lead.payment_status || lead.payment_status === 'Downpayment Only' ? "text-zinc-200" : "text-white")}>
                                                                {lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={cn("text-[10px] font-bold tabular-nums", !lead.payment_status ? "text-zinc-400" : "text-zinc-200")}>
                                                                {new Date(lead.created_at).toLocaleDateString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="text"
                                                                    title="Client Name"
                                                                    placeholder="Client name"
                                                                    className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-black transition-all text-black"
                                                                    value={editForm.client_name}
                                                                    onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                                                                />
                                                            ) : (
                                                                <span className="font-bold text-xs text-inherit">{lead.client_name}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-inherit">
                                                                {lead.webdev?.name || 'Unassigned'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="number"
                                                                    title="Package Value"
                                                                    placeholder="0"
                                                                    className="w-24 px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-black transition-all text-right text-black"
                                                                    value={editForm.deal_value || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, deal_value: Number(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-black tabular-nums text-inherit">₱{Number(lead.deal_value).toLocaleString()}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="number"
                                                                    title="Down Payment"
                                                                    placeholder="0"
                                                                    className="w-24 px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-black transition-all text-right text-black"
                                                                    value={editForm.down_payment || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, down_payment: Number(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className={cn("text-xs font-black tabular-nums", !lead.payment_status ? "text-amber-600" : "text-white")}>
                                                                    ₱{Number(lead.down_payment).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {editingId === lead.id ? (
                                                                <input
                                                                    type="number"
                                                                    title="Tip"
                                                                    placeholder="0"
                                                                    className="w-24 px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-black transition-all text-right text-black"
                                                                    value={editForm.tip || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, tip: Number(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className={cn("text-xs font-black tabular-nums", !lead.payment_status ? "text-blue-600" : "text-white")}>
                                                                    ₱{Number(lead.tip || 0).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {editingId === lead.id ? (
                                                                <select
                                                                    title="Payment Status"
                                                                    className="px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:border-black transition-all text-black"
                                                                    value={editForm.payment_status}
                                                                    onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                                                                >
                                                                    <option value="Downpayment Only">Downpayment Only</option>
                                                                    <option value="Fully Paid">Fully Paid</option>
                                                                    <option value="Cancelled Project">Cancelled Project</option>
                                                                </select>
                                                            ) : (
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border w-fit shadow-sm transition-all",
                                                                        lead.payment_status === 'Fully Paid' ? "bg-white/20 text-white border-white/30" :
                                                                            lead.payment_status === 'Downpayment Only' ? "bg-white/20 text-white border-white/30" :
                                                                                lead.payment_status === 'Cancelled Project' ? "bg-white/20 text-white border-white/30" :
                                                                                    "bg-zinc-100 text-zinc-500 border-zinc-100"
                                                                    )}>
                                                                        {lead.payment_status || 'Downpayment Only'}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                        <button
                                                                            onClick={() => updatePaymentStatus(lead.id, 'Fully Paid')}
                                                                            title="Highlight Green (Completed)"
                                                                            className="w-4 h-4 rounded-full bg-green-500 border border-white hover:scale-125 transition-transform shadow-lg"
                                                                        />
                                                                        <button
                                                                            onClick={() => updatePaymentStatus(lead.id, 'Cancelled Project')}
                                                                            title="Highlight Red (Cancelled)"
                                                                            className="w-4 h-4 rounded-full bg-red-500 border border-white hover:scale-125 transition-transform shadow-lg"
                                                                        />
                                                                        <button
                                                                            onClick={() => updatePaymentStatus(lead.id, 'Downpayment Only')}
                                                                            title="Highlight Gray (Downpayment)"
                                                                            className="w-4 h-4 rounded-full bg-zinc-400 border border-white hover:scale-125 transition-transform shadow-lg"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={cn("text-xs font-black tabular-nums", !lead.payment_status ? (getBalance(lead) <= 0 ? 'text-green-600' : 'text-red-600') : "text-white")}>
                                                                ₱{Math.abs(getBalance(lead)).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={cn("text-xs font-black tabular-nums", !lead.payment_status ? "text-green-600" : "text-white")}>
                                                                ₱{Number(
                                                                    (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project')
                                                                        ? (lead.down_payment * 0.1)
                                                                        : (lead.deal_value * ((lead.commission_rate || 20) / 100))
                                                                ).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
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
                                                                            className={cn(
                                                                                "p-2 rounded-xl transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-sm",
                                                                                lead.payment_status ? "bg-white/20 text-white hover:bg-white/40" : "bg-zinc-50 text-zinc-400 hover:bg-black hover:text-white"
                                                                            )}
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteLead(lead.id)}
                                                                            className={cn(
                                                                                "p-2 rounded-xl transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-sm",
                                                                                lead.payment_status ? "bg-white/20 text-white hover:bg-red-500" : "bg-zinc-50 text-zinc-400 hover:bg-red-500 hover:text-white"
                                                                            )}
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
                                                {filteredLeads.length > 0 && (
                                                    <tr className="bg-zinc-50/50 font-black border-t border-zinc-100">
                                                        <td colSpan={6} className="px-4 py-4 text-right text-[9px] uppercase tracking-[0.2em] text-zinc-400">Totals</td>
                                                        <td className="px-4 py-4 text-right text-base text-blue-600 tabular-nums">
                                                            ₱{filteredLeads.reduce((sum, lead) => sum + (Number(lead.tip) || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-4"></td>
                                                        <td className="px-4 py-4 text-right text-base text-red-600 tabular-nums">
                                                            {filteredLeads.reduce((sum, lead) => sum + (Number(getBalance(lead)) || 0), 0) !== 0 ? (
                                                                <>₱{filteredLeads.reduce((sum, lead) => sum + (Number(getBalance(lead)) || 0), 0).toLocaleString()}</>
                                                            ) : null}
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-base text-green-600 tabular-nums">
                                                            {filteredLeads.reduce((sum, lead) => {
                                                                const commission = (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project')
                                                                    ? (Number(lead.down_payment) * 0.1)
                                                                    : (Number(lead.deal_value) * ((lead.commission_rate || 20) / 100));
                                                                return sum + (Number(commission) || 0);
                                                            }, 0) !== 0 ? (
                                                                <>₱{filteredLeads.reduce((sum, lead) => {
                                                                    const commission = (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project')
                                                                        ? (Number(lead.down_payment) * 0.1)
                                                                        : (Number(lead.deal_value) * ((lead.commission_rate || 20) / 100));
                                                                    return sum + (Number(commission) || 0);
                                                                }, 0).toLocaleString()}</>
                                                            ) : null}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : activeSection === 'profile' ? (
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
                    ) : (
                        <motion.div key="terms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {/* TERMS & CONDITIONS SECTION */}
                            <div className="max-w-4xl mx-auto space-y-12">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter text-black uppercase italic">Terms & Conditions</h2>
                                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Professional Protocol & Employment Standards</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm space-y-6">
                                        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center">
                                            <Wallet className="w-6 h-6 text-black" />
                                        </div>
                                        <h3 className="font-black text-xs uppercase tracking-widest text-black">Commission & Payouts</h3>
                                        <ul className="space-y-4">
                                            <li className="flex gap-4 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0" />
                                                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                    <span className="font-bold text-black uppercase tracking-tighter">Bi-Weekly Release:</span> Commissions for all WebNegosyo employees are strictly released every 2 weeks.
                                                </p>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0" />
                                                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                    <span className="font-bold text-black uppercase tracking-tighter">Completed Projects:</span> A standard <span className="text-green-600 font-black">20% commission</span> is earned for every fully paid project.
                                                </p>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0" />
                                                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                    <span className="font-bold text-black uppercase tracking-tighter">Cancelled Projects:</span> For cancelled projects, a reduced <span className="text-red-600 font-black">10% commission</span> is applied based on the downpayment received.
                                                </p>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm space-y-6">
                                        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center">
                                            <Briefcase className="w-6 h-6 text-black" />
                                        </div>
                                        <h3 className="font-black text-xs uppercase tracking-widest text-black">Workplace Ethics</h3>
                                        <ul className="space-y-4">
                                            <li className="flex gap-4 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0" />
                                                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                    <span className="font-bold text-black uppercase tracking-tighter">Record Accuracy:</span> All client details and deal values must be recorded accurately. Falsification of records is grounds for immediate termination.
                                                </p>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0" />
                                                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                    <span className="font-bold text-black uppercase tracking-tighter">Client Confidentiality:</span> Protecting client contact information and project details is of utmost importance.
                                                </p>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0" />
                                                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                    <span className="font-bold text-black uppercase tracking-tighter">Professionalism:</span> Employees are expected to maintain professional communication standards at all times when representing WebNegosyo.
                                                </p>
                                            </li>
                                        </ul>
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
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Tip (₱)</span>
                                        <input
                                            type="number"
                                            title="Tip"
                                            placeholder="0"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.tip || ''}
                                            onChange={(e) => setAddForm({ ...addForm, tip: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2 text-red-500">
                                            {(addForm.payment_status === 'Downpayment Only' || addForm.payment_status === 'Cancelled Project')
                                                ? 'Remaining (Net Share)'
                                                : 'Balance/Natira (₱)'}
                                        </span>
                                        <div className="w-full px-6 py-4 bg-red-50 border border-red-100 rounded-2xl font-black text-sm text-red-600 tabular-nums">
                                            ₱{Number(
                                                (addForm.payment_status === 'Downpayment Only' || addForm.payment_status === 'Cancelled Project')
                                                    ? (addForm.down_payment - (addForm.down_payment * 0.1))
                                                    : (addForm.deal_value - addForm.down_payment)
                                            ).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex flex-col px-2">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block text-green-600">
                                                Comission
                                            </span>
                                            <p className="text-[9px] font-bold text-zinc-400 mt-1 leading-relaxed">
                                                20% for fully paid projects; 10% for cancelled or down payment only deals.
                                            </p>
                                        </div>
                                        <div className="w-full px-6 py-4 bg-green-50 border border-green-100 rounded-2xl font-black text-sm text-green-600 tabular-nums">
                                            ₱{Number(
                                                (addForm.payment_status === 'Downpayment Only' || addForm.payment_status === 'Cancelled Project')
                                                    ? (addForm.down_payment * 0.1)
                                                    : (addForm.deal_value * (addForm.commission_rate / 100))
                                            ).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Fully Paid / Status</span>
                                    <select
                                        title="Payment Status"
                                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs uppercase tracking-widest transition-all appearance-none"
                                        value={addForm.payment_status}
                                        onChange={(e) => {
                                            const status = e.target.value;
                                            setAddForm({ ...addForm, payment_status: status, commission_rate: (status === 'Cancelled Project' || status === 'Downpayment Only') ? 10 : 20 });
                                        }}
                                    >
                                        <option value="Fully Paid">Fully Paid</option>
                                        <option value="Cancelled Project">Cancelled Project</option>
                                        <option value="Downpayment Only">Downpayment Only</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Assigned Webdev</span>
                                    <select
                                        title="Assigned Webdev"
                                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs uppercase tracking-widest transition-all appearance-none"
                                        value={addForm.webdev_id}
                                        onChange={(e) => setAddForm({ ...addForm, webdev_id: e.target.value })}
                                    >
                                        <option value="">Select Webdev</option>
                                        {workers.map(worker => (
                                            <option key={worker.id} value={worker.id}>{worker.name}</option>
                                        ))}
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
        </div >
    );
};
