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
    Key,
    Handshake,
    ClipboardList,
    ScrollText,
    Percent,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeDailyAudit } from '../components/EmployeeDailyAudit';
import { LogoMark } from '../components/Logo';

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
    commission_percentage?: string;
}

export const EmployeeDashboard: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'deals' | 'audit' | 'profile'>('deals');
    const [showTerms, setShowTerms] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

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
        commission_percentage: '10',
    });
    const [savedRate, setSavedRate] = useState<number | null>(null);
    const [rateError, setRateError] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    useEffect(() => {
        fetchLeads();
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
                commission_percentage: String(profile.commission_percentage ?? 10),
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
                    commission_rate: workerRate
                })
                .eq('id', id);
            if (error) throw error;
            fetchLeads();
        } catch (err) {
            console.error('Error updating payment status:', err);
        }
    };

    const filteredLeads = leads.filter(lead =>
        lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (statusFilter === 'all' || (lead.payment_status || 'Downpayment Only') === statusFilter)
    );

    const dealCounts = {
        paid: leads.filter(l => l.payment_status === 'Fully Paid').length,
        dp: leads.filter(l => !l.payment_status || l.payment_status === 'Downpayment Only').length,
        cancelled: leads.filter(l => l.payment_status === 'Cancelled Project').length,
    };

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

    // Commission % is entered by the employee themselves (My Profile).
    const workerRate = savedRate ?? Number(profile?.commission_percentage ?? 10);

    // Commission is only earned (and visible) once a project is fully paid.
    const getCommission = (lead: { payment_status?: string; deal_value: number }) =>
        lead.payment_status === 'Fully Paid' ? Number(lead.deal_value) * workerRate / 100 : 0;

    const totalCommission = leads.reduce((sum, l) => sum + getCommission(l), 0);

    const getBalance = (lead: Lead) => {
        if (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project') {
            return Number(lead.down_payment);
        }
        if (lead.payment_status === 'Fully Paid') {
            return Number(lead.deal_value) - getCommission(lead);
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
                    commission_rate: workerRate,
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
                webdev_id: profile?.id || null,
                month: addForm.month,
                commission_rate: workerRate,
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
                commission_rate: workerRate,
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
            const commission = getCommission(lead);

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
        const pct = Number(profileForm.commission_percentage);
        if (profileForm.commission_percentage === '' || isNaN(pct) || pct < 0 || pct > 100) {
            setRateError('Enter a commission between 0 and 100.');
            return;
        }
        setRateError(null);
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
                    commission_percentage: pct,
                })
                .eq('id', profile.id);

            if (error) throw error;
            setSavedRate(pct);
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
        <div className="min-h-dvh pb-safe">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-zinc-200/60 pt-safe">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-16 lg:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <LogoMark className="h-9 lg:h-11 w-auto" />
                        <div>
                            <h1 className="text-sm lg:text-base font-extrabold tracking-tight text-ink">WebNegosyo</h1>
                            <p className="text-[7px] lg:text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Employee Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className="hidden sm:flex items-center gap-2 lg:gap-3 bg-zinc-50 rounded-xl lg:rounded-2xl px-3 lg:px-5 py-2 lg:py-2.5">
                            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-black text-white flex items-center justify-center font-black text-[10px] lg:text-xs overflow-hidden">
                                {profile?.photo_url ? (
                                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    profile?.name?.charAt(0) || 'E'
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] lg:text-xs font-black text-black">{profile?.name || 'Employee'}</p>
                                <p className="text-[7px] lg:text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{profile?.role || 'Employee'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTerms(true)}
                            className="flex items-center gap-2 p-2 lg:px-4 lg:py-2.5 text-zinc-500 hover:text-ink hover:bg-zinc-100 rounded-lg lg:rounded-xl transition-all"
                            title="Terms & Policies"
                        >
                            <ScrollText className="w-4 h-4 lg:w-5 lg:h-5" />
                            <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Terms & Policies</span>
                        </button>
                        <button
                            onClick={signOut}
                            className="p-2 lg:p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg lg:rounded-xl transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Switcher */}
            {/* Phone: bottom tab bar (same style as the owner side) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-zinc-200 pb-safe" aria-label="Sections">
                <div className="grid grid-cols-3 px-1 pt-1.5 pb-1.5">
                    {([
                        { id: 'deals', label: 'My Deals', icon: Handshake },
                        { id: 'audit', label: 'Audit', icon: ClipboardList },
                        { id: 'profile', label: 'Profile', icon: User },
                    ] as const).map(({ id, label, icon: Icon }) => {
                        const active = activeSection === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveSection(id)}
                                aria-current={active ? 'page' : undefined}
                                className={`flex flex-col items-center gap-1 py-1.5 min-w-0 transition-colors active:scale-95 ${active ? 'text-ink' : 'text-zinc-400'}`}
                            >
                                <span className={`px-5 py-1 rounded-full transition-colors ${active ? 'bg-ink text-white' : ''}`}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                <span className="text-[10px] font-extrabold tracking-tight truncate max-w-full px-0.5">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Tablet/desktop: pill switcher */}
            <div className="hidden md:block max-w-7xl mx-auto px-4 md:px-12 pt-6 lg:pt-8 overflow-x-auto scrollbar-hide">
                <div className="flex gap-1.5 lg:gap-2 bg-white border border-zinc-100 rounded-xl lg:rounded-2xl p-1 lg:p-1.5 w-fit shadow-sm">
                    <button
                        onClick={() => setActiveSection('deals')}
                        className={`px-4 lg:px-8 py-2.5 lg:py-3 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSection === 'deals' ? 'bg-ink text-white shadow-lg' : 'text-zinc-400 hover:text-black'
                            }`}
                    >
                        My Deals
                    </button>
                    <button
                        onClick={() => setActiveSection('audit')}
                        className={`px-4 lg:px-8 py-2.5 lg:py-3 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSection === 'audit' ? 'bg-ink text-white shadow-lg' : 'text-zinc-400 hover:text-black'
                            }`}
                    >
                        Daily Audit
                    </button>
                    <button
                        onClick={() => setActiveSection('profile')}
                        className={`px-4 lg:px-8 py-2.5 lg:py-3 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSection === 'profile' ? 'bg-ink text-white shadow-lg' : 'text-zinc-400 hover:text-black'
                            }`}
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-8">
                <AnimatePresence mode="wait">
                    {activeSection === 'deals' ? (
                        <motion.div key="deals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {/* DEALS SECTION */}
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1.5">Overview</p>
                                        <h2 className="text-2xl font-black tracking-tighter text-ink uppercase">My Deals</h2>
                                        <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Track your clients, payments and commissions</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const { data } = await supabase.from('app_settings').select('package_price').eq('id', 1).maybeSingle();
                                            const price = Number(data?.package_price) || 0;
                                            if (price) setAddForm(prev => ({ ...prev, deal_value: prev.deal_value || price }));
                                            setShowAddModal(true);
                                        }}
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-ink text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Client
                                    </button>
                                </div>

                                {/* Summary cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                                    <div className="col-span-2 lg:col-span-1 bg-ink text-white rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-400 relative">Total Commission</p>
                                        <p className="text-2xl lg:text-3xl font-black tracking-tighter tabular-nums mt-2 relative">₱{totalCommission.toLocaleString()}</p>
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-2 relative">{workerRate}% per fully paid project</p>
                                    </div>
                                    {[
                                        { label: 'Fully Paid', count: dealCounts.paid, dot: 'bg-green-500', filter: 'Fully Paid' },
                                        { label: 'Downpayment', count: dealCounts.dp, dot: 'bg-zinc-400', filter: 'Downpayment Only' },
                                        { label: 'Cancelled', count: dealCounts.cancelled, dot: 'bg-red-500', filter: 'Cancelled Project' },
                                    ].map(c => (
                                        <button
                                            key={c.label}
                                            onClick={() => setStatusFilter(statusFilter === c.filter ? 'all' : c.filter)}
                                            className={cn(
                                                'text-left bg-white border rounded-2xl p-4 lg:p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.98]',
                                                statusFilter === c.filter ? 'border-ink ring-2 ring-ink/10' : 'border-zinc-100'
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn('w-2 h-2 rounded-full', c.dot)} />
                                                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-400">{c.label}</p>
                                            </div>
                                            <p className="text-2xl lg:text-3xl font-black tracking-tighter text-ink tabular-nums mt-2">{c.count}</p>
                                        </button>
                                    ))}
                                </div>

                                {/* Payout notice */}
                                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse shrink-0" />
                                    <p className="text-[9px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                        Commissions are released every 2 weeks.
                                    </p>
                                </div>

                                {/* Toolbar */}
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    <div className="relative group flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-ink transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search client name..."
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-100 rounded-2xl focus:border-ink outline-none font-bold text-[10px] uppercase tracking-widest transition-all"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {statusFilter !== 'all' && (
                                        <button
                                            onClick={() => setStatusFilter('all')}
                                            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-zinc-50 transition-all"
                                        >
                                            {statusFilter} <X className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDownloadCSV}
                                        title="Please download only after 2 weeks"
                                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-zinc-100 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-50 transition-all active:scale-95"
                                    >
                                        <Download className="w-4 h-4" />
                                        CSV
                                    </button>
                                </div>

                                {/* Deals */}
                                <div className="bg-white border border-zinc-100 rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto scrollbar-hide">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-zinc-50/60 border-b border-zinc-100">
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Client</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Webdev</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Package</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Down Payment</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Tip</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Status</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 text-right">Balance</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-ink text-right">Commission</th>
                                                    <th className="px-4 py-3" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {loading ? (
                                                    [1, 2, 3].map(i => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td colSpan={9} className="px-6 py-8"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                                        </tr>
                                                    ))
                                                ) : filteredLeads.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="px-6 py-20 text-center">
                                                            <Briefcase className="w-10 h-10 mx-auto text-zinc-200 mb-3" />
                                                            <p className="text-zinc-500 font-black text-xs uppercase tracking-widest">
                                                                {searchQuery || statusFilter !== 'all' ? 'No matching deals' : 'No deals yet'}
                                                            </p>
                                                            <p className="text-zinc-300 text-[10px] font-bold uppercase tracking-widest mt-1">
                                                                {searchQuery || statusFilter !== 'all' ? 'Try a different search or filter.' : 'Click "Add Client" to record your first deal.'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ) : filteredLeads.map((lead) => {
                                                    const editing = editingId === lead.id;
                                                    const status = lead.payment_status || 'Downpayment Only';
                                                    const pill =
                                                        status === 'Fully Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            status === 'Cancelled Project' ? 'bg-red-50 text-red-600 border-red-200' :
                                                                'bg-zinc-100 text-zinc-600 border-zinc-200';
                                                    const inputCls = 'px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-ink transition-all text-black';
                                                    return (
                                                        <tr key={lead.id} className="group hover:bg-zinc-50/60 transition-colors">
                                                            <td className="px-4 py-3">
                                                                {editing ? (
                                                                    <input
                                                                        type="text"
                                                                        title="Client Name"
                                                                        placeholder="Client name"
                                                                        className={cn(inputCls, 'w-full min-w-[8rem]')}
                                                                        value={editForm.client_name}
                                                                        onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <>
                                                                        <p className="font-black text-[12px] text-ink">{lead.client_name}</p>
                                                                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                                                            {lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })} · {new Date(lead.created_at).toLocaleDateString()}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{lead.webdev?.name || 'Unassigned'}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {editing ? (
                                                                    <input
                                                                        type="number"
                                                                        title="Package Value"
                                                                        placeholder="0"
                                                                        className={cn(inputCls, 'w-24 text-right')}
                                                                        value={editForm.deal_value || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, deal_value: Number(e.target.value) })}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[11px] font-black tabular-nums text-ink">₱{Number(lead.deal_value).toLocaleString()}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {editing ? (
                                                                    <input
                                                                        type="number"
                                                                        title="Down Payment"
                                                                        placeholder="0"
                                                                        className={cn(inputCls, 'w-24 text-right')}
                                                                        value={editForm.down_payment || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, down_payment: Number(e.target.value) })}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[11px] font-bold tabular-nums text-zinc-500">₱{Number(lead.down_payment).toLocaleString()}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {editing ? (
                                                                    <input
                                                                        type="number"
                                                                        title="Tip"
                                                                        placeholder="0"
                                                                        className={cn(inputCls, 'w-20 text-right')}
                                                                        value={editForm.tip || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, tip: Number(e.target.value) })}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[11px] font-bold tabular-nums text-zinc-500">₱{Number(lead.tip || 0).toLocaleString()}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {editing ? (
                                                                    <select
                                                                        title="Payment Status"
                                                                        className={cn(inputCls, 'text-[9px] font-black uppercase tracking-widest')}
                                                                        value={editForm.payment_status}
                                                                        onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                                                                    >
                                                                        <option value="Downpayment Only">Downpayment Only</option>
                                                                        <option value="Fully Paid">Fully Paid</option>
                                                                        <option value="Cancelled Project">Cancelled Project</option>
                                                                    </select>
                                                                ) : (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border w-fit whitespace-nowrap', pill)}>
                                                                            {status}
                                                                        </span>
                                                                        <div className="flex items-center gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                                                                            <button onClick={() => updatePaymentStatus(lead.id, 'Fully Paid')} title="Mark Fully Paid" className="w-3 h-3 rounded-full bg-green-500 hover:scale-125 transition-transform" />
                                                                            <button onClick={() => updatePaymentStatus(lead.id, 'Cancelled Project')} title="Mark Cancelled" className="w-3 h-3 rounded-full bg-red-500 hover:scale-125 transition-transform" />
                                                                            <button onClick={() => updatePaymentStatus(lead.id, 'Downpayment Only')} title="Mark Downpayment Only" className="w-3 h-3 rounded-full bg-zinc-400 hover:scale-125 transition-transform" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className="text-[11px] font-black tabular-nums text-zinc-600">₱{Math.abs(getBalance(lead)).toLocaleString()}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className={cn('text-[11px] font-black tabular-nums', status === 'Fully Paid' ? 'text-green-600' : 'text-zinc-300')}>
                                                                    {status === 'Fully Paid' ? `₱${getCommission(lead).toLocaleString()}` : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {editing ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => saveEdit(lead.id)}
                                                                                disabled={isSaving}
                                                                                className="p-1.5 bg-ink text-white rounded-xl hover:shadow-lg transition-all active:scale-90 disabled:opacity-50"
                                                                                title="Save"
                                                                            >
                                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingId(null)}
                                                                                className="p-1.5 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-all active:scale-90"
                                                                                title="Cancel"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => startEditing(lead)}
                                                                                className="p-1.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-ink hover:text-white transition-all active:scale-90 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteLead(lead.id)}
                                                                                className="p-1.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {filteredLeads.length > 0 && (
                                                <tfoot>
                                                    <tr className="bg-zinc-50/60 border-t border-zinc-100 font-black">
                                                        <td colSpan={4} className="px-4 py-3 text-right text-[9px] uppercase tracking-[0.2em] text-zinc-400">Totals</td>
                                                        <td className="px-4 py-3 text-right text-sm text-zinc-600 tabular-nums">
                                                            ₱{filteredLeads.reduce((sum, lead) => sum + (Number(lead.tip) || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td />
                                                        <td className="px-4 py-3 text-right text-sm text-zinc-600 tabular-nums">
                                                            ₱{filteredLeads.reduce((sum, lead) => sum + (Number(getBalance(lead)) || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-green-600 tabular-nums">
                                                            ₱{filteredLeads.reduce((sum, lead) => sum + getCommission(lead), 0).toLocaleString()}
                                                        </td>
                                                        <td />
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : activeSection === 'audit' ? (
                        <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {profile?.id && <EmployeeDailyAudit workerId={profile.id} rate={workerRate} />}
                        </motion.div>
                    ) : activeSection === 'profile' ? (
                        <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {/* PROFILE SECTION */}
                            <div className="space-y-3 sm:space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter text-black uppercase italic">My Profile</h2>
                                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Your personal and payment information</p>
                                    </div>
                                    {!isEditingProfile && (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit Profile
                                        </button>
                                    )}
                                </div>

                                {/* Hero card */}
                                <div className="relative overflow-hidden rounded-2xl sm:rounded-[1.5rem] lg:rounded-[2rem] bg-ink text-white shadow-xl">
                                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
                                    <div className="relative p-3.5 sm:p-5 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 lg:gap-8">
                                        <div className="relative group w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 shrink-0 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden">
                                            {photoFile ? (
                                                <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover" alt="" />
                                            ) : profileForm.photo_url ? (
                                                <img src={profileForm.photo_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-2xl sm:text-4xl font-black text-white/70">{profileForm.name?.charAt(0)?.toUpperCase() || 'E'}</span>
                                            )}
                                            {isEditingProfile && (
                                                <>
                                                    <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1 pointer-events-none">
                                                        <Camera className="w-5 h-5" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Change</span>
                                                    </div>
                                                    <input title="Profile photo" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                                                </>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50">WebNegosyo Team</p>
                                            <h3 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter truncate mt-0.5 sm:mt-1">{profileForm.name || 'Your name'}</h3>
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 border border-white/15 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                                                    <Briefcase className="w-3 h-3" /> {profileForm.role || 'Employee'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 border border-white/15 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                                                    <User className="w-3 h-3" /> {profileForm.email || 'username'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="sm:text-right sm:pl-6 sm:border-l sm:border-white/15">
                                            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/50">Your Commission</p>
                                            <p className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter tabular-nums mt-0.5 sm:mt-1">{workerRate}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                                    <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
                                        {/* Personal info */}
                                        <div className="bg-white border border-zinc-100 rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-5 lg:p-7 shadow-sm">
                                            <h4 className="text-[10px] font-black text-black uppercase tracking-[0.25em] mb-3 sm:mb-5">Personal Information</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-5">
                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Full Name</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
                                                        <input
                                                            title="Full Name"
                                                            placeholder="Your name"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-zinc-50/60 border-transparent text-zinc-700 cursor-default'}`}
                                                            value={profileForm.name}
                                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Role</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Briefcase className="w-4 h-4" /></div>
                                                        <input
                                                            title="Role"
                                                            placeholder="Your role"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-zinc-50/60 border-transparent text-zinc-700 cursor-default'}`}
                                                            value={profileForm.role}
                                                            onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">My Commission %</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Percent className="w-4 h-4" /></div>
                                                        <input
                                                            title="My Commission %"
                                                            placeholder="10"
                                                            inputMode="decimal"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-zinc-50/60 border-transparent text-zinc-700 cursor-default'}`}
                                                            value={profileForm.commission_percentage ?? ''}
                                                            onChange={(e) => setProfileForm({ ...profileForm, commission_percentage: e.target.value.replace(/[^0-9.]/g, '') })}
                                                        />
                                                    </div>
                                                    {rateError && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest px-1">{rateError}</p>}
                                                </div>

                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Cell Number</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Phone className="w-4 h-4" /></div>
                                                        <input
                                                            title="Cell Number"
                                                            placeholder="09xx-xxx-xxxx"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-zinc-50/60 border-transparent text-zinc-700 cursor-default'}`}
                                                            value={profileForm.phone}
                                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Professional Email</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Mail className="w-4 h-4" /></div>
                                                        <input
                                                            title="Professional Email"
                                                            placeholder="email@example.com"
                                                            type="email"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-zinc-50/60 border-transparent text-zinc-700 cursor-default'}`}
                                                            value={profileForm.contact_email}
                                                            onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Account & payment */}
                                        <div className="bg-white border border-zinc-100 rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-5 lg:p-7 shadow-sm">
                                            <h4 className="text-[10px] font-black text-black uppercase tracking-[0.25em] mb-3 sm:mb-5">Account & Payout</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-5">
                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Username (login)</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
                                                        <input
                                                            title="Username"
                                                            disabled
                                                            className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 bg-zinc-100 border border-zinc-100 rounded-2xl outline-none font-bold text-sm text-zinc-400 cursor-not-allowed"
                                                            value={profileForm.email}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1 sm:space-y-2">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">GCash Number</span>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Wallet className="w-4 h-4" /></div>
                                                        <input
                                                            title="GCash Number"
                                                            placeholder="09xx-xxx-xxxx"
                                                            disabled={!isEditingProfile}
                                                            className={`w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 border rounded-2xl outline-none font-bold text-sm transition-all ${isEditingProfile ? 'bg-zinc-50 border-zinc-100 focus:border-black' : 'bg-zinc-50/60 border-transparent text-zinc-700 cursor-default'}`}
                                                            value={profileForm.gcash_number}
                                                            onChange={(e) => setProfileForm({ ...profileForm, gcash_number: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GCash QR */}
                                    <div className="bg-white border border-zinc-100 rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-5 lg:p-7 shadow-sm self-start">
                                        <h4 className="text-[10px] font-black text-black uppercase tracking-[0.25em] mb-3 sm:mb-5">GCash QR Code</h4>
                                        <div className="relative group aspect-square max-w-[9rem] sm:max-w-none mx-auto w-full rounded-2xl sm:rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden hover:border-black/30 transition-all">
                                            {qrFile ? (
                                                <img src={URL.createObjectURL(qrFile)} className="w-full h-full object-contain p-3 sm:p-6" alt="" />
                                            ) : profileForm.qr_code_url ? (
                                                <img src={profileForm.qr_code_url} className="w-full h-full object-contain p-3 sm:p-6" alt="" />
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
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-3 text-center">
                                            {isEditingProfile ? 'Tap the box to upload' : 'Used for your commission payouts'}
                                        </p>
                                    </div>
                                </div>

                                {isEditingProfile && (
                                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                                        <button
                                            onClick={() => setIsEditingProfile(false)}
                                            className="px-10 py-3 sm:py-4 border border-zinc-100 bg-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-50 transition-all text-zinc-400 hover:text-black"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleProfileSave}
                                            disabled={profileSaving}
                                            className="flex items-center justify-center gap-3 px-10 py-3 sm:py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50"
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
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Terms & Policies Modal (opened from the header) */}
            <AnimatePresence>
                {showTerms && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                            onClick={() => setShowTerms(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[88vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">WebNegosyo</p>
                                    <h2 className="text-lg font-black tracking-tighter text-ink uppercase">Terms & Policies</h2>
                                </div>
                                <button
                                    onClick={() => setShowTerms(false)}
                                    title="Close"
                                    className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-black transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-ink text-white rounded-2xl p-4">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Commission</p>
                                        <p className="text-2xl font-black tracking-tighter tabular-nums mt-1.5">{workerRate}%</p>
                                    </div>
                                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Payout</p>
                                        <p className="text-lg font-black tracking-tighter text-ink mt-1.5 leading-tight">Every 2 weeks</p>
                                    </div>
                                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Earned when</p>
                                        <p className="text-lg font-black tracking-tighter text-green-600 mt-1.5 leading-tight">Fully Paid</p>
                                    </div>
                                </div>

                                {[
                                    {
                                        icon: Wallet,
                                        title: 'Commission & Payouts',
                                        items: [
                                            ['Payout schedule', 'Commissions are released every 2 weeks.'],
                                            ['When you earn', `You earn ${workerRate}% of the package value once a project is Fully Paid.`],
                                            ['No commission', 'Down-payment-only and cancelled projects earn nothing until they are fully paid.'],
                                            ['Payout details', 'Keep your GCash number and QR code in Edit Profile up to date. We cannot release a payout to wrong or missing details.'],
                                        ],
                                    },
                                    {
                                        icon: Briefcase,
                                        title: 'Deals & Daily Audit',
                                        items: [
                                            ['Accurate records', 'Enter client names, package values, down payments and payment status correctly.'],
                                            ['Daily Audit', 'Log every client you contacted in Client Records, then submit your Daily Audit at the end of each day.'],
                                            ['Fix mistakes early', 'Edit a wrong record right away so your commission is computed correctly.'],
                                            ['No falsification', 'Fake or inflated records or deals are grounds for immediate termination and forfeiture of unpaid commission.'],
                                        ],
                                    },
                                    {
                                        icon: User,
                                        title: 'Conduct & Confidentiality',
                                        items: [
                                            ['Client privacy', 'Keep client contact details and project information confidential. Do not share or use them outside WebNegosyo.'],
                                            ['Professionalism', 'Be honest and professional with every client. Do not make promises WebNegosyo has not approved.'],
                                        ],
                                    },
                                    {
                                        icon: Key,
                                        title: 'Your Account',
                                        items: [
                                            ['Keep it private', 'Your login is personal. Do not share it with anyone.'],
                                            ['Report issues', 'Tell the owner right away if you see wrong figures or suspicious activity on your account.'],
                                        ],
                                    },
                                ].map(card => (
                                    <div key={card.title} className="space-y-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                                                <card.icon className="w-4 h-4 text-white" />
                                            </div>
                                            <h3 className="font-black text-[11px] uppercase tracking-widest text-ink">{card.title}</h3>
                                        </div>
                                        <ul className="space-y-2.5 pl-1">
                                            {card.items.map(([label, text]) => (
                                                <li key={label} className="flex gap-3 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5 shrink-0" />
                                                    <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                                                        <span className="font-black text-ink uppercase tracking-tight">{label}: </span>{text}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                            className="relative w-full max-w-xl bg-white rounded-[2rem] lg:rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 lg:p-10 border-b border-zinc-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl lg:text-2xl font-black tracking-tighter uppercase italic text-black">New Client Record</h2>
                                    <p className="text-[9px] lg:text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Complete all details for the client deal</p>
                                </div>
                                <button title="Close" onClick={() => setShowAddModal(false)} className="p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                                    <X className="w-5 h-5 text-zinc-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddClient} className="p-6 lg:p-10 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
                                            type="text"
                                            inputMode="numeric"
                                            required
                                            title="Package Value"
                                            placeholder="0"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.deal_value || ''}
                                            onChange={(e) => {
                                                const deal_value = Number(e.target.value.replace(/[^0-9]/g, ""));
                                                setAddForm({ ...addForm, deal_value });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Down Payment (₱)</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            title="Down Payment"
                                            placeholder="0"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.down_payment || ''}
                                            onChange={(e) => {
                                                const down_payment = Number(e.target.value.replace(/[^0-9]/g, ""));
                                                setAddForm({ ...addForm, down_payment });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Tip (₱)</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            title="Tip"
                                            placeholder="0"
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-sm transition-all"
                                            value={addForm.tip || ''}
                                            onChange={(e) => setAddForm({ ...addForm, tip: Number(e.target.value.replace(/[^0-9]/g, "")) })}
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
                                    {(addForm.payment_status === 'Fully Paid' || (addForm.deal_value - addForm.down_payment <= 0 && addForm.payment_status !== 'Cancelled Project' && addForm.payment_status !== 'Downpayment Only')) && (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2 text-green-600">
                                                Comission
                                            </span>
                                            <div className="w-full px-6 py-4 bg-green-50 border border-green-100 rounded-2xl font-black text-sm text-green-600 tabular-nums">
                                                ₱{(addForm.deal_value * workerRate / 100).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Payment Status</span>
                                    <select
                                        title="Payment Status"
                                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs uppercase tracking-widest transition-all appearance-none"
                                        value={addForm.payment_status}
                                        onChange={(e) => setAddForm({ ...addForm, payment_status: e.target.value, commission_rate: workerRate })}
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
        </div >
    );
};
