import React, { useState, useEffect, useRef } from 'react';
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
    FileSpreadsheet,
    LayoutGrid,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    Fingerprint,
    ShieldCheck,
    AlertCircle,
    Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { downloadCsv } from '../lib/csv';
import { dealCommission, dealBalance } from '../lib/dealMath';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeDailyAudit } from '../components/EmployeeDailyAudit';
import { LogoMark } from '../components/Logo';
import { isBiometricsAvailable, registerBiometrics, getRegisteredBiometrics, removeBiometrics } from '../lib/biometrics';

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
    down_payment_date?: string | null;
    full_payment?: number;
    full_payment_date?: string | null;
    paid_balance?: number;
    paid_balance_date?: string | null;
    proof_image_url?: string | null;
    worker_id: string;
    webdev_id?: string;
    is_hidden: boolean;
    month: string;
    commission_rate?: number;
    created_at: string;
    webdev?: { name: string };
    paid_stamped_at?: string | null;
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
    const [mobileDealsView, setMobileDealsView] = useState<'cards' | 'sheet'>('cards');
    const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
    const dealsTableScrollRef = useRef<HTMLDivElement>(null);
    const slideDealsTable = (dir: 1 | -1) => {
        const el = dealsTableScrollRef.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
    };

    // Edit form state
    const [editForm, setEditForm] = useState({
        client_name: '',
        deal_value: 0,
        down_payment: 0,
        tip: 0,
        payment_status: 'Downpayment Only' as string,
        down_payment_date: '',
        full_payment: 0,
        full_payment_date: '',
        paid_balance: 0,
        paid_balance_date: '',
        proof_image_url: '',
        commission_rate: 10,
    });
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Add client form state
    const [addForm, setAddForm] = useState({
        month: new Date().toLocaleString('default', { month: 'long' }),
        date: new Date().toISOString().split('T')[0],
        client_name: '',
        contact_info: '',
        ad_source: 'Direct',
        deal_value: 5499,
        down_payment: 0,
        tip: 0,
        payment_status: 'Downpayment Only' as string,
        commission_rate: 20,
        webdev_id: '',
        down_payment_date: '',
        full_payment: 0,
        full_payment_date: '',
        paid_balance: 0,
        paid_balance_date: '',
    });
    const [addProofFile, setAddProofFile] = useState<File | null>(null);

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
    const savedRate: number | null = null;
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Biometric Fingerprint State
    const [bioAvailable, setBioAvailable] = useState<boolean | null>(null);
    const [bioRecord, setBioRecord] = useState<any>(null);
    const [showBioModal, setShowBioModal] = useState(false);
    const [bioPassword, setBioPassword] = useState('');
    const [bioLoading, setBioLoading] = useState(false);
    const [bioError, setBioError] = useState<string | null>(null);
    const [bioSuccess, setBioSuccess] = useState<string | null>(null);

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

            // Check biometric availability and existing registration
            const checkBio = async () => {
                const available = await isBiometricsAvailable();
                setBioAvailable(available);
                const username = profile.email?.split('@')[0] || '';
                if (username) {
                    const rec = getRegisteredBiometrics(username);
                    setBioRecord(rec);
                }
            };
            checkBio();
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

    const handleRegisterFingerprint = async (e: React.FormEvent) => {
        e.preventDefault();
        const username = profile?.email?.split('@')[0] || '';
        if (!username) {
            setBioError('Unable to identify your employee account username.');
            return;
        }
        if (!bioPassword) {
            setBioError('Please enter your account password.');
            return;
        }

        setBioLoading(true);
        setBioError(null);
        setBioSuccess(null);

        try {
            // Verify password first with supabase
            const internalEmail = `${username.toLowerCase()}@webnegosyo.internal`;
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: internalEmail,
                password: bioPassword,
            });
            if (authError) {
                throw new Error('Incorrect password. Please verify your password and try again.');
            }

            // Trigger hardware biometric prompt (Windows Hello / Touch ID / Fingerprint sensor)
            const registration = await registerBiometrics(username, { password: bioPassword });
            setBioRecord(registration);
            setBioSuccess('Fingerprint registered successfully! You can now use your fingerprint to sign in.');
            setBioPassword('');
            setTimeout(() => {
                setShowBioModal(false);
                setBioSuccess(null);
            }, 1800);
        } catch (err: any) {
            setBioError(err?.message || 'Failed to register fingerprint');
        } finally {
            setBioLoading(false);
        }
    };

    const handleRemoveFingerprint = () => {
        const username = profile?.email?.split('@')[0] || '';
        if (!username) return;
        if (window.confirm('Remove registered fingerprint login for this device?')) {
            removeBiometrics(username);
            setBioRecord(null);
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
                    payment_status: newStatus
                })
                .eq('id', id);
            if (error) throw error;
            fetchLeads();
        } catch (err) {
            console.error('Error updating payment status:', err);
        }
    };

    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.trim().toLowerCase();
        const clientName = (lead.client_name || '').toLowerCase();
        const matchesSearch = query === '' || clientName.includes(query);
        const matchesStatus = statusFilter === 'all' || (lead.payment_status || 'Downpayment Only') === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
            down_payment_date: lead.down_payment_date || '',
            full_payment: Number(lead.full_payment || 0),
            full_payment_date: lead.full_payment_date || '',
            paid_balance: Number(lead.paid_balance || 0),
            paid_balance_date: lead.paid_balance_date || '',
            proof_image_url: lead.proof_image_url || '',
            commission_rate: Number(lead.commission_rate ?? workerRate),
        });
        setProofFile(null);
    };

    // Commission % is entered by the employee themselves (My Profile).
    const workerRate = savedRate ?? Number(profile?.commission_percentage ?? 10);

    // Fixed commission: ₱300 per deal if 5499, ₱250 per deal if 3499. Earned once Fully Paid.
    // Tip is strictly separate and NOT included in commission or balance.
    const getCommission = (lead: { payment_status?: string | null; deal_value: number | string; commission_rate?: number | string | null }) =>
        dealCommission(lead, workerRate);

    const totalCommission = leads.reduce((sum, l) => sum + getCommission(l), 0);

    const fmtDate = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString() : '—');

    // Balance: If Fully Paid, total package minus commission (e.g. 5499 - 300 = 5199, or 3499 - 250 = 3249).
    const getBalance = (lead: Lead) =>
        dealBalance(lead, workerRate);

    const saveEdit = async (id: string) => {
        setIsSaving(true);
        try {
            const balance = editForm.deal_value - editForm.down_payment;
            const proofUrl = proofFile ? await handleUpload(proofFile, 'payment-proofs') : (editForm.proof_image_url || null);
            const { error } = await supabase
                .from('leads')
                .update({
                    client_name: editForm.client_name,
                    deal_value: editForm.deal_value,
                    down_payment: editForm.down_payment,
                    down_payment_date: editForm.down_payment_date || null,
                    full_payment: editForm.full_payment,
                    full_payment_date: editForm.full_payment_date || null,
                    paid_balance: editForm.paid_balance,
                    paid_balance_date: editForm.paid_balance_date || null,
                    proof_image_url: proofUrl,
                    tip: editForm.tip,
                    payment_status: (editForm.payment_status === 'Cancelled Project' || editForm.payment_status === 'Downpayment Only')
                        ? editForm.payment_status
                        : (balance <= 0 ? 'Fully Paid' : editForm.payment_status),
                    commission_rate: Math.min(100, Math.max(0, Number(editForm.commission_rate) || 0)),
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                alert(`Error saving changes: ${error.message}`);
                throw error;
            }
            setEditingId(null);
            setProofFile(null);
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
            const proofUrl = addProofFile ? await handleUpload(addProofFile, 'payment-proofs') : null;

            const { error } = await supabase.from('leads').insert({
                client_name: addForm.client_name,
                contact_info: addForm.contact_info,
                ad_source: addForm.ad_source,
                deal_value: addForm.deal_value,
                down_payment: addForm.down_payment,
                down_payment_date: addForm.down_payment_date || null,
                full_payment: addForm.full_payment,
                full_payment_date: addForm.full_payment_date || null,
                paid_balance: addForm.paid_balance,
                paid_balance_date: addForm.paid_balance_date || null,
                proof_image_url: proofUrl,
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
                deal_value: 5499,
                down_payment: 0,
                tip: 0,
                payment_status: 'Downpayment Only',
                commission_rate: workerRate,
                webdev_id: profile?.assigned_webdev_id || '',
                down_payment_date: '',
                full_payment: 0,
                full_payment_date: '',
                paid_balance: 0,
                paid_balance_date: '',
            });
            setAddProofFile(null);
            fetchLeads();
        } catch (err) {
            console.error('Error adding client:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const openAddModal = async () => {
        const { data } = await supabase.from('app_settings').select('package_price').eq('id', 1).maybeSingle();
        const price = Number(data?.package_price) || 5499;
        setAddForm(prev => ({ ...prev, deal_value: prev.deal_value || price }));
        setShowAddModal(true);
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
            'Down Payment', 'Down Payment Date', 'Full Payment', 'Full Payment Date',
            'Paid Balance', 'Paid Balance Date', 'Tip', 'Payment Status', 'Balance', 'Commission'
        ];

        const csvData = filteredLeads.map(lead => [
            lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' }),
            new Date(lead.created_at).toLocaleDateString(),
            lead.client_name,
            lead.webdev?.name || 'Unassigned',
            lead.deal_value,
            lead.down_payment,
            lead.down_payment_date || '',
            lead.full_payment || 0,
            lead.full_payment_date || '',
            lead.paid_balance || 0,
            lead.paid_balance_date || '',
            lead.tip || 0,
            lead.payment_status || 'Downpayment Only',
            getBalance(lead),
            getCommission(lead)
        ]);

        downloadCsv(`client_deals_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...csvData]);
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
                                        onClick={openAddModal}
                                        className="hidden md:flex md:w-auto items-center justify-center gap-2 px-6 py-3.5 bg-ink text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95"
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
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mt-2 relative">₱300 (5499) / ₱250 (3499) per fully paid deal</p>
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

                                {/* Toolbar & Filters */}
                                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        {/* Search Input */}
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search client name..."
                                                className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-800 outline-none transition-all"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Add Client Button */}
                                            <button
                                                onClick={openAddModal}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Add Client</span>
                                            </button>

                                            {/* CSV Export Button */}
                                            <button
                                                onClick={handleDownloadCSV}
                                                title="Please download only after 2 weeks"
                                                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Export Excel</span>
                                            </button>

                                            {/* Mobile View Switcher (Visible only on mobile screens) */}
                                            <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                                <button
                                                    onClick={() => setMobileDealsView('cards')}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                                                        mobileDealsView === 'cards' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                                    )}
                                                >
                                                    <LayoutGrid className="w-3.5 h-3.5" />
                                                    <span>Cards</span>
                                                </button>
                                                <button
                                                    onClick={() => setMobileDealsView('sheet')}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                                                        mobileDealsView === 'sheet' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                                    )}
                                                >
                                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                                    <span>Sheet</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Filter Tabs */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Filter:</span>
                                            <button
                                                onClick={() => setStatusFilter('all')}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap text-xs",
                                                    statusFilter === 'all'
                                                        ? "bg-slate-800 text-white shadow-xs"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                )}
                                            >
                                                All ({leads.length})
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('Fully Paid')}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap text-xs flex items-center gap-1.5",
                                                    statusFilter === 'Fully Paid'
                                                        ? "bg-emerald-700 text-white shadow-xs"
                                                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                                )}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                Fully Paid ({dealCounts.paid})
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('Downpayment Only')}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap text-xs flex items-center gap-1.5",
                                                    statusFilter === 'Downpayment Only'
                                                        ? "bg-blue-700 text-white shadow-xs"
                                                        : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                                                )}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                Downpayment ({dealCounts.dp})
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('Cancelled Project')}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap text-xs flex items-center gap-1.5",
                                                    statusFilter === 'Cancelled Project'
                                                        ? "bg-rose-700 text-white shadow-xs"
                                                        : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                                                )}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                Cancelled ({dealCounts.cancelled})
                                            </button>
                                        </div>

                                        {/* Pan Table Controls */}
                                        <div className="hidden md:flex items-center gap-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Pan Table:</span>
                                            <button
                                                type="button"
                                                onClick={() => slideDealsTable(-1)}
                                                title="Slide left"
                                                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => slideDealsTable(1)}
                                                title="Slide right"
                                                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ============================================================== */}
                                {/* MOBILE VIEW (CARD OR SHEET TOGGLE)                            */}
                                {/* ============================================================== */}
                                <div className="md:hidden">
                                    {mobileDealsView === 'cards' ? (
                                        /* MOBILE CARD VIEW: Clean, high-contrast, touch-optimized */
                                        <div className="space-y-3">
                                            {loading ? (
                                                [1, 2, 3].map(i => (
                                                    <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                                                ))
                                            ) : filteredLeads.length === 0 ? (
                                                <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl p-6">
                                                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                    <p className="text-slate-700 font-bold text-sm">
                                                        {searchQuery || statusFilter !== 'all' ? "No matching deals" : "No deals yet"}
                                                    </p>
                                                    <p className="text-slate-400 text-xs mt-1 mb-3">
                                                        {searchQuery || statusFilter !== 'all' ? "Try adjusting search or status filters." : 'Click "Add Client" to record your first deal.'}
                                                    </p>
                                                    <button
                                                        onClick={openAddModal}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Add Client
                                                    </button>
                                                </div>
                                            ) : (
                                                filteredLeads.map((lead) => {
                                                    const isExpanded = expandedDealId === lead.id;
                                                    const isFullyPaid = lead.payment_status === 'Fully Paid';
                                                    const isDP = (lead.payment_status || 'Downpayment Only') === 'Downpayment Only';
                                                    const isCancelled = lead.payment_status === 'Cancelled Project';

                                                    return (
                                                        <div
                                                            key={lead.id}
                                                            className={cn(
                                                                "bg-white border rounded-2xl shadow-xs overflow-hidden transition-all",
                                                                isFullyPaid ? "border-emerald-200 border-l-4 border-l-emerald-500" :
                                                                    isDP ? "border-blue-200 border-l-4 border-l-blue-500" :
                                                                        isCancelled ? "border-rose-200 border-l-4 border-l-rose-500" :
                                                                            "border-slate-200 border-l-4 border-l-slate-400"
                                                            )}
                                                        >
                                                            {/* Card Header */}
                                                            <div className="p-3.5 pb-2">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <h3 className="font-black text-sm text-slate-900 tracking-tight leading-snug truncate">
                                                                                {lead.client_name}
                                                                            </h3>
                                                                            {lead.paid_stamped_at && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                                                                    PAID
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                                                                            <span>{lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })}</span>
                                                                            <span>·</span>
                                                                            <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                                                            {lead.webdev?.name && (
                                                                                <>
                                                                                    <span>·</span>
                                                                                    <span className="text-slate-600 font-semibold">{lead.webdev.name}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Status Pill Badge */}
                                                                    <div className="shrink-0">
                                                                        <span className={cn(
                                                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                                            isFullyPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                                                                isDP ? "bg-blue-100 text-blue-800 border border-blue-300" :
                                                                                    isCancelled ? "bg-rose-100 text-rose-800 border border-rose-300" :
                                                                                        "bg-slate-100 text-slate-700 border border-slate-300"
                                                                        )}>
                                                                            {lead.status === 'failed' ? 'Cancelled' : (lead.payment_status || 'Downpayment Only')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Paid Stamp Banner if stamped */}
                                                                {lead.paid_stamped_at && (
                                                                    <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-rose-50/60 rounded-lg border border-rose-100">
                                                                        <img
                                                                            src="/paid-stamp.jpg"
                                                                            alt="Paid Stamp"
                                                                            className="w-7 h-7 object-contain mix-blend-multiply pointer-events-none select-none"
                                                                        />
                                                                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                                                                            Paid stamped on {new Date(lead.paid_stamped_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Excel-style mini metrics grid inside card */}
                                                            <div className="px-3.5 py-2">
                                                                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-xs">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Package</span>
                                                                        <span className="font-black text-slate-900 tabular-nums text-sm">
                                                                            ₱{Number(lead.deal_value).toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 font-medium block">
                                                                            {lead.deal_value === 5499 ? '5,499 Pkg' : lead.deal_value === 3499 ? '3,499 Pkg' : 'Custom'}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Down Payment</span>
                                                                        <span className="font-black text-amber-700 tabular-nums text-sm">
                                                                            ₱{Number(lead.down_payment).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="border-t border-slate-200/60 pt-1.5">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Balance</span>
                                                                        <span className="font-black text-rose-600 tabular-nums text-sm">
                                                                            ₱{Math.abs(getBalance(lead)).toLocaleString()}
                                                                        </span>
                                                                        {isFullyPaid && (
                                                                            <span className="text-[9px] text-slate-400 font-medium block">
                                                                                {lead.deal_value >= 5499 ? '5,499 - 300' : lead.deal_value >= 3499 ? '3,499 - 250' : 'Net'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="border-t border-slate-200/60 pt-1.5">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Commission</span>
                                                                        <span className="font-black text-emerald-600 tabular-nums text-sm">
                                                                            {isFullyPaid ? `₱${getCommission(lead).toLocaleString()}` : '—'}
                                                                        </span>
                                                                        {isFullyPaid && (
                                                                            <span className="text-[9px] text-slate-400 font-medium block">
                                                                                {lead.deal_value >= 5499 ? '₱300 Fixed' : lead.deal_value >= 3499 ? '₱250 Fixed' : `${Number(lead.commission_rate ?? workerRate)}%`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Expandable Details Drawer */}
                                                            {isExpanded && (
                                                                <div className="px-3.5 py-2.5 bg-slate-50/50 border-t border-slate-100 text-xs space-y-2">
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        <div>
                                                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Webdev</span>
                                                                            <span className="font-semibold text-slate-800">{lead.webdev?.name || 'Unassigned'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Tip</span>
                                                                            <span className="font-bold text-blue-600 tabular-nums">₱{Number(lead.tip || 0).toLocaleString()}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Full Payment</span>
                                                                            <span className="font-semibold text-slate-800 tabular-nums">₱{Number(lead.full_payment || 0).toLocaleString()}</span>
                                                                            {lead.full_payment_date && <span className="text-[10px] text-slate-400 block">{fmtDate(lead.full_payment_date)}</span>}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Paid Balance</span>
                                                                            <span className="font-semibold text-slate-800 tabular-nums">₱{Number(lead.paid_balance || 0).toLocaleString()}</span>
                                                                            {lead.paid_balance_date && <span className="text-[10px] text-slate-400 block">{fmtDate(lead.paid_balance_date)}</span>}
                                                                        </div>
                                                                    </div>

                                                                    {lead.proof_image_url && (
                                                                        <div className="pt-1 flex items-center gap-2">
                                                                            <span className="text-[10px] font-bold uppercase text-slate-400">Proof:</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setPreviewImage(lead.proof_image_url!)}
                                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-xs"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                                                View Receipt Proof
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Card Actions Footer */}
                                                            <div className="px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExpandedDealId(isExpanded ? null : lead.id)}
                                                                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1"
                                                                >
                                                                    <span>{isExpanded ? 'Less details' : 'More details'}</span>
                                                                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                                                                </button>

                                                                <div className="flex items-center gap-2">
                                                                    {/* Quick status dots */}
                                                                    <div className="flex items-center gap-1.5 pr-1 border-r border-slate-200">
                                                                        <button onClick={() => updatePaymentStatus(lead.id, 'Fully Paid')} title="Mark Fully Paid" className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:scale-125 transition-transform" />
                                                                        <button onClick={() => updatePaymentStatus(lead.id, 'Downpayment Only')} title="Mark Downpayment Only" className="w-3.5 h-3.5 rounded-full bg-blue-500 hover:scale-125 transition-transform" />
                                                                        <button onClick={() => updatePaymentStatus(lead.id, 'Cancelled Project')} title="Mark Cancelled" className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:scale-125 transition-transform" />
                                                                    </div>

                                                                    <button
                                                                        onClick={() => startEditing(lead)}
                                                                        title="Edit Record"
                                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteLead(lead.id)}
                                                                        title="Delete Record"
                                                                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    ) : (
                                        /* MOBILE SPREADSHEET VIEW: Scrollable table with sticky client name */
                                        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                                            <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                                                <span>Swipe horizontally to view all columns 👉</span>
                                                <span className="text-[10px] text-slate-500 font-medium">({filteredLeads.length} rows)</span>
                                            </div>
                                            <div className="overflow-x-auto pb-2">
                                                <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                                            <th className="px-2 py-2 border-r border-slate-200 sticky left-0 bg-slate-100 z-10 w-28">Client</th>
                                                            <th className="px-2 py-2 border-r border-slate-200">Status</th>
                                                            <th className="px-2 py-2 border-r border-slate-200 text-right">Package</th>
                                                            <th className="px-2 py-2 border-r border-slate-200 text-right">Downpayment</th>
                                                            <th className="px-2 py-2 border-r border-slate-200 text-right">Balance</th>
                                                            <th className="px-2 py-2 border-r border-slate-200 text-right">Commission</th>
                                                            <th className="px-2 py-2 border-r border-slate-200">Webdev</th>
                                                            <th className="px-2 py-2 border-r border-slate-200">Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200">
                                                        {filteredLeads.map((lead) => (
                                                            <tr
                                                                key={lead.id}
                                                                className={cn(
                                                                    "border-b border-slate-200",
                                                                    lead.payment_status === 'Fully Paid' ? "bg-emerald-50/50" :
                                                                        (lead.payment_status || 'Downpayment Only') === 'Downpayment Only' ? "bg-blue-50/30" :
                                                                            lead.payment_status === 'Cancelled Project' ? "bg-rose-50/40" : "bg-white"
                                                                )}
                                                            >
                                                                <td className="px-2 py-2 border-r border-slate-200 sticky left-0 bg-inherit font-bold text-slate-900 z-10 truncate max-w-[120px]">
                                                                    {lead.client_name}
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 whitespace-nowrap">
                                                                    <span className={cn(
                                                                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                                        lead.payment_status === 'Fully Paid' ? "bg-emerald-100 text-emerald-800" :
                                                                            (lead.payment_status || 'Downpayment Only') === 'Downpayment Only' ? "bg-blue-100 text-blue-800" :
                                                                                lead.payment_status === 'Cancelled Project' ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                                                                    )}>
                                                                        {lead.payment_status || 'Downpayment Only'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 text-right font-bold tabular-nums">
                                                                    ₱{Number(lead.deal_value).toLocaleString()}
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 text-right font-bold text-amber-700 tabular-nums">
                                                                    ₱{Number(lead.down_payment).toLocaleString()}
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 text-right font-bold text-rose-600 tabular-nums">
                                                                    ₱{Math.abs(getBalance(lead)).toLocaleString()}
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 text-right font-bold text-emerald-700 tabular-nums">
                                                                    {lead.payment_status === 'Fully Paid' ? `₱${getCommission(lead).toLocaleString()}` : '—'}
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 whitespace-nowrap text-slate-700">
                                                                    {lead.webdev?.name || 'Unassigned'}
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-200 whitespace-nowrap text-slate-600 tabular-nums">
                                                                    {new Date(lead.created_at).toLocaleDateString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ============================================================== */}
                                {/* DESKTOP WEBSITE VIEW: Full Excel Spreadsheet Grid Experience  */}
                                {/* ============================================================== */}
                                <div className="hidden md:block bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                                    <div
                                        ref={dealsTableScrollRef}
                                        className="overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
                                    >
                                        <table className="w-full text-left border-collapse border-spacing-0">
                                            <thead>
                                                <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 text-xs font-bold uppercase tracking-wider select-none sticky top-0 z-20">
                                                    <th className="px-3 py-2.5 border-r border-slate-200 min-w-[180px]">Client</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200">Webdev</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right">Package</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right">Down Payment</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right">Full Payment</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right">Paid Balance</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right">Tip</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200">Status</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right bg-rose-50/40 text-rose-900">Balance</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-right bg-emerald-50/40 text-emerald-900">Commission</th>
                                                    <th className="px-3 py-2.5 border-r border-slate-200 text-center w-14">Proof</th>
                                                    <th className="px-3 py-2.5 text-right w-24">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 text-xs">
                                                {loading ? (
                                                    [1, 2, 3, 4].map(i => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td colSpan={12} className="px-4 py-4 bg-slate-50/50">
                                                                <div className="h-4 bg-slate-200 rounded-full w-full" />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : filteredLeads.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={12} className="px-6 py-16 text-center bg-white">
                                                            <div className="max-w-xs mx-auto space-y-2">
                                                                <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                                                                <p className="text-slate-800 font-bold text-sm">
                                                                    {searchQuery || statusFilter !== 'all' ? 'No matching deals' : 'No deals recorded yet'}
                                                                </p>
                                                                <p className="text-slate-400 text-xs">
                                                                    {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or status filter.' : 'Click "Add Client" to record your first deal.'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredLeads.map((lead) => {
                                                    const editing = editingId === lead.id;
                                                    const isFullyPaid = lead.payment_status === 'Fully Paid';
                                                    const isDP = (lead.payment_status || 'Downpayment Only') === 'Downpayment Only';
                                                    const isCancelled = lead.payment_status === 'Cancelled Project';
                                                    const inputCls = 'px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-slate-800 transition-all text-slate-900 shadow-2xs';

                                                    return (
                                                        <tr
                                                            key={lead.id}
                                                            className={cn(
                                                                "transition-colors group",
                                                                isFullyPaid
                                                                    ? "bg-emerald-50/40 hover:bg-emerald-100/50"
                                                                    : isDP
                                                                        ? "bg-blue-50/30 hover:bg-blue-100/40"
                                                                        : isCancelled
                                                                            ? "bg-rose-50/40 hover:bg-rose-100/50"
                                                                            : "bg-white hover:bg-slate-50"
                                                            )}
                                                        >
                                                            {/* Client Name */}
                                                            <td className="px-3 py-2 border-r border-slate-200 relative pr-12">
                                                                {editing ? (
                                                                    <input
                                                                        type="text"
                                                                        title="Client Name"
                                                                        placeholder="Client name"
                                                                        className={cn(inputCls, 'w-full min-w-[7rem]')}
                                                                        value={editForm.client_name}
                                                                        onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="font-bold text-slate-900 text-[13px]">{lead.client_name}</span>
                                                                            {lead.paid_stamped_at && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                                                                    PAID
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                                                                            {lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })} · {new Date(lead.created_at).toLocaleDateString()}
                                                                        </div>
                                                                        {lead.paid_stamped_at && (
                                                                            <img
                                                                                src="/paid-stamp.jpg"
                                                                                alt="Paid"
                                                                                title={`Paid stamped on ${new Date(lead.paid_stamped_at).toLocaleDateString()}`}
                                                                                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 object-contain -rotate-12 pointer-events-none select-none mix-blend-multiply opacity-80"
                                                                            />
                                                                        )}
                                                                    </>
                                                                )}
                                                            </td>

                                                            {/* Webdev */}
                                                            <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                                                                <span className={cn(
                                                                    "font-medium",
                                                                    lead.webdev?.name ? "text-slate-800" : "text-slate-400 italic"
                                                                )}>
                                                                    {lead.webdev?.name || 'Unassigned'}
                                                                </span>
                                                            </td>

                                                            {/* Package Value */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                                {editing ? (
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditForm(prev => ({ ...prev, deal_value: 3499 }))}
                                                                                className={cn(
                                                                                    "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all",
                                                                                    editForm.deal_value === 3499
                                                                                        ? "bg-slate-900 text-white border-slate-900"
                                                                                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                                                                )}
                                                                                title="Select ₱3,499 Package"
                                                                            >
                                                                                3499
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditForm(prev => ({ ...prev, deal_value: 5499 }))}
                                                                                className={cn(
                                                                                    "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all",
                                                                                    editForm.deal_value === 5499
                                                                                        ? "bg-slate-900 text-white border-slate-900"
                                                                                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                                                                )}
                                                                                title="Select ₱5,499 Package"
                                                                            >
                                                                                5499
                                                                            </button>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            title="Package Value"
                                                                            placeholder="0"
                                                                            className={cn(inputCls, 'w-20 text-right')}
                                                                            value={editForm.deal_value || ''}
                                                                            onChange={(e) => setEditForm({ ...editForm, deal_value: Number(e.target.value) })}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span className="font-bold text-slate-900 tabular-nums">
                                                                            ₱{Number(lead.deal_value).toLocaleString()}
                                                                        </span>
                                                                        <span className="block text-[10px] font-medium text-slate-400">
                                                                            {lead.deal_value === 5499 ? '5,499 Pkg' : lead.deal_value === 3499 ? '3,499 Pkg' : 'Custom'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Down Payment */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                                {editing ? (
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="number"
                                                                            title="Down Payment"
                                                                            placeholder="0"
                                                                            className={cn(inputCls, 'w-20 text-right')}
                                                                            value={editForm.down_payment || ''}
                                                                            onChange={(e) => setEditForm({ ...editForm, down_payment: Number(e.target.value) })}
                                                                        />
                                                                        <input
                                                                            type="date"
                                                                            title="Down Payment Date"
                                                                            className={cn(inputCls, 'w-24 text-[10px] block')}
                                                                            value={editForm.down_payment_date}
                                                                            onChange={(e) => setEditForm({ ...editForm, down_payment_date: e.target.value })}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-bold text-amber-700 tabular-nums">
                                                                            ₱{Number(lead.down_payment).toLocaleString()}
                                                                        </span>
                                                                        {lead.down_payment_date && (
                                                                            <span className="block text-[10px] text-slate-400 font-medium">
                                                                                {fmtDate(lead.down_payment_date)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </td>

                                                            {/* Full Payment */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                                {editing ? (
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="number"
                                                                            title="Full Payment"
                                                                            placeholder="0"
                                                                            className={cn(inputCls, 'w-20 text-right')}
                                                                            value={editForm.full_payment || ''}
                                                                            onChange={(e) => setEditForm({ ...editForm, full_payment: Number(e.target.value) })}
                                                                        />
                                                                        <input
                                                                            type="date"
                                                                            title="Full Payment Date"
                                                                            className={cn(inputCls, 'w-24 text-[10px] block')}
                                                                            value={editForm.full_payment_date}
                                                                            onChange={(e) => setEditForm({ ...editForm, full_payment_date: e.target.value })}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-semibold text-slate-800 tabular-nums">
                                                                            ₱{Number(lead.full_payment || 0).toLocaleString()}
                                                                        </span>
                                                                        {lead.full_payment_date && (
                                                                            <span className="block text-[10px] text-slate-400 font-medium">
                                                                                {fmtDate(lead.full_payment_date)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </td>

                                                            {/* Paid Balance */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                                {editing ? (
                                                                    <div className="space-y-1">
                                                                        <input
                                                                            type="number"
                                                                            title="Paid Balance"
                                                                            placeholder="0"
                                                                            className={cn(inputCls, 'w-20 text-right')}
                                                                            value={editForm.paid_balance || ''}
                                                                            onChange={(e) => setEditForm({ ...editForm, paid_balance: Number(e.target.value) })}
                                                                        />
                                                                        <input
                                                                            type="date"
                                                                            title="Paid Balance Date"
                                                                            className={cn(inputCls, 'w-24 text-[10px] block')}
                                                                            value={editForm.paid_balance_date}
                                                                            onChange={(e) => setEditForm({ ...editForm, paid_balance_date: e.target.value })}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-semibold text-slate-800 tabular-nums">
                                                                            ₱{Number(lead.paid_balance || 0).toLocaleString()}
                                                                        </span>
                                                                        {lead.paid_balance_date && (
                                                                            <span className="block text-[10px] text-slate-400 font-medium">
                                                                                {fmtDate(lead.paid_balance_date)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </td>

                                                            {/* Tip */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                                {editing ? (
                                                                    <input
                                                                        type="number"
                                                                        title="Tip"
                                                                        placeholder="0"
                                                                        className={cn(inputCls, 'w-16 text-right')}
                                                                        value={editForm.tip || ''}
                                                                        onChange={(e) => setEditForm({ ...editForm, tip: Number(e.target.value) })}
                                                                    />
                                                                ) : (
                                                                    <span className="font-semibold text-blue-700 tabular-nums">
                                                                        ₱{Number(lead.tip || 0).toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Status */}
                                                            <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                                                                {editing ? (
                                                                    <select
                                                                        title="Payment Status"
                                                                        className={cn(inputCls, 'text-[11px]')}
                                                                        value={editForm.payment_status}
                                                                        onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                                                                    >
                                                                        <option value="Downpayment Only">Downpayment Only</option>
                                                                        <option value="Fully Paid">Fully Paid</option>
                                                                        <option value="Cancelled Project">Cancelled Project</option>
                                                                    </select>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs",
                                                                            isFullyPaid
                                                                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                                                                : isDP
                                                                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                                                                    : isCancelled
                                                                                        ? "bg-rose-100 text-rose-800 border-rose-300"
                                                                                        : "bg-slate-100 text-slate-700 border-slate-300"
                                                                        )}>
                                                                            {lead.status === 'failed' ? 'Cancelled' : (lead.payment_status || 'Downpayment Only')}
                                                                        </span>
                                                                        {/* Quick status dots */}
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => updatePaymentStatus(lead.id, 'Fully Paid')} title="Mark Fully Paid" className="w-2.5 h-2.5 rounded-full bg-emerald-500 hover:scale-125 transition-transform" />
                                                                            <button onClick={() => updatePaymentStatus(lead.id, 'Downpayment Only')} title="Mark Downpayment Only" className="w-2.5 h-2.5 rounded-full bg-blue-500 hover:scale-125 transition-transform" />
                                                                            <button onClick={() => updatePaymentStatus(lead.id, 'Cancelled Project')} title="Mark Cancelled" className="w-2.5 h-2.5 rounded-full bg-rose-500 hover:scale-125 transition-transform" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Balance */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap bg-rose-50/20">
                                                                <span className="font-black text-rose-600 tabular-nums">
                                                                    ₱{Math.abs(getBalance(lead)).toLocaleString()}
                                                                </span>
                                                                {isFullyPaid && (
                                                                    <span className="block text-[9px] text-slate-400 font-medium">
                                                                        {lead.deal_value >= 5499 ? '5,499 - 300' : lead.deal_value >= 3499 ? '3,499 - 250' : 'Net'}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Commission */}
                                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap bg-emerald-50/20">
                                                                {editing ? (
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <input
                                                                            type="number"
                                                                            title="Commission %"
                                                                            placeholder="0"
                                                                            min={0}
                                                                            max={100}
                                                                            className={cn(inputCls, 'w-14 text-right')}
                                                                            value={editForm.commission_rate || ''}
                                                                            onChange={(e) => setEditForm({ ...editForm, commission_rate: Number(e.target.value) })}
                                                                        />
                                                                        <span className="text-[10px] font-bold text-slate-500">%</span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-black text-emerald-700 tabular-nums">
                                                                            {isFullyPaid ? `₱${getCommission(lead).toLocaleString()}` : '—'}
                                                                        </span>
                                                                        <span className="block text-[10px] text-slate-400 font-medium">
                                                                            {lead.deal_value >= 5499 ? '₱300 Fixed' : lead.deal_value >= 3499 ? '₱250 Fixed' : `${Number(lead.commission_rate ?? workerRate)}%`}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </td>

                                                            {/* Proof Thumbnail */}
                                                            <td className="px-2 py-2 border-r border-slate-200 text-center">
                                                                {editing ? (
                                                                    <label className="inline-block cursor-pointer">
                                                                        <span className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-700 hover:border-slate-800 transition-all">
                                                                            {proofFile ? proofFile.name.slice(0, 10) : (editForm.proof_image_url ? 'Replace' : 'Upload')}
                                                                        </span>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            title="Upload proof of payment"
                                                                            className="hidden"
                                                                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                                                        />
                                                                    </label>
                                                                ) : lead.proof_image_url ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewImage(lead.proof_image_url!)}
                                                                        title="Click to view full receipt proof"
                                                                        className="inline-block"
                                                                    >
                                                                        <img
                                                                            src={lead.proof_image_url}
                                                                            alt="Receipt Proof"
                                                                            className="w-7 h-7 object-cover rounded-md border border-slate-300 hover:scale-125 transition-transform shadow-xs mx-auto cursor-zoom-in"
                                                                        />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-300 select-none">—</span>
                                                                )}
                                                            </td>

                                                            {/* Row Actions */}
                                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {editing ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => saveEdit(lead.id)}
                                                                                disabled={isSaving}
                                                                                className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-black transition-all active:scale-90 disabled:opacity-50"
                                                                                title="Save"
                                                                            >
                                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingId(null)}
                                                                                className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all active:scale-90"
                                                                                title="Cancel"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => startEditing(lead)}
                                                                                className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteLead(lead.id)}
                                                                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

                                            {/* Excel Spreadsheet Summary / Totals Row */}
                                            {filteredLeads.length > 0 && (
                                                <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-400 text-xs text-slate-900 select-none">
                                                    <td colSpan={2} className="px-3 py-3 border-r border-slate-300">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs uppercase tracking-wider font-black text-slate-800">
                                                                Total ({filteredLeads.length} deals)
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-semibold">
                                                                Spreadsheet Sums
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* Total Package */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-slate-900 font-black">
                                                        ₱{filteredLeads.reduce((s, l) => s + (Number(l.deal_value) || 0), 0).toLocaleString()}
                                                    </td>
                                                    {/* Total Down Payment */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-amber-800 font-black">
                                                        ₱{filteredLeads.reduce((s, l) => s + (Number(l.down_payment) || 0), 0).toLocaleString()}
                                                    </td>
                                                    {/* Total Full Payment */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-slate-900 font-black">
                                                        ₱{filteredLeads.reduce((s, l) => s + (Number(l.full_payment) || 0), 0).toLocaleString()}
                                                    </td>
                                                    {/* Total Paid Balance */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-slate-900 font-black">
                                                        ₱{filteredLeads.reduce((s, l) => s + (Number(l.paid_balance) || 0), 0).toLocaleString()}
                                                    </td>
                                                    {/* Total Tip */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-blue-700 font-black">
                                                        <div>₱{filteredLeads.reduce((s, l) => s + (Number(l.tip) || 0), 0).toLocaleString()}</div>
                                                        <span className="block text-[9px] text-blue-500 font-semibold tracking-normal">Bukod (Tip)</span>
                                                    </td>
                                                    <td className="px-3 py-3 border-r border-slate-300 text-center text-slate-400 font-medium text-[10px]">
                                                        —
                                                    </td>
                                                    {/* Total Deal Balance */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-rose-600 font-black bg-rose-50/50">
                                                        <div>₱{filteredLeads.reduce((s, l) => s + Math.abs(getBalance(l)), 0).toLocaleString()}</div>
                                                        <span className="block text-[9px] text-rose-500 font-semibold tracking-normal">Without Tip</span>
                                                    </td>
                                                    {/* Total Commission */}
                                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-emerald-700 font-black bg-emerald-50/50">
                                                        <div>₱{filteredLeads.reduce((s, l) => s + getCommission(l), 0).toLocaleString()}</div>
                                                        <span className="block text-[9px] text-emerald-600 font-semibold tracking-normal">₱300/₱250 Com</span>
                                                    </td>
                                                    <td className="px-3 py-3 border-r border-slate-300"></td>
                                                    <td className="px-3 py-3"></td>
                                                </tr>
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
                            {/* PROFILE SECTION: Centered avatar at top, clean details below */}
                            <div className="max-w-2xl mx-auto space-y-5">
                                {/* Header Title */}
                                <div className="text-center">
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">My Profile</h2>
                                    <p className="text-slate-500 text-xs font-semibold mt-1">Your personal details and commission payout information</p>
                                </div>

                                {/* Centered Hero Profile Card */}
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white shadow-xl p-6 sm:p-8 text-center border border-slate-800">
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent_60%)] pointer-events-none" />

                                    {/* Profile Picture (Nasa Gitna) */}
                                    <div className="relative mx-auto w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-800 border-4 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden group">
                                        {photoFile ? (
                                            <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover" alt="Profile" />
                                        ) : profileForm.photo_url ? (
                                            <img src={profileForm.photo_url} className="w-full h-full object-cover" alt="Profile" />
                                        ) : (
                                            <span className="text-3xl sm:text-5xl font-black text-white/80">
                                                {profileForm.name?.charAt(0)?.toUpperCase() || 'E'}
                                            </span>
                                        )}

                                        {isEditingProfile ? (
                                            <>
                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 cursor-pointer transition-opacity">
                                                    <Camera className="w-6 h-6 text-white" />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">Change</span>
                                                </div>
                                                <input
                                                    title="Upload Profile Photo"
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                                />
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingProfile(true)}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                title="Edit Profile"
                                            >
                                                <Camera className="w-5 h-5 text-white/90" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Name & Badges (Nasa Baba ng Profile Picture) */}
                                    <div className="mt-4 space-y-2">
                                        <span className="inline-block px-3 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                                            WebNegosyo Team
                                        </span>
                                        <h3 className="text-xl sm:text-3xl font-black tracking-tight truncate text-white">
                                            {profileForm.name || 'Your Name'}
                                        </h3>

                                        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-xs font-bold">
                                                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>{profileForm.role || 'Employee'}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-xs font-bold text-slate-300">
                                                <User className="w-3.5 h-3.5 text-blue-400" />
                                                <span>@{profileForm.email || 'username'}</span>
                                            </span>
                                        </div>

                                        {!isEditingProfile && (
                                            <div className="pt-2">
                                                <button
                                                    onClick={() => setIsEditingProfile(true)}
                                                    className="inline-flex items-center gap-2 px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-full font-bold text-xs transition-all shadow-md active:scale-95"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    <span>Edit Profile</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Details Section (Nasa Baba ng Hero Card) */}
                                <div className="space-y-4">
                                    {/* Card 1: Personal Information */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
                                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                            <User className="w-4 h-4 text-slate-700" />
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Personal Information</h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Full Name</span>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        title="Full Name"
                                                        placeholder="Your full name"
                                                        disabled={!isEditingProfile}
                                                        className={cn(
                                                            "w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none font-semibold text-xs sm:text-sm transition-all",
                                                            isEditingProfile
                                                                ? "bg-slate-50 border-slate-300 focus:bg-white focus:border-slate-900 text-slate-900"
                                                                : "bg-slate-50 border-transparent text-slate-700 cursor-default"
                                                        )}
                                                        value={profileForm.name}
                                                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Role / Position</span>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        title="Role"
                                                        placeholder="Your role"
                                                        disabled={!isEditingProfile}
                                                        className={cn(
                                                            "w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none font-semibold text-xs sm:text-sm transition-all",
                                                            isEditingProfile
                                                                ? "bg-slate-50 border-slate-300 focus:bg-white focus:border-slate-900 text-slate-900"
                                                                : "bg-slate-50 border-transparent text-slate-700 cursor-default"
                                                        )}
                                                        value={profileForm.role}
                                                        onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Cell Number</span>
                                                <div className="relative">
                                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        title="Cell Number"
                                                        placeholder="09xx-xxx-xxxx"
                                                        disabled={!isEditingProfile}
                                                        className={cn(
                                                            "w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none font-semibold text-xs sm:text-sm transition-all",
                                                            isEditingProfile
                                                                ? "bg-slate-50 border-slate-300 focus:bg-white focus:border-slate-900 text-slate-900"
                                                                : "bg-slate-50 border-transparent text-slate-700 cursor-default"
                                                        )}
                                                        value={profileForm.phone}
                                                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Professional Email</span>
                                                <div className="relative">
                                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        title="Professional Email"
                                                        placeholder="email@example.com"
                                                        type="email"
                                                        disabled={!isEditingProfile}
                                                        className={cn(
                                                            "w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none font-semibold text-xs sm:text-sm transition-all",
                                                            isEditingProfile
                                                                ? "bg-slate-50 border-slate-300 focus:bg-white focus:border-slate-900 text-slate-900"
                                                                : "bg-slate-50 border-transparent text-slate-700 cursor-default"
                                                        )}
                                                        value={profileForm.contact_email}
                                                        onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2: Account & Payout Information */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
                                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                            <Wallet className="w-4 h-4 text-slate-700" />
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account & Payout Information</h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Username (Login ID)</span>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        title="Username"
                                                        disabled
                                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-semibold text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                                                        value={profileForm.email}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 block px-1">Used for signing in to WebNegosyo.</span>
                                            </div>

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">GCash Payout Number</span>
                                                <div className="relative">
                                                    <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        title="GCash Number"
                                                        placeholder="09xx-xxx-xxxx"
                                                        disabled={!isEditingProfile}
                                                        className={cn(
                                                            "w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none font-semibold text-xs sm:text-sm transition-all",
                                                            isEditingProfile
                                                                ? "bg-slate-50 border-slate-300 focus:bg-white focus:border-slate-900 text-slate-900"
                                                                : "bg-slate-50 border-transparent text-slate-700 cursor-default"
                                                        )}
                                                        value={profileForm.gcash_number}
                                                        onChange={(e) => setProfileForm({ ...profileForm, gcash_number: e.target.value })}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 block px-1">Where your 2-week commission payouts will be sent.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 3: GCash QR Code */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs text-center">
                                        <div className="flex items-center justify-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                            <QrCode className="w-4 h-4 text-slate-700" />
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">GCash QR Code</h4>
                                        </div>

                                        <div className="relative mx-auto w-48 h-48 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group hover:border-slate-800 transition-all p-3">
                                            {qrFile ? (
                                                <img src={URL.createObjectURL(qrFile)} className="w-full h-full object-contain" alt="QR Preview" />
                                            ) : profileForm.qr_code_url ? (
                                                <img src={profileForm.qr_code_url} className="w-full h-full object-contain" alt="GCash QR" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No QR Uploaded</span>
                                                    <span className="text-[10px] text-slate-400">Click below to upload</span>
                                                </div>
                                            )}

                                            {isEditingProfile && (
                                                <>
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white transition-opacity pointer-events-none">
                                                        <QrCode className="w-6 h-6" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload New QR</span>
                                                    </div>
                                                    <input
                                                        title="Upload QR Code"
                                                        type="file"
                                                        accept="image/*"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        <p className="text-[11px] font-semibold text-slate-400 mt-3 max-w-sm mx-auto">
                                            {isEditingProfile ? 'Tap the QR box to upload your GCash QR code image.' : 'Used for fast and accurate commission payout releases.'}
                                        </p>
                                    </div>

                                    {/* Card 4: Biometric Fingerprint Login */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
                                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <Fingerprint className="w-4 h-4 text-emerald-600" />
                                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fingerprint / Biometric Login</h4>
                                            </div>
                                            {bioRecord ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    <span>Active on this Device</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                                    <span>Not Registered</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="space-y-1 max-w-lg">
                                                <p className="text-xs font-bold text-slate-800">
                                                    Sign in quickly using Touch ID, Fingerprint, or Windows Hello
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    Registering your fingerprint allows one-tap biometric login from the employee sign-in page without typing your password each time.
                                                </p>
                                                {bioRecord && (
                                                    <p className="text-[10px] text-emerald-600 font-semibold pt-1">
                                                        Registered on: {new Date(bioRecord.registeredAt).toLocaleDateString()} at {new Date(bioRecord.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                                {bioRecord ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBioError(null);
                                                                setBioSuccess(null);
                                                                setShowBioModal(true);
                                                            }}
                                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all active:scale-95"
                                                        >
                                                            <Fingerprint className="w-3.5 h-3.5" />
                                                            <span>Re-register</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveFingerprint}
                                                            className="inline-flex items-center justify-center p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                            title="Remove Fingerprint"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBioError(null);
                                                            setBioSuccess(null);
                                                            setShowBioModal(true);
                                                        }}
                                                        disabled={bioAvailable === false}
                                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Fingerprint className="w-4 h-4" />
                                                        <span>Register Fingerprint</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {bioAvailable === false && (
                                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                                <span>Biometric sensor is not detected on this browser or device. Ensure Touch ID / Windows Hello is enabled in your OS settings.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Save & Cancel Buttons (When isEditingProfile) */}
                                {isEditingProfile && (
                                    <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingProfile(false)}
                                            className="w-full sm:w-auto px-8 py-3 border border-slate-300 bg-white rounded-2xl font-bold text-xs hover:bg-slate-100 transition-all text-slate-700 shadow-2xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleProfileSave}
                                            disabled={profileSaving}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50"
                                        >
                                            {profileSaving ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : profileSuccess ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            <span>{profileSaving ? 'Saving...' : profileSuccess ? 'Saved!' : 'Save Changes'}</span>
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
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                            onClick={() => setShowTerms(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">WebNegosyo</p>
                                    <h2 className="text-base sm:text-lg font-black tracking-tighter text-ink uppercase">Terms & Policies</h2>
                                </div>
                                <button
                                    onClick={() => setShowTerms(false)}
                                    title="Close"
                                    className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-black transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 sm:space-y-6">
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    <div className="bg-ink text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0">
                                        <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Commission</p>
                                        <p className="text-xl sm:text-2xl font-black tracking-tighter tabular-nums mt-1.5">{workerRate}%</p>
                                    </div>
                                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0">
                                        <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Payout</p>
                                        <p className="text-xs sm:text-lg font-black tracking-tighter text-ink mt-1.5 leading-tight">Every 2 weeks</p>
                                    </div>
                                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0">
                                        <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Earned when</p>
                                        <p className="text-xs sm:text-lg font-black tracking-tighter text-green-600 mt-1.5 leading-tight">Fully Paid</p>
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
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-ink rounded-lg flex items-center justify-center">
                                                <card.icon className="w-4 h-4 text-white" />
                                            </div>
                                            <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-widest text-ink">{card.title}</h3>
                                        </div>
                                        <ul className="space-y-2.5 pl-1">
                                            {card.items.map(([label, text]) => (
                                                <li key={label} className="flex gap-2.5 sm:gap-3 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5 shrink-0" />
                                                    <p className="text-[11px] sm:text-xs font-medium break-words min-w-0 text-zinc-600 leading-relaxed">
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
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setPreviewImage(null)}
                    >
                        <button
                            type="button"
                            title="Close"
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Proof of payment"
                            className="w-auto max-w-[65vw] sm:max-w-xs max-h-[40vh] sm:max-h-[50vh] object-contain rounded-xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

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
                            <div className="p-4 lg:p-10 border-b border-zinc-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base lg:text-2xl font-black tracking-tighter uppercase italic text-black">New Client Record</h2>
                                    <p className="text-[9px] lg:text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Complete all details for the client deal</p>
                                </div>
                                <button title="Close" onClick={() => setShowAddModal(false)} className="p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                                    <X className="w-5 h-5 text-zinc-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddClient} className="p-4 lg:p-10 space-y-3 lg:space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Month</span>
                                        <select
                                            title="Month"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all appearance-none"
                                            value={addForm.month}
                                            onChange={(e) => setAddForm({ ...addForm, month: e.target.value })}
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Date Selection</span>
                                        <input
                                            type="date"
                                            required
                                            title="Date"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
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

                                <div className="space-y-1 lg:space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Client Name</span>
                                    <input
                                        required
                                        title="Client Name"
                                        placeholder="Full Name of the client"
                                        className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                        value={addForm.client_name}
                                        onChange={(e) => setAddForm({ ...addForm, client_name: e.target.value })}
                                    />
                                </div>

                                {/* Package Selection: 3499 or 5499 with balance/commission details */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                                            Select Package (₱)
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {addForm.deal_value === 5499 ? '₱5,499 Package Selected' : addForm.deal_value === 3499 ? '₱3,499 Package Selected' : 'Custom Package'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setAddForm(prev => ({ ...prev, deal_value: 3499 }))}
                                            className={cn(
                                                "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden",
                                                addForm.deal_value === 3499
                                                    ? "border-black bg-zinc-900 text-white shadow-md ring-2 ring-black/10"
                                                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black uppercase tracking-wider">3,499 Package</span>
                                                {addForm.deal_value === 3499 && (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                )}
                                            </div>
                                            <p className={cn("text-xl font-black tracking-tight tabular-nums mt-1", addForm.deal_value === 3499 ? "text-white" : "text-black")}>
                                                ₱3,499
                                            </p>
                                            <div className="mt-2 pt-2 border-t border-zinc-200/40 text-[10px] space-y-0.5">
                                                <p className={addForm.deal_value === 3499 ? "text-zinc-300" : "text-zinc-600"}>
                                                    Commission: <strong className="text-emerald-400 font-bold">₱250</strong> (Fully Paid)
                                                </p>
                                                <p className={addForm.deal_value === 3499 ? "text-zinc-300" : "text-zinc-600"}>
                                                    Balance: <strong className="font-bold">₱3,249</strong> (3,499 - 250)
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAddForm(prev => ({ ...prev, deal_value: 5499 }))}
                                            className={cn(
                                                "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden",
                                                addForm.deal_value === 5499
                                                    ? "border-black bg-zinc-900 text-white shadow-md ring-2 ring-black/10"
                                                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black uppercase tracking-wider">5,499 Package</span>
                                                {addForm.deal_value === 5499 && (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                )}
                                            </div>
                                            <p className={cn("text-xl font-black tracking-tight tabular-nums mt-1", addForm.deal_value === 5499 ? "text-white" : "text-black")}>
                                                ₱5,499
                                            </p>
                                            <div className="mt-2 pt-2 border-t border-zinc-200/40 text-[10px] space-y-0.5">
                                                <p className={addForm.deal_value === 5499 ? "text-zinc-300" : "text-zinc-600"}>
                                                    Commission: <strong className="text-emerald-400 font-bold">₱300</strong> (Fully Paid)
                                                </p>
                                                <p className={addForm.deal_value === 5499 ? "text-zinc-300" : "text-zinc-600"}>
                                                    Balance: <strong className="font-bold">₱5,199</strong> (5,499 - 300)
                                                </p>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Or custom package */}
                                    <div className="pt-1 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 px-1">Other:</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₱</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                title="Custom Package Value"
                                                placeholder="Custom package amount..."
                                                className="w-full pl-7 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:bg-white focus:border-black outline-none transition-all tabular-nums"
                                                value={addForm.deal_value || ''}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value.replace(/[^0-9]/g, ""));
                                                    setAddForm(prev => ({ ...prev, deal_value: val }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Down Payment (₱)</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            title="Down Payment"
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.down_payment || ''}
                                            onChange={(e) => {
                                                const down_payment = Number(e.target.value.replace(/[^0-9]/g, ""));
                                                setAddForm({ ...addForm, down_payment });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1 lg:space-y-2">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Tip (₱)</span>
                                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Bukod / Tip Yun</span>
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            title="Tip"
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.tip || ''}
                                            onChange={(e) => setAddForm({ ...addForm, tip: Number(e.target.value.replace(/[^0-9]/g, "")) })}
                                        />
                                        <span className="text-[9px] text-zinc-400 font-medium px-2 block">Tip lang ito at hindi isasama sa total balance.</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2 text-rose-600">
                                            {addForm.payment_status === 'Fully Paid'
                                                ? 'Balance / Natira sa Total (₱)'
                                                : 'Down Payment Recorded (₱)'}
                                        </span>
                                        <div className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-rose-50 border border-rose-100 rounded-2xl font-black text-xs lg:text-sm text-rose-600 tabular-nums">
                                            ₱{Number(
                                                addForm.payment_status === 'Fully Paid'
                                                    ? (addForm.deal_value >= 5499
                                                        ? addForm.deal_value - 300
                                                        : addForm.deal_value >= 3499
                                                            ? addForm.deal_value - 250
                                                            : addForm.deal_value - (addForm.deal_value * workerRate / 100))
                                                    : addForm.down_payment
                                            ).toLocaleString()}
                                        </div>
                                        <span className="text-[9px] text-zinc-400 font-medium px-2 block">
                                            {addForm.payment_status === 'Fully Paid'
                                                ? (addForm.deal_value >= 5499 ? '5,499 - ₱300 commission = ₱5,199' : addForm.deal_value >= 3499 ? '3,499 - ₱250 commission = ₱3,249' : 'Natira matapos ibawas ang commission')
                                                : 'Downpayment lamang'}
                                        </span>
                                    </div>
                                    {addForm.payment_status === 'Fully Paid' && (
                                        <div className="space-y-1 lg:space-y-2">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2 text-emerald-600">
                                                Commission (₱)
                                            </span>
                                            <div className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-xs lg:text-sm text-emerald-700 tabular-nums">
                                                ₱{(addForm.deal_value >= 5499 ? 300 : addForm.deal_value >= 3499 ? 250 : addForm.deal_value * workerRate / 100).toLocaleString()}
                                            </div>
                                            <span className="text-[9px] text-zinc-400 font-medium px-2 block">
                                                {addForm.deal_value >= 5499 ? 'Automatic ₱300 commission' : addForm.deal_value >= 3499 ? 'Automatic ₱250 commission' : `${workerRate}% rate`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 lg:space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Payment Status</span>
                                    <select
                                        title="Payment Status"
                                        className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs uppercase tracking-widest transition-all appearance-none"
                                        value={addForm.payment_status}
                                        onChange={(e) => setAddForm({ ...addForm, payment_status: e.target.value, commission_rate: workerRate })}
                                    >
                                        <option value="Fully Paid">Fully Paid</option>
                                        <option value="Cancelled Project">Cancelled Project</option>
                                        <option value="Downpayment Only">Downpayment Only</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Down Payment Date</span>
                                        <input
                                            type="date"
                                            title="Down Payment Date"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.down_payment_date}
                                            onChange={(e) => setAddForm({ ...addForm, down_payment_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Full Payment (₱)</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            title="Full Payment"
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.full_payment || ''}
                                            onChange={(e) => setAddForm({ ...addForm, full_payment: Number(e.target.value.replace(/[^0-9]/g, "")) })}
                                        />
                                    </div>
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Full Payment Date</span>
                                        <input
                                            type="date"
                                            title="Full Payment Date"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.full_payment_date}
                                            onChange={(e) => setAddForm({ ...addForm, full_payment_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Paid Balance (₱)</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            title="Paid Balance"
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.paid_balance || ''}
                                            onChange={(e) => setAddForm({ ...addForm, paid_balance: Number(e.target.value.replace(/[^0-9]/g, "")) })}
                                        />
                                    </div>
                                    <div className="space-y-1 lg:space-y-2">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Paid Balance Date</span>
                                        <input
                                            type="date"
                                            title="Paid Balance Date"
                                            className="w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-xs lg:text-sm transition-all"
                                            value={addForm.paid_balance_date}
                                            onChange={(e) => setAddForm({ ...addForm, paid_balance_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 lg:space-y-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Proof of Payment (Image)</span>
                                    <label className="flex items-center gap-4 w-full px-4 py-2.5 lg:px-6 lg:py-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl cursor-pointer hover:border-black transition-all">
                                        <span className="text-xs font-bold text-zinc-500 truncate">{addProofFile ? addProofFile.name : 'Choose image to upload'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            title="Upload proof of payment"
                                            className="hidden"
                                            onChange={(e) => setAddProofFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-2 lg:gap-4 lg:pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-2.5 lg:py-4 border border-zinc-100 rounded-2xl font-bold text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-[2] py-2.5 lg:py-4 bg-black text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
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

            {/* Fingerprint / Biometric Registration Modal */}
            <AnimatePresence>
                {showBioModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => {
                                if (!bioLoading) setShowBioModal(false);
                            }}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-10"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                        <Fingerprint className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Register Fingerprint</h3>
                                        <p className="text-[10px] text-slate-400 font-semibold">WebNegosyo Biometric Auth</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={bioLoading}
                                    onClick={() => setShowBioModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleRegisterFingerprint} className="space-y-4">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Enter your account password to verify your identity and link this device's Touch ID / Fingerprint sensor to <strong className="text-slate-900">@{profileForm.email || 'your account'}</strong>.
                                </p>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Account Password</span>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="password"
                                            required
                                            autoFocus
                                            disabled={bioLoading}
                                            placeholder="Enter your account password"
                                            value={bioPassword}
                                            onChange={(e) => setBioPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-xs text-slate-900 focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>
                                </div>

                                {bioError && (
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{bioError}</span>
                                    </div>
                                )}

                                {bioSuccess && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                        <span>{bioSuccess}</span>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        disabled={bioLoading}
                                        onClick={() => setShowBioModal(false)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={bioLoading || !bioPassword}
                                        className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider"
                                    >
                                        {bioLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Fingerprint className="w-4 h-4" />
                                        )}
                                        <span>{bioLoading ? 'Scanning...' : 'Scan Fingerprint'}</span>
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
