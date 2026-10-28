import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Eye,
    EyeOff,
    Trash2,
    Search,
    ArrowLeft,
    X,
    FileSpreadsheet,
    LayoutGrid,
    AlertCircle,
    ChevronDown,
    RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { downloadCsv } from '../lib/csv';
import { dealCommission, dealBalance } from '../lib/dealMath';
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
    worker?: { name: string; commission_percentage: number };
    webdev?: { name: string };
    is_hidden: boolean;
    commission_rate?: number;
    created_at: string;
    month?: string | null;
    down_payment_date?: string | null;
    full_payment?: number | null;
    full_payment_date?: string | null;
    paid_balance?: number | null;
    paid_balance_date?: string | null;
    proof_image_url?: string | null;
    paid_stamped_at?: string | null;
}

interface Worker {
    id: string;
    name: string;
    commission_percentage: number;
    assigned_webdev_id?: string;
}

export const LeadsTracker: React.FC = () => {
    const { profile, isOwner } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [closingLead, setClosingLead] = useState<Lead | null>(null);
    const [showHidden, setShowHidden] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Fully Paid' | 'Downpayment Only' | 'Cancelled Project'>('all');
    const [mobileView, setMobileView] = useState<'cards' | 'sheet'>('cards');
    const [checkedLeads, setCheckedLeads] = useState<Set<string>>(new Set());
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const tableScrollRef = useRef<HTMLDivElement>(null);
    const mobileSheetRef = useRef<HTMLDivElement>(null);

    const slideTable = (dir: 1 | -1) => {
        const el = tableScrollRef.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
    };

    const toggleCheck = (id: string) => {
        setCheckedLeads(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Form States for Closing Lead
    const [formData, setFormData] = useState({
        client_name: '',
        contact_info: '',
        ad_source: '',
        worker_id: '',
        webdev_id: '',
        deal_value: 0,
        down_payment: 0,
        tip: 0,
        payment_status: 'Downpayment Only' as string
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('schema-db-changes-leads')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leads'
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOwner, profile?.id]);

    // Auto-assign webdev based on worker
    useEffect(() => {
        if (closingLead) {
            const worker = workers.find(w => w.id === closingLead.worker_id);
            if (worker?.assigned_webdev_id) {
                setFormData(prev => ({ ...prev, webdev_id: worker.assigned_webdev_id || '' }));
            }
        }
    }, [closingLead, workers]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const leadsQuery = supabase
                .from('leads')
                .select('*, worker:workers!worker_id(name, commission_percentage), webdev:workers!webdev_id(name)')
                .order('created_at', { ascending: false });

            if (!isOwner && profile?.id) {
                leadsQuery.eq('worker_id', profile.id);
            }

            const [leadsRes, workersRes] = await Promise.all([
                leadsQuery,
                supabase.from('workers').select('id, name, commission_percentage, assigned_webdev_id').eq('active', true)
            ]);

            if (leadsRes.error) throw leadsRes.error;
            if (workersRes.error) throw workersRes.error;

            setLeads(leadsRes.data || []);
            setWorkers(workersRes.data || []);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setFetchError(err.message || 'Failed to connect to database. Please check connection and click Refresh.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDeal = async (dealValue: number) => {
        if (!closingLead) return;
        setIsSubmitting(true);
        try {
            const { error: leadError } = await supabase
                .from('leads')
                .update({
                    status: 'closed',
                    deal_value: dealValue,
                    down_payment: formData.down_payment,
                    tip: formData.tip,
                    payment_status: formData.payment_status,
                    webdev_id: formData.webdev_id || null,
                    closed_at: new Date().toISOString()
                })
                .eq('id', closingLead.id);

            if (leadError) throw leadError;

            const commissionAmount = dealCommission(
                { payment_status: formData.payment_status, deal_value: dealValue, down_payment: formData.down_payment, commission_rate: closingLead.commission_rate },
                closingLead.worker?.commission_percentage ?? 0
            );

            const { error: commError } = await supabase
                .from('commissions')
                .insert([{
                    lead_id: closingLead.id,
                    worker_id: closingLead.worker_id,
                    amount: commissionAmount,
                    status: 'pending'
                }]);

            if (commError) throw commError;

            setClosingLead(null);
            fetchData();
        } catch (err) {
            console.error('Error closing deal:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'closed': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
            case 'failed': return <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
            default: return <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this record?')) return;
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error deleting lead:', err);
        }
    };

    const toggleHideLead = async (lead: Lead) => {
        const nextHidden = !lead.is_hidden;
        setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, is_hidden: nextHidden } : l)));
        try {
            const { error } = await supabase
                .from('leads')
                .update({ is_hidden: !lead.is_hidden })
                .eq('id', lead.id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error toggling hide status:', err);
            setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, is_hidden: lead.is_hidden } : l)));
        }
    };

    const stampableChecked = leads.filter(l => checkedLeads.has(l.id) && !l.paid_stamped_at);

    const stampCheckedPaid = async () => {
        if (stampableChecked.length === 0) return;
        const names = stampableChecked.map(l => l.client_name).join(', ');
        if (!confirm(`Stamp ${stampableChecked.length} record(s) as PAID?\n\n${names}\n\nThis is permanent and cannot be removed.`)) return;
        try {
            const { error } = await supabase
                .from('leads')
                .update({ paid_stamped_at: new Date().toISOString() })
                .in('id', stampableChecked.map(l => l.id))
                .is('paid_stamped_at', null);
            if (error) throw error;
            setCheckedLeads(new Set());
            fetchData();
        } catch (err) {
            console.error('Error stamping lead as paid:', err);
            alert('Could not stamp as paid. Make sure add_paid_stamp.sql was run in Supabase.');
        }
    };

    const fmtDate = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString() : '—');

    const getCommission = (lead: Lead) => dealCommission(lead, lead.worker?.commission_percentage ?? 0);
    const getBalance = (lead: Lead) => dealBalance(lead, lead.worker?.commission_percentage ?? 0);

    const filteredLeads = leads.filter(l => {
        const query = searchQuery.trim().toLowerCase();
        const clientName = (l.client_name || '').toLowerCase();
        const workerName = (l.worker?.name || '').toLowerCase();
        const webdevName = (l.webdev?.name || '').toLowerCase();
        const contact = (l.contact_info || '').toLowerCase();

        const matchesSearch = query === '' ||
            clientName.includes(query) ||
            workerName.includes(query) ||
            webdevName.includes(query) ||
            contact.includes(query);

        const matchesHidden = showHidden ? true : !l.is_hidden;

        const effectivePaymentStatus = l.payment_status || 'Downpayment Only';
        const matchesStatus =
            statusFilter === 'all'
                ? true
                : effectivePaymentStatus === statusFilter;

        return matchesSearch && matchesHidden && matchesStatus;
    });

    // Excel-style export
    const exportToCSV = () => {
        const headers = [
            'Month', 'Date', 'Employee', 'Client Name', 'Webdev', 'Total Package',
            'Downpayment', 'Downpayment Date', 'Full Payment', 'Full Payment Date',
            'Paid Balance', 'Paid Balance Date', 'Tip', 'Total Balance', 'Status', 'Commission', 'Paid Stamp'
        ];
        const rows = filteredLeads.map(l => {
            const date = new Date(l.created_at);
            const commission = getCommission(l);
            const totalBalance = getBalance(l);

            return [
                date.toLocaleString('default', { month: 'long' }),
                date.toLocaleDateString(),
                l.worker?.name || 'Unknown',
                l.client_name,
                l.webdev?.name || 'Unassigned',
                l.deal_value,
                l.down_payment,
                l.down_payment_date || '',
                l.full_payment || 0,
                l.full_payment_date || '',
                l.paid_balance || 0,
                l.paid_balance_date || '',
                l.tip || 0,
                Number(totalBalance).toFixed(2),
                l.status === 'failed' ? 'Cancelled' : (l.payment_status || 'Downpayment Only'),
                Number(commission).toFixed(2),
                l.paid_stamped_at ? new Date(l.paid_stamped_at).toLocaleDateString() : ''
            ];
        });

        downloadCsv(`Master_List_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
    };

    // Aggregate KPI Stats
    const totalCount = filteredLeads.length;
    const fullyPaidCount = filteredLeads.filter(l => l.payment_status === 'Fully Paid').length;
    const dpCount = filteredLeads.filter(l => (l.payment_status || 'Downpayment Only') === 'Downpayment Only').length;
    const totalPackage = filteredLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
    const totalBalance = filteredLeads.reduce((sum, l) => sum + (Number(getBalance(l)) || 0), 0);
    const totalCommission = filteredLeads.reduce((sum, l) => sum + (Number(getCommission(l)) || 0), 0);
    const totalTip = filteredLeads.reduce((sum, l) => sum + (Number(l.tip) || 0), 0);
    const totalDP = filteredLeads.reduce((sum, l) => sum + (Number(l.down_payment) || 0), 0);
    const totalFullPayment = filteredLeads.reduce((sum, l) => sum + (Number(l.full_payment) || 0), 0);
    const totalPaidBalance = filteredLeads.reduce((sum, l) => sum + (Number(l.paid_balance) || 0), 0);

    // Modal Close Deal
    if (closingLead) {
        return (
            <div className="max-w-lg mx-auto space-y-4 animate-in fade-in duration-300 px-4 py-6">
                <button
                    type="button"
                    onClick={() => setClosingLead(null)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-black hover:bg-white active:scale-95 transition-all shadow-xs"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Master List
                </button>
                <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-6 sm:p-8 text-center">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">Close Deal</h2>
                    <p className="text-slate-500 text-xs font-semibold mb-6">
                        Enter final deal values for <span className="font-bold text-slate-900">{closingLead.client_name}</span>
                    </p>

                    <div className="space-y-4 mb-6 text-left">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Package Value (₱)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                                <input
                                    type="number"
                                    autoFocus
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-base font-bold text-slate-900 focus:border-slate-800 focus:bg-white transition-all tabular-nums"
                                    placeholder="0.00"
                                    value={formData.deal_value || ''}
                                    onChange={(e) => setFormData({ ...formData, deal_value: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Down Payment (₱)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                                <input
                                    type="number"
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-base font-bold text-slate-900 focus:border-slate-800 focus:bg-white transition-all tabular-nums"
                                    placeholder="0.00"
                                    value={formData.down_payment || ''}
                                    onChange={(e) => setFormData({ ...formData, down_payment: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Tip (₱)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                                <input
                                    type="number"
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-base font-bold text-slate-900 focus:border-slate-800 focus:bg-white transition-all tabular-nums"
                                    placeholder="0.00"
                                    value={formData.tip || ''}
                                    onChange={(e) => setFormData({ ...formData, tip: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Payment Status</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-900 focus:border-slate-800 focus:bg-white transition-all"
                                value={formData.payment_status}
                                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                            >
                                <option value="Downpayment Only">Downpayment Only</option>
                                <option value="Fully Paid">Fully Paid</option>
                                <option value="Cancelled Project">Cancelled Project</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Webdev Assigned</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-900 focus:border-slate-800 focus:bg-white transition-all"
                                value={formData.webdev_id}
                                onChange={(e) => setFormData({ ...formData, webdev_id: e.target.value })}
                            >
                                <option value="">Select Webdev</option>
                                {workers.map(worker => (
                                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => handleCloseDeal(formData.deal_value)}
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-md disabled:opacity-50 active:scale-98"
                        >
                            Confirm Deal
                        </button>
                        <button
                            onClick={() => setClosingLead(null)}
                            className="w-full py-2.5 font-bold text-xs uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300 pb-12">
            {/* Network / Fetch Error Banner */}
            {fetchError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 text-rose-800 text-xs">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">{fetchError}</span>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 active:scale-95"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry
                    </button>
                </div>
            )}

            {/* Top Excel Dashboard Banner / KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Deals</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg lg:text-xl font-black text-slate-900 tabular-nums">{totalCount}</span>
                        <span className="text-[10px] font-bold text-slate-400">Records</span>
                    </div>
                </div>

                <div className="bg-white border border-emerald-200/70 rounded-xl p-3 shadow-xs bg-emerald-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">Fully Paid</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg lg:text-xl font-black text-emerald-700 tabular-nums">{fullyPaidCount}</span>
                        <span className="text-[10px] font-bold text-emerald-600">
                            {totalCount > 0 ? `${Math.round((fullyPaidCount / totalCount) * 100)}%` : '0%'}
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-blue-200/70 rounded-xl p-3 shadow-xs bg-blue-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-1">Downpayment</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg lg:text-xl font-black text-blue-700 tabular-nums">{dpCount}</span>
                        <span className="text-[10px] font-bold text-blue-500">Deals</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Sales</span>
                    <div className="text-lg lg:text-xl font-black text-slate-900 tabular-nums truncate">
                        ₱{totalPackage.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-rose-200/70 rounded-xl p-3 shadow-xs bg-rose-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-1">Total Balance</span>
                    <div className="text-lg lg:text-xl font-black text-rose-600 tabular-nums truncate">
                        ₱{totalBalance.toLocaleString()}
                    </div>
                </div>

                <div className="bg-white border border-emerald-200/70 rounded-xl p-3 shadow-xs bg-emerald-50/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">Total Commission</span>
                    <div className="text-lg lg:text-xl font-black text-emerald-600 tabular-nums truncate">
                        ₱{totalCommission.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Excel Toolbar & Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search client, employee, webdev, contact..."
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

                    {/* Toolbar Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Refresh Button */}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            title="Refresh data from server"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-slate-800")} />
                            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                        </button>

                        {/* Hidden Toggle */}
                        <button
                            onClick={() => setShowHidden(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                                showHidden
                                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                            )}
                        >
                            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{showHidden ? 'Showing Hidden' : `Hidden (${leads.filter(l => l.is_hidden).length})`}</span>
                        </button>

                        {/* Stamp Paid Button (Owner only) */}
                        {isOwner && (
                            <button
                                onClick={stampCheckedPaid}
                                disabled={stampableChecked.length === 0}
                                title="Check the Done box of records first, then click to stamp them PAID"
                                className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Stamp Paid {stampableChecked.length > 0 && `(${stampableChecked.length})`}</span>
                            </button>
                        )}

                        {/* CSV Export Button */}
                        <button
                            onClick={exportToCSV}
                            title="Export spreadsheet to CSV file"
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export Excel</span>
                        </button>

                        {/* Mobile View Switcher (Visible only on mobile screens) */}
                        <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setMobileView('cards')}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                                    mobileView === 'cards' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Cards</span>
                            </button>
                            <button
                                onClick={() => setMobileView('sheet')}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                                    mobileView === 'sheet' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Sheet</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs / Quick Excel Filter Pills */}
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
                            All ({leads.filter(l => showHidden ? true : !l.is_hidden).length})
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
                            Fully Paid ({leads.filter(l => (showHidden ? true : !l.is_hidden) && l.payment_status === 'Fully Paid').length})
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
                            Downpayment ({leads.filter(l => (showHidden ? true : !l.is_hidden) && (l.payment_status || 'Downpayment Only') === 'Downpayment Only').length})
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
                            Cancelled ({leads.filter(l => (showHidden ? true : !l.is_hidden) && l.payment_status === 'Cancelled Project').length})
                        </button>
                    </div>

                    {/* Desktop Slide Table Controls */}
                    <div className="hidden md:flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Pan Table:</span>
                        <button
                            type="button"
                            onClick={() => slideTable(-1)}
                            title="Slide left"
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => slideTable(1)}
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
                {mobileView === 'cards' ? (
                    /* MOBILE CARD VIEW: Clean, high-contrast, touch-optimized */
                    <div className="space-y-3">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                            ))
                        ) : filteredLeads.length === 0 ? (
                            <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl p-6">
                                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-700 font-bold text-sm">
                                    {searchQuery ? "No matching clients found" : "No records found in Master List"}
                                </p>
                                <p className="text-slate-400 text-xs mt-1 mb-3">Try adjusting search or status filters, or click Reload Data.</p>
                                <button
                                    onClick={fetchData}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Reload Data
                                </button>
                            </div>
                        ) : (
                            filteredLeads.map((lead) => {
                                const isExpanded = expandedId === lead.id;
                                const isFullyPaid = lead.payment_status === 'Fully Paid';
                                const isDP = (lead.payment_status || 'Downpayment Only') === 'Downpayment Only';
                                const isCancelled = lead.payment_status === 'Cancelled Project';
                                const isChecked = checkedLeads.has(lead.id);

                                return (
                                    <div
                                        key={lead.id}
                                        className={cn(
                                            "bg-white border rounded-2xl shadow-xs overflow-hidden transition-all",
                                            isFullyPaid ? "border-emerald-200 border-l-4 border-l-emerald-500" :
                                                isDP ? "border-blue-200 border-l-4 border-l-blue-500" :
                                                    isCancelled ? "border-rose-200 border-l-4 border-l-rose-500" :
                                                        "border-slate-200 border-l-4 border-l-slate-400",
                                            lead.is_hidden && "opacity-50 grayscale"
                                        )}
                                    >
                                        {/* Card Header */}
                                        <div className="p-3.5 pb-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCheck(lead.id)}
                                                        className={cn(
                                                            "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                                            isChecked
                                                                ? "bg-emerald-600 border-emerald-600 text-white"
                                                                : "border-slate-300 hover:border-slate-500 bg-white"
                                                        )}
                                                        title="Select for stamp"
                                                    >
                                                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    </button>
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
                                                            <span>Agent: <strong className="text-slate-700 font-semibold">{lead.worker?.name || 'Unknown'}</strong></span>
                                                            <span>·</span>
                                                            <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                                        </div>
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
                                                        {getStatusIcon(lead.status)}
                                                        {lead.status === 'failed' ? 'Cancelled' : (lead.payment_status || 'Downpayment Only')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stamp Image if applied */}
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
                                                        ₱{Number(getBalance(lead)).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="border-t border-slate-200/60 pt-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Commission</span>
                                                    <span className="font-black text-emerald-600 tabular-nums text-sm">
                                                        ₱{Number(getCommission(lead)).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expandable Details Drawer */}
                                        {isExpanded && (
                                            <div className="px-3.5 py-2.5 bg-slate-50/50 border-t border-slate-100 text-xs space-y-2">
                                                {lead.contact_info && (
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Info</span>
                                                        <span className="text-slate-800 font-medium break-all">{lead.contact_info}</span>
                                                    </div>
                                                )}
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
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">Proof Image:</span>
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
                                                onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                                                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1"
                                            >
                                                <span>{isExpanded ? 'Less details' : 'More details'}</span>
                                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                {lead.status === 'pending' && (
                                                    <button
                                                        onClick={() => setClosingLead(lead)}
                                                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs active:scale-95"
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleHideLead(lead)}
                                                    title={lead.is_hidden ? "Unhide" : "Hide Record"}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95"
                                                >
                                                    {lead.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>
                                                {!lead.paid_stamped_at && (
                                                    <button
                                                        onClick={() => handleDeleteLead(lead.id)}
                                                        title="Delete Record"
                                                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
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
                        <div ref={mobileSheetRef} className="overflow-x-auto pb-2">
                            <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                        <th className="px-2 py-2 border-r border-slate-200 sticky left-0 bg-slate-100 z-10 w-28">Client</th>
                                        <th className="px-2 py-2 border-r border-slate-200">Status</th>
                                        <th className="px-2 py-2 border-r border-slate-200 text-right">Package</th>
                                        <th className="px-2 py-2 border-r border-slate-200 text-right">Downpayment</th>
                                        <th className="px-2 py-2 border-r border-slate-200 text-right">Balance</th>
                                        <th className="px-2 py-2 border-r border-slate-200 text-right">Commission</th>
                                        <th className="px-2 py-2 border-r border-slate-200">Employee</th>
                                        <th className="px-2 py-2 border-r border-slate-200">Date</th>
                                        <th className="px-2 py-2 text-center">Action</th>
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
                                                ₱{Number(getBalance(lead)).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 border-r border-slate-200 text-right font-bold text-emerald-700 tabular-nums">
                                                ₱{Number(getCommission(lead)).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 border-r border-slate-200 whitespace-nowrap text-slate-700">
                                                {lead.worker?.name || 'Unknown'}
                                            </td>
                                            <td className="px-2 py-2 border-r border-slate-200 whitespace-nowrap text-slate-600 tabular-nums">
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button
                                                    onClick={() => (lead.is_hidden ? toggleHideLead(lead) : toggleCheck(lead.id))}
                                                    className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center mx-auto",
                                                        checkedLeads.has(lead.id) ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"
                                                    )}
                                                >
                                                    {checkedLeads.has(lead.id) && <CheckCircle2 className="w-3 h-3" />}
                                                </button>
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
            {/* DESKTOP WEBSITE VIEW: Excel Spreadsheet Grid in Familiar Order */}
            {/* ============================================================== */}
            <div className="hidden md:block bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <div
                    ref={tableScrollRef}
                    className="overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
                >
                    <table className="w-full text-left border-collapse border-spacing-0">
                        {/* Excel Table Header in Familiar Order */}
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 text-xs font-bold uppercase tracking-wider select-none sticky top-0 z-20">
                                <th className="px-3 py-2.5 border-r border-slate-200">Employee</th>
                                <th className="px-3 py-2.5 border-r border-slate-200 min-w-[180px]">Client</th>
                                <th className="px-3 py-2.5 border-r border-slate-200">Date</th>
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
                                <th className="px-3 py-2.5 border-r border-slate-200 text-center w-14">Done</th>
                                <th className="px-3 py-2.5 text-right w-24">Actions</th>
                            </tr>
                        </thead>

                        {/* Excel Table Body with Gridlines */}
                        <tbody className="divide-y divide-slate-200 text-xs">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={15} className="px-4 py-4 bg-slate-50/50">
                                            <div className="h-4 bg-slate-200 rounded-full w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="px-6 py-16 text-center bg-white">
                                        <div className="max-w-xs mx-auto space-y-2">
                                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                                            <p className="text-slate-800 font-bold text-sm">
                                                {searchQuery ? "No matching clients found" : "Your master list is currently empty"}
                                            </p>
                                            <p className="text-slate-400 text-xs">
                                                {searchQuery ? "Try searching for a different keyword or resetting filters." : "Click below to refresh data from database."}
                                            </p>
                                            <button
                                                onClick={fetchData}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-black mt-2"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Reload Data
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => {
                                    const isChecked = checkedLeads.has(lead.id);
                                    const isFullyPaid = lead.payment_status === 'Fully Paid';
                                    const isDP = (lead.payment_status || 'Downpayment Only') === 'Downpayment Only';
                                    const isCancelled = lead.payment_status === 'Cancelled Project';

                                    return (
                                        <tr
                                            key={lead.id}
                                            className={cn(
                                                "transition-colors group",
                                                /* Soft Excel tints that preserve dark contrast and grid readability */
                                                isFullyPaid
                                                    ? "bg-emerald-50/40 hover:bg-emerald-100/50"
                                                    : isDP
                                                        ? "bg-blue-50/30 hover:bg-blue-100/40"
                                                        : isCancelled
                                                            ? "bg-rose-50/40 hover:bg-rose-100/50"
                                                            : "bg-white hover:bg-slate-50",
                                                lead.is_hidden && "opacity-40 grayscale"
                                            )}
                                        >
                                            {/* 1. Employee */}
                                            <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                                                <span className="font-bold text-slate-800">
                                                    {lead.worker?.name || 'Unknown'}
                                                </span>
                                            </td>

                                            {/* 2. Client Name & Contact */}
                                            <td className="px-3 py-2 border-r border-slate-200 relative pr-12">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-slate-900 text-[13px]">
                                                        {lead.client_name}
                                                    </span>
                                                    {lead.paid_stamped_at && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                                            PAID
                                                        </span>
                                                    )}
                                                </div>
                                                {lead.contact_info && (
                                                    <div className="text-[11px] text-slate-500 font-normal truncate max-w-[200px]" title={lead.contact_info}>
                                                        {lead.contact_info}
                                                    </div>
                                                )}
                                                {/* Visual Paid Stamp Image Overlay */}
                                                {lead.paid_stamped_at && (
                                                    <img
                                                        src="/paid-stamp.jpg"
                                                        alt="Paid"
                                                        title={`Paid stamped on ${new Date(lead.paid_stamped_at).toLocaleDateString()}`}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 object-contain -rotate-12 pointer-events-none select-none mix-blend-multiply opacity-80"
                                                    />
                                                )}
                                            </td>

                                            {/* 3. Date */}
                                            <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800 tabular-nums">
                                                    {new Date(lead.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                                    {lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })}
                                                </div>
                                            </td>

                                            {/* 4. Webdev */}
                                            <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                                                <span className={cn(
                                                    "font-medium",
                                                    lead.webdev?.name ? "text-slate-800" : "text-slate-400 italic"
                                                )}>
                                                    {lead.webdev?.name || 'Unassigned'}
                                                </span>
                                            </td>

                                            {/* 5. Package Value */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                <span className="font-bold text-slate-900 tabular-nums">
                                                    ₱{Number(lead.deal_value).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* 6. Down Payment */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                <span className="font-bold text-amber-700 tabular-nums">
                                                    ₱{Number(lead.down_payment).toLocaleString()}
                                                </span>
                                                {lead.down_payment_date && (
                                                    <span className="block text-[10px] text-slate-400 font-medium">
                                                        {fmtDate(lead.down_payment_date)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* 7. Full Payment */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                <span className="font-semibold text-slate-800 tabular-nums">
                                                    ₱{Number(lead.full_payment || 0).toLocaleString()}
                                                </span>
                                                {lead.full_payment_date && (
                                                    <span className="block text-[10px] text-slate-400 font-medium">
                                                        {fmtDate(lead.full_payment_date)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* 8. Paid Balance */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                <span className="font-semibold text-slate-800 tabular-nums">
                                                    ₱{Number(lead.paid_balance || 0).toLocaleString()}
                                                </span>
                                                {lead.paid_balance_date && (
                                                    <span className="block text-[10px] text-slate-400 font-medium">
                                                        {fmtDate(lead.paid_balance_date)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* 9. Tip */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">
                                                <span className="font-semibold text-blue-700 tabular-nums">
                                                    ₱{Number(lead.tip || 0).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* 10. Payment Status Pill */}
                                            <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
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
                                                    {getStatusIcon(lead.status)}
                                                    {lead.status === 'failed' ? 'Cancelled' : (lead.payment_status || 'Downpayment Only')}
                                                </span>
                                            </td>

                                            {/* 11. Balance */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap bg-rose-50/20">
                                                <span className="font-black text-rose-600 tabular-nums">
                                                    ₱{Number(getBalance(lead)).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* 12. Commission */}
                                            <td className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap bg-emerald-50/20">
                                                <span className="font-black text-emerald-700 tabular-nums">
                                                    ₱{Number(getCommission(lead)).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* 13. Proof Thumbnail */}
                                            <td className="px-2 py-2 border-r border-slate-200 text-center">
                                                {lead.proof_image_url ? (
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

                                            {/* 14. Done Checkbox */}
                                            <td className="px-2.5 py-2 border-r border-slate-200 text-center">
                                                <button
                                                    onClick={() => (lead.is_hidden ? toggleHideLead(lead) : toggleCheck(lead.id))}
                                                    title={lead.is_hidden ? "Restore to Master List" : "Check for stamping"}
                                                    className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all mx-auto active:scale-90",
                                                        isChecked
                                                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                                            : "border-slate-300 hover:border-slate-500 bg-white"
                                                    )}
                                                >
                                                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </td>

                                            {/* 15. Row Actions */}
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {lead.status === 'pending' && (
                                                        <button
                                                            onClick={() => setClosingLead(lead)}
                                                            className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-xs active:scale-95"
                                                        >
                                                            Close
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => toggleHideLead(lead)}
                                                        title={lead.is_hidden ? "Unhide" : "Hide Record"}
                                                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                                    >
                                                        {lead.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                    </button>
                                                    {!lead.paid_stamped_at && (
                                                        <button
                                                            onClick={() => handleDeleteLead(lead.id)}
                                                            title="Delete Record"
                                                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {/* Excel Spreadsheet Summary / Totals Row */}
                            {filteredLeads.length > 0 && (
                                <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-400 text-xs text-slate-900 select-none">
                                    <td colSpan={4} className="px-3 py-3 border-r border-slate-300">
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
                                        ₱{totalPackage.toLocaleString()}
                                    </td>
                                    {/* Total Down Payment */}
                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-amber-800 font-black">
                                        ₱{totalDP.toLocaleString()}
                                    </td>
                                    {/* Total Full Payment */}
                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-slate-900 font-black">
                                        ₱{totalFullPayment.toLocaleString()}
                                    </td>
                                    {/* Total Paid Balance */}
                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-slate-900 font-black">
                                        ₱{totalPaidBalance.toLocaleString()}
                                    </td>
                                    {/* Total Tip */}
                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-blue-700 font-black">
                                        ₱{totalTip.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-3 border-r border-slate-300 text-center text-slate-400 font-medium text-[10px]">
                                        —
                                    </td>
                                    {/* Total Deal Balance */}
                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-rose-600 font-black bg-rose-50/50">
                                        ₱{totalBalance.toLocaleString()}
                                    </td>
                                    {/* Total Commission */}
                                    <td className="px-3 py-3 border-r border-slate-300 text-right tabular-nums text-emerald-700 font-black bg-emerald-50/50">
                                        ₱{totalCommission.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-3 border-r border-slate-300"></td>
                                    <td className="px-3 py-3 border-r border-slate-300"></td>
                                    <td className="px-3 py-3"></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Proof Image Zoom Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-lg w-full bg-white rounded-2xl p-3 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Proof of Payment</span>
                            <button
                                type="button"
                                title="Close"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                onClick={() => setPreviewImage(null)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-2">
                            <img
                                src={previewImage}
                                alt="Proof of payment"
                                className="w-auto max-w-full max-h-[70vh] object-contain rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
