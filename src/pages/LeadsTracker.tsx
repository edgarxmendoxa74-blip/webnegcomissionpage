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
    const [closingLead, setClosingLead] = useState<Lead | null>(null);
    const [showHidden, setShowHidden] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [checkedLeads, setCheckedLeads] = useState<Set<string>>(new Set());
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
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

    // Form States
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
    }, []);

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
            const leadsQuery = supabase.from('leads').select('*, worker:workers!worker_id(name, commission_percentage), webdev:workers!webdev_id(name)').order('created_at', { ascending: false });

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
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };


    const handleCloseDeal = async (dealValue: number) => {
        if (!closingLead) return;
        setIsSubmitting(true);
        try {
            // 1. Update lead status
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

            // 2. Calculate commission
            const commissionAmount = dealCommission(
                { payment_status: formData.payment_status, deal_value: dealValue, down_payment: formData.down_payment, commission_rate: closingLead.commission_rate },
                closingLead.worker?.commission_percentage ?? 0
            );

            // 3. Insert commission record
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
            case 'closed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-amber-500" />;
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

    // Permanent: once stamped, there is intentionally no way to undo it.
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

    // Same formulas as the employee's My Deals, so both sides always show the same numbers.
    const getCommission = (lead: Lead) => dealCommission(lead, lead.worker?.commission_percentage ?? 0);
    const getBalance = (lead: Lead) => dealBalance(lead, lead.worker?.commission_percentage ?? 0);

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

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.client_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesHidden = showHidden ? true : !l.is_hidden;
        return matchesSearch && matchesHidden;
    });

    if (closingLead) {
        return (
            <div className="max-w-md mx-auto space-y-4 animate-in fade-in duration-500">
                <button
                    type="button"
                    onClick={() => setClosingLead(null)}
                    className="flex items-center gap-2 px-3 py-2 -ml-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-black hover:bg-white active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to leads
                </button>
                <div className="bg-white border border-zinc-100 rounded-[2rem] shadow-sm p-6 sm:p-10 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-black" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase italic text-black mb-2">Close Deal</h2>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 leading-relaxed">Enter final deal value for <br /><span className="text-black">{closingLead.client_name}</span></p>

            <div className="space-y-4 mb-8">
                <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-xl text-zinc-300">₱</span>
                    <input
                        type="number"
                        autoFocus
                        className="w-full pl-12 pr-6 py-5 bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] outline-none text-2xl font-black focus:border-black transition-all text-center tabular-nums"
                        placeholder="Package Value 0.00"
                        value={formData.deal_value || ''}
                        onChange={(e) => setFormData({ ...formData, deal_value: Number(e.target.value) })}
                    />
                </div>
                <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-xl text-zinc-300">₱</span>
                    <input
                        type="number"
                        className="w-full pl-12 pr-6 py-5 bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] outline-none text-2xl font-black focus:border-black transition-all text-center tabular-nums"
                        placeholder="Down Payment 0.00"
                        value={formData.down_payment || ''}
                        onChange={(e) => setFormData({ ...formData, down_payment: Number(e.target.value) })}
                    />
                </div>
                <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-xl text-zinc-300">₱</span>
                    <input
                        type="number"
                        className="w-full pl-12 pr-6 py-5 bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] outline-none text-2xl font-black focus:border-black transition-all text-center tabular-nums"
                        placeholder="Tip 0.00"
                        value={formData.tip || ''}
                        onChange={(e) => setFormData({ ...formData, tip: Number(e.target.value) })}
                    />
                </div>
                <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Payment Status</span>
                    <select
                        title="Payment Status"
                        className="w-full px-6 py-4 bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] outline-none text-xs font-black uppercase tracking-widest focus:border-black transition-all appearance-none"
                        value={formData.payment_status}
                        onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                    >
                        <option value="Downpayment Only">Downpayment Only</option>
                        <option value="Fully Paid">Fully Paid</option>
                        <option value="Cancelled Project">Cancelled Project</option>
                    </select>
                </div>
                <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-2">Webdev Assigned</span>
                    <select
                        title="Webdev Assigned"
                        className="w-full px-6 py-4 bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] outline-none text-xs font-black uppercase tracking-widest focus:border-black transition-all appearance-none"
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

            <div className="flex flex-col gap-3">
                <button
                    onClick={() => handleCloseDeal(formData.deal_value)}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    Confirm Deal
                </button>
                <button onClick={() => setClosingLead(null)} className="w-full py-3 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-300 hover:text-black transition-colors">Dismiss</button>
            </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-6">
                <div className="relative group w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                    <input
                        type="text"
                        placeholder="Search client name..."
                        className="w-full pl-10 pr-3 py-2 bg-white border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-start gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowHidden(v => !v)}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 rounded-2xl transition-all active:scale-95 font-bold tracking-tight text-[10px] lg:text-xs uppercase border whitespace-nowrap",
                            showHidden ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-200 hover:border-black"
                        )}
                    >
                        {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {showHidden ? 'Showing Hidden' : `Hidden (${leads.filter(l => l.is_hidden).length})`}
                    </button>
                    {isOwner && (
                        <button
                            onClick={stampCheckedPaid}
                            disabled={stampableChecked.length === 0}
                            title="Check the Done box of records first, then click to stamp them PAID"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-800 text-white rounded-2xl hover:bg-red-700 transition-all active:scale-95 font-bold tracking-tight text-[10px] lg:text-xs uppercase shadow-lg shadow-red-800/20 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Stamp Paid ({stampableChecked.length})
                        </button>
                    )}
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={exportToCSV}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all active:scale-95 font-bold tracking-tight text-[10px] lg:text-xs uppercase shadow-lg shadow-orange-500/20"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                        <div className="text-[7px] lg:text-[8px] font-black text-zinc-400 text-center uppercase tracking-widest leading-tight mt-0.5">
                            Download every 2 weeks
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Container with Horizontal Scroll Hint */}
            <div className="bg-white border border-zinc-100 rounded-xl lg:rounded-2xl overflow-hidden shadow-sm relative group">
                {/* Mobile: card list that fits the screen */}
                <div className="md:hidden divide-y divide-zinc-100">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)
                    ) : filteredLeads.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-zinc-400 font-bold text-sm">
                                {searchQuery ? "No matching clients found" : "No records found"}
                            </p>
                        </div>
                    ) : filteredLeads.map((lead) => {
                        const colored = !!lead.payment_status;
                        const sub = colored ? "text-white/70" : "text-zinc-400";
                        const expanded = expandedId === lead.id;
                        return (
                            <div key={lead.id} className={cn(
                                "relative px-3 py-2",
                                lead.payment_status === 'Fully Paid' ? "bg-green-600 text-white" :
                                    lead.payment_status === 'Downpayment Only' ? "bg-zinc-600 text-white" :
                                        lead.payment_status === 'Cancelled Project' ? "bg-red-600 text-white" :
                                            "bg-white text-zinc-900",
                                lead.is_hidden && "opacity-40 grayscale"
                            )}>
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(expanded ? null : lead.id)}
                                    className="w-full flex items-center gap-2 text-left"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="font-black text-[11px] truncate">{lead.client_name}</div>
                                        <div className={cn("text-[8px] font-bold uppercase tracking-widest truncate", sub)}>
                                            {new Date(lead.created_at).toLocaleDateString()} · {lead.worker?.name || 'Unknown'}
                                        </div>
                                    </div>
                                    {lead.paid_stamped_at && (
                                        <img
                                            src="/paid-stamp.jpg"
                                            alt="Paid"
                                            className="w-9 h-9 object-contain -rotate-12 pointer-events-none select-none mix-blend-multiply shrink-0 [filter:saturate(3)_brightness(1.15)_contrast(1.2)]"
                                        />
                                    )}
                                    <div className="text-right shrink-0">
                                        <div className="font-black text-[11px] tabular-nums">₱{Number(lead.deal_value).toLocaleString()}</div>
                                        <div className={cn("text-[8px] font-black uppercase tracking-widest", sub)}>
                                            {lead.status === 'closed' ? (lead.payment_status || 'Downpayment Only') : lead.status === 'failed' ? 'Cancelled' : lead.status}
                                        </div>
                                    </div>
                                    <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", sub, expanded && "rotate-90")} />
                                </button>
                                {expanded && (<>
                                {lead.contact_info && <div className={cn("text-[9px] font-medium break-words mt-1", sub)}>{lead.contact_info}</div>}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[9px]">
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Employee</span><span className="font-bold uppercase">{lead.worker?.name || 'Unknown'}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Webdev</span><span className="font-bold uppercase">{lead.webdev?.name || 'Unassigned'}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Package</span><span className="font-black tabular-nums">₱{Number(lead.deal_value).toLocaleString()}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Down Payment</span><span className="font-black tabular-nums">₱{Number(lead.down_payment).toLocaleString()}</span><span className={cn("block text-[7px]", sub)}>{fmtDate(lead.down_payment_date)}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Full Payment</span><span className="font-black tabular-nums">₱{Number(lead.full_payment || 0).toLocaleString()}</span><span className={cn("block text-[7px]", sub)}>{fmtDate(lead.full_payment_date)}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Paid Balance</span><span className="font-black tabular-nums">₱{Number(lead.paid_balance || 0).toLocaleString()}</span><span className={cn("block text-[7px]", sub)}>{fmtDate(lead.paid_balance_date)}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Tip</span><span className="font-black tabular-nums">₱{Number(lead.tip || 0).toLocaleString()}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Balance</span><span className={cn("font-black tabular-nums", !colored && "text-red-600")}>₱{Number(getBalance(lead)).toLocaleString()}</span></div>
                                    <div><span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Commission</span><span className={cn("font-black tabular-nums", !colored && "text-green-600")}>₱{Number(getCommission(lead)).toLocaleString()}</span></div>
                                    <div>
                                        <span className={cn("block text-[7px] font-black uppercase tracking-widest", sub)}>Status</span>
                                        <span className="font-black uppercase">{lead.status === 'failed' ? 'Cancelled' : lead.status}</span>
                                        {lead.status === 'closed' && <span className={cn("block text-[7px] font-black uppercase", sub)}>{lead.payment_status || 'Downpayment Only'}</span>}
                                    </div>
                                </div>
                                <div className={cn("flex items-center justify-between mt-3 pt-2 border-t", colored ? "border-white/20" : "border-zinc-100")}>
                                    <div className="flex items-center gap-3">
                                        {lead.proof_image_url ? (
                                            <button type="button" onClick={() => setPreviewImage(lead.proof_image_url!)} title="View proof">
                                                <img src={lead.proof_image_url} alt="Proof of payment" className="w-9 h-9 object-cover rounded-md border border-white/30" />
                                            </button>
                                        ) : (
                                            <span className={cn("text-[8px] font-black uppercase", sub)}>No proof</span>
                                        )}
                                        <button
                                            onClick={() => (lead.is_hidden ? toggleHideLead(lead) : toggleCheck(lead.id))}
                                            className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"
                                        >
                                            <span className={cn(
                                                "w-4 h-4 rounded border-2 flex items-center justify-center",
                                                checkedLeads.has(lead.id) ? "bg-emerald-500 border-emerald-500 text-white" : colored ? "border-white/50" : "border-zinc-300"
                                            )}>
                                                {checkedLeads.has(lead.id) && <CheckCircle2 className="w-3" />}
                                            </span>
                                            {lead.is_hidden ? 'Restore' : 'Done'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {lead.status === 'pending' && (
                                            <button
                                                onClick={() => setClosingLead(lead)}
                                                className="px-3 py-1.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-full active:scale-95"
                                            >
                                                Close
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleHideLead(lead)}
                                            title={lead.is_hidden ? "Unhide" : "Hide Record"}
                                            className="p-1.5 rounded-lg active:bg-black/10"
                                        >
                                            {lead.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        {!lead.paid_stamped_at && (
                                            <button
                                                onClick={() => handleDeleteLead(lead.id)}
                                                title="Delete Record"
                                                className="p-1.5 rounded-lg active:bg-black/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                </>)}
                            </div>
                        );
                    })}
                    {filteredLeads.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded-xl p-3 text-center">
                            <div><span className="block text-[7px] font-black uppercase tracking-widest text-zinc-400">Tip</span><span className="text-[11px] font-black text-blue-600 tabular-nums">₱{filteredLeads.reduce((s, l) => s + (Number(l.tip) || 0), 0).toLocaleString()}</span></div>
                            <div><span className="block text-[7px] font-black uppercase tracking-widest text-zinc-400">Balance</span><span className="text-[11px] font-black text-red-600 tabular-nums">₱{filteredLeads.reduce((s, l) => s + (Number(getBalance(l)) || 0), 0).toLocaleString()}</span></div>
                            <div><span className="block text-[7px] font-black uppercase tracking-widest text-zinc-400">Commission</span><span className="text-[11px] font-black text-green-600 tabular-nums">₱{filteredLeads.reduce((s, l) => s + (Number(getCommission(l)) || 0), 0).toLocaleString()}</span></div>
                        </div>
                    )}
                </div>

                <div className="hidden md:flex items-center justify-end gap-2 px-2 py-1 border-b border-zinc-100">
                    <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400 mr-1">Slide</span>
                    <button
                        type="button"
                        onClick={() => slideTable(-1)}
                        title="Slide left"
                        className="p-1 rounded-full bg-zinc-100 hover:bg-black hover:text-white transition-all active:scale-90"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => slideTable(1)}
                        title="Slide right"
                        className="p-1 rounded-full bg-zinc-100 hover:bg-black hover:text-white transition-all active:scale-90"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div ref={tableScrollRef} className="hidden md:block overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-zinc-100 [&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Employee</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Client</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Date</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Webdev</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Package</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Down Payment</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Full Payment</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Paid Balance</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Tip</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Balance</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Commission</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Proof</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Done</th>
                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={15} className="px-8 py-10"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="px-8 py-20 text-center">
                                        <p className="text-zinc-400 font-bold text-sm">
                                            {searchQuery ? "No matching clients found" : "No records found"}
                                        </p>
                                        <p className="text-zinc-300 text-xs mt-1">
                                            {searchQuery ? "Try searching for a different name." : "Your database is currently empty."}
                                        </p>
                                    </td>
                                </tr>
                            ) : filteredLeads.map((lead) => (
                                <tr key={lead.id} className={cn(
                                    "group transition-all duration-300",
                                    lead.payment_status === 'Fully Paid' ? "bg-green-600 text-white shadow-lg" :
                                        lead.payment_status === 'Downpayment Only' ? "bg-zinc-600 text-white shadow-lg" :
                                            lead.payment_status === 'Cancelled Project' ? "bg-red-600 text-white shadow-lg" :
                                                "hover:bg-zinc-50/50",
                                    lead.is_hidden && "opacity-40 grayscale"
                                )}>
                                    <td className="px-2 py-1">
                                        <div className="font-bold text-[8px] uppercase tracking-widest text-inherit whitespace-nowrap">{lead.worker?.name || 'Unknown'}</div>
                                    </td>
                                    <td className="px-2 py-1 pr-14 relative">
                                        <div>
                                            <div className="font-bold text-[9px] text-inherit">{lead.client_name}</div>
                                            {lead.paid_stamped_at && (
                                                <img
                                                    src="/paid-stamp.jpg"
                                                    alt="Paid"
                                                    title={`Paid on ${new Date(lead.paid_stamped_at).toLocaleDateString()}`}
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 object-contain -rotate-12 pointer-events-none select-none mix-blend-multiply z-10 [filter:saturate(3)_brightness(1.15)_contrast(1.2)]"
                                                />
                                            )}
                                        </div>
                                        {lead.contact_info && (
                                            <div className={cn("text-[7px] font-medium", lead.payment_status ? "text-white/70" : "text-zinc-400")}>
                                                {lead.contact_info}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                        <div className="font-bold text-[8px] tabular-nums text-inherit">{new Date(lead.created_at).toLocaleDateString()}</div>
                                        <div className={cn("text-[7px] font-medium uppercase tracking-widest", lead.payment_status ? "text-white/70" : "text-zinc-400")}>
                                            {lead.month || new Date(lead.created_at).toLocaleString('default', { month: 'short' })}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1">
                                        <div className="font-bold text-[8px] uppercase tracking-widest text-inherit">{lead.webdev?.name || 'Unassigned'}</div>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        <div className="text-[8px] font-black tabular-nums text-inherit">₱{Number(lead.deal_value).toLocaleString()}</div>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        <div className={cn("text-[8px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-amber-600")}>
                                            ₱{Number(lead.down_payment).toLocaleString()}
                                        </div>
                                        <div className={cn("text-[7px] font-medium uppercase tracking-widest", lead.payment_status ? "text-white/70" : "text-zinc-400")}>{fmtDate(lead.down_payment_date)}</div>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        <div className="text-[8px] font-black tabular-nums text-inherit">₱{Number(lead.full_payment || 0).toLocaleString()}</div>
                                        <div className={cn("text-[7px] font-medium uppercase tracking-widest", lead.payment_status ? "text-white/70" : "text-zinc-400")}>{fmtDate(lead.full_payment_date)}</div>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        <div className="text-[8px] font-black tabular-nums text-inherit">₱{Number(lead.paid_balance || 0).toLocaleString()}</div>
                                        <div className={cn("text-[7px] font-medium uppercase tracking-widest", lead.payment_status ? "text-white/70" : "text-zinc-400")}>{fmtDate(lead.paid_balance_date)}</div>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        <div className={cn("text-[8px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-blue-600")}>
                                            ₱{Number(lead.tip || 0).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-wide">
                                                {getStatusIcon(lead.status)}
                                                <span className={cn(
                                                    lead.payment_status ? "text-white" : (
                                                        lead.status === 'closed' ? "text-green-600" :
                                                            lead.status === 'failed' ? "text-red-600" : "text-amber-600"
                                                    )
                                                )}>

                                                    {lead.status === 'failed' ? 'Cancelled' : lead.status}
                                                </span>
                                            </div>
                                            {lead.status === 'closed' && (
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn(
                                                        "text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-md border self-start transition-all shadow-sm",
                                                        lead.payment_status === 'Fully Paid' ? "bg-white/20 text-white border-white/30" :
                                                            lead.payment_status === 'Downpayment Only' ? "bg-white/20 text-white border-white/30" :
                                                                lead.payment_status === 'Cancelled Project' ? "bg-white/20 text-white border-white/30" :
                                                                    "bg-zinc-50 text-zinc-500 border-zinc-100"
                                                    )}>
                                                        {lead.payment_status || 'Downpayment Only'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-2 py-1 text-right">
                                        <div className={cn("text-[8px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-red-600")}>
                                            ₱{Number(getBalance(lead)).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        <div className={cn("text-[8px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-green-600")}>
                                            ₱{Number(getCommission(lead)).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1">
                                        {lead.proof_image_url ? (
                                            <button type="button" onClick={() => setPreviewImage(lead.proof_image_url!)} title="View proof">
                                                <img src={lead.proof_image_url} alt="Proof of payment" className="w-7 h-7 object-cover rounded-md border border-white/30 hover:scale-110 transition-transform" />
                                            </button>
                                        ) : (
                                            <span className="text-[8px] font-black text-inherit opacity-50">—</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1 text-center">
                                        <button
                                            onClick={() => (lead.is_hidden ? toggleHideLead(lead) : toggleCheck(lead.id))}
                                            title={lead.is_hidden ? "Restore to Master List" : undefined}
                                            className={cn(
                                                "w-3 h-3 rounded border-2 flex items-center justify-center transition-all duration-200 active:scale-90",
                                                checkedLeads.has(lead.id)
                                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                                                    : lead.payment_status
                                                        ? "border-white/40 hover:border-white/70"
                                                        : "border-zinc-300 hover:border-zinc-500"
                                            )}
                                        >
                                            {checkedLeads.has(lead.id) && (
                                                <CheckCircle2 className="w-3" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-2 py-1 text-right flex items-center justify-end gap-1.5">
                                        {lead.status === 'pending' && (
                                            <button
                                                onClick={() => setClosingLead(lead)}
                                                className="px-3 py-1 bg-black text-white text-[7px] font-black uppercase tracking-widest rounded-full hover:bg-zinc-800 transition-all shadow-lg shadow-black/5 active:scale-95"
                                            >
                                                Close
                                            </button>
                                        )}

                                        <div className="flex items-center gap-1 ml-2 border-l border-zinc-100 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleHideLead(lead)}
                                                title={lead.is_hidden ? "Unhide" : "Hide Record"}
                                                className={cn("p-1 rounded-lg transition-colors", lead.payment_status ? "hover:bg-white/20 text-white" : "hover:bg-zinc-100 text-zinc-400 hover:text-black")}
                                            >
                                                {lead.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                            </button>
                                            {!lead.paid_stamped_at && <button
                                                onClick={() => handleDeleteLead(lead.id)}
                                                title="Delete Record"
                                                className={cn("p-1 rounded-lg transition-colors", lead.payment_status ? "hover:bg-red-500 text-white" : "hover:bg-red-50 text-zinc-400 hover:text-red-500")}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length > 0 && (
                                <tr className="bg-zinc-50/50 font-black border-t-2 border-zinc-100">
                                    <td colSpan={8} className="px-2 py-2 text-right text-[7px] uppercase tracking-[0.2em] text-zinc-400">Totals</td>
                                    <td className="px-2 py-2 text-right text-[10px] text-blue-600 tabular-nums">
                                        ₱{filteredLeads.reduce((sum, lead) => sum + (Number(lead.tip) || 0), 0).toLocaleString()}
                                    </td>
                                    <td></td>
                                    <td className="px-2 py-2 text-right text-[10px] text-red-600 tabular-nums">
                                        ₱{filteredLeads.reduce((sum, lead) => sum + (Number(getBalance(lead)) || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="px-2 py-2 text-right text-[10px] text-green-600 tabular-nums">
                                        ₱{filteredLeads.reduce((sum, lead) => sum + (Number(getCommission(lead)) || 0), 0).toLocaleString()}
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
        </div >
    );
};
