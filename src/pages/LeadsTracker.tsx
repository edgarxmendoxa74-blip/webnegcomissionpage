import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Eye,
    EyeOff,
    Trash2,
    Search,
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
    worker?: { name: string; commission_percentage: number };
    webdev?: { name: string };
    is_hidden: boolean;
    commission_rate?: number;
    created_at: string;
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
    const [showHidden] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [checkedLeads, setCheckedLeads] = useState<Set<string>>(new Set());

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
            let commissionAmount;
            if (formData.payment_status === 'Downpayment Only' || formData.payment_status === 'Cancelled Project') {
                commissionAmount = (formData.down_payment * 0.1);
            } else {
                const commissionRate = (closingLead.commission_rate || closingLead.worker?.commission_percentage || 20);
                commissionAmount = (dealValue * commissionRate) / 100;
            }

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
            fetchData();
        } catch (err) {
            console.error('Error updating payment status:', err);
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
        try {
            const { error } = await supabase
                .from('leads')
                .update({ is_hidden: !lead.is_hidden })
                .eq('id', lead.id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error toggling hide status:', err);
        }
    };

    const exportToCSV = () => {
        const headers = ['Month', 'Date', 'Client Name', 'Total Package', 'Downpayment', 'Total Balance', 'Status', 'Commission'];
        const rows = leads.map(l => {
            const date = new Date(l.created_at);
            const isCancelledOrDP = l.payment_status === 'Downpayment Only' || l.payment_status === 'Cancelled Project';
            const commission = isCancelledOrDP ? (l.down_payment * 0.1) : (l.deal_value * (l.commission_rate || 20) / 100);

            const totalBalance = isCancelledOrDP
                ? l.down_payment - commission
                : l.payment_status === 'Fully Paid'
                    ? l.deal_value - commission
                    : l.deal_value - l.down_payment;

            return [
                date.toLocaleString('default', { month: 'long' }),
                date.toLocaleDateString(),
                l.client_name,
                l.deal_value,
                l.down_payment,
                Number(totalBalance).toFixed(2),
                l.status === 'failed' ? 'Cancelled' : (l.payment_status || 'Downpayment Only'),
                Number(commission).toFixed(2)
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Master_List_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.client_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesHidden = showHidden ? true : !l.is_hidden;
        return matchesSearch && matchesHidden;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-6">
                <div className="relative group w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                    <input
                        type="text"
                        placeholder="Search client name..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <button
                            onClick={exportToCSV}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all active:scale-95 font-bold tracking-tight text-[10px] lg:text-xs uppercase shadow-lg shadow-orange-500/20"
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
            <div className="bg-white border border-zinc-100 rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden shadow-sm relative group">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/5 backdrop-blur-sm text-black/20 p-2 rounded-full lg:hidden pointer-events-none animate-pulse">
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black uppercase tracking-widest">Scroll</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Month</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Date</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Client Name</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Webdev Assigned</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Total Package</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Downpayment</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Tip</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Total Balance</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Commission</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">✓</th>
                                <th className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={10} className="px-8 py-10"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-8 py-20 text-center">
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
                                    lead.payment_status === 'Fully Paid' ? "bg-green-600 text-white shadow-lg scale-[1.01] z-10" :
                                        lead.payment_status === 'Downpayment Only' ? "bg-zinc-600 text-white shadow-lg scale-[1.01] z-10" :
                                            lead.payment_status === 'Cancelled Project' ? "bg-red-600 text-white shadow-lg scale-[1.01] z-10" :
                                                "hover:bg-zinc-50/50",
                                    lead.is_hidden && "opacity-40 grayscale"
                                )}>
                                    <td className="px-3 py-2">
                                        <div className={cn("font-bold text-[9px] uppercase tracking-widest", lead.payment_status ? "text-zinc-200" : "text-black")}>
                                            {new Date(lead.created_at).toLocaleString('default', { month: 'short' })}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className={cn("text-[9px] font-black tabular-nums", lead.payment_status ? "text-zinc-300" : "text-zinc-400")}>
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-bold text-[11px] text-inherit">{lead.client_name}</div>
                                        <div className={cn("text-[8px] font-medium", lead.payment_status ? "text-white/70" : "text-zinc-400")}>
                                            {lead.contact_info}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-bold text-[9px] uppercase tracking-widest text-inherit">{lead.webdev?.name || 'Unassigned'}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="text-[11px] font-black tabular-nums text-inherit">₱{Number(lead.deal_value).toLocaleString()}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className={cn("text-[11px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-amber-600")}>
                                            ₱{Number(lead.down_payment).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className={cn("text-[11px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-blue-600")}>
                                            ₱{Number(lead.tip || 0).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className={cn("text-[11px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-red-600")}>
                                            ₱{Number(
                                                (lead.payment_status === 'Cancelled Project' || lead.payment_status === 'Downpayment Only')
                                                    ? lead.down_payment - (lead.down_payment * 0.1)
                                                    : lead.payment_status === 'Fully Paid'
                                                        ? lead.deal_value - (lead.deal_value * (lead.commission_rate || 20) / 100)
                                                        : lead.deal_value - lead.down_payment
                                            ).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide">
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
                                                        "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border self-start transition-all shadow-sm",
                                                        lead.payment_status === 'Fully Paid' ? "bg-white/20 text-white border-white/30" :
                                                            lead.payment_status === 'Downpayment Only' ? "bg-white/20 text-white border-white/30" :
                                                                lead.payment_status === 'Cancelled Project' ? "bg-white/20 text-white border-white/30" :
                                                                    "bg-zinc-50 text-zinc-500 border-zinc-100"
                                                    )}>
                                                        {lead.payment_status || 'Downpayment Only'}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => updatePaymentStatus(lead.id, 'Fully Paid')}
                                                            title="Highlight Green (Completed)"
                                                            className="w-3 h-3 rounded-full bg-green-500 border border-white hover:scale-125 transition-transform shadow-sm"
                                                        />
                                                        <button
                                                            onClick={() => updatePaymentStatus(lead.id, 'Cancelled Project')}
                                                            title="Highlight Red (Cancelled)"
                                                            className="w-3 h-3 rounded-full bg-red-500 border border-white hover:scale-125 transition-transform shadow-sm"
                                                        />
                                                        <button
                                                            onClick={() => updatePaymentStatus(lead.id, 'Downpayment Only')}
                                                            title="Highlight Gray (Downpayment)"
                                                            className="w-3 h-3 rounded-full bg-zinc-400 border border-white hover:scale-125 transition-transform shadow-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2 text-right">
                                        <div className={cn("text-[11px] font-black tabular-nums", lead.payment_status ? "text-white" : "text-green-600")}>
                                            ₱{Number((lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project') ? (lead.down_payment * 0.1) : (lead.deal_value * (lead.commission_rate || 20) / 100)).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => toggleCheck(lead.id)}
                                            className={cn(
                                                "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all duration-200 active:scale-90",
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
                                    <td className="px-3 py-2 text-right flex items-center justify-end gap-1.5">
                                        {lead.status === 'pending' && (
                                            <button
                                                onClick={() => setClosingLead(lead)}
                                                className="px-3 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-full hover:bg-zinc-800 transition-all shadow-lg shadow-black/5 active:scale-95"
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
                                            <button
                                                onClick={() => handleDeleteLead(lead.id)}
                                                title="Delete Record"
                                                className={cn("p-1 rounded-lg transition-colors", lead.payment_status ? "hover:bg-red-500 text-white" : "hover:bg-red-50 text-zinc-400 hover:text-red-500")}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length > 0 && (
                                <tr className="bg-zinc-50/50 font-black border-t-2 border-zinc-100">
                                    <td colSpan={6} className="px-4 py-4 text-right text-[9px] uppercase tracking-[0.2em] text-zinc-400">Totals</td>
                                    <td className="px-4 py-4 text-right text-base text-blue-600 tabular-nums">
                                        ₱{filteredLeads.reduce((sum, lead) => sum + (Number(lead.tip) || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-right text-base text-red-600 tabular-nums">
                                        ₱{filteredLeads.reduce((sum, lead) => {
                                            const balance = (lead.payment_status === 'Cancelled Project' || lead.payment_status === 'Downpayment Only')
                                                ? lead.down_payment - (lead.down_payment * 0.1)
                                                : lead.payment_status === 'Fully Paid'
                                                    ? lead.deal_value - (lead.deal_value * (lead.commission_rate || 20) / 100)
                                                    : lead.deal_value - lead.down_payment;
                                            return sum + (Number(balance) || 0);
                                        }, 0).toLocaleString()}
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td className="px-4 py-4 text-right text-base text-green-600 tabular-nums">
                                        ₱{filteredLeads.reduce((sum, lead) => {
                                            const commission = (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project')
                                                ? (lead.down_payment * 0.1)
                                                : (lead.deal_value * (lead.commission_rate || 20) / 100);
                                            return sum + (Number(commission) || 0);
                                        }, 0).toLocaleString()}
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Close Deal Modal */}
            <AnimatePresence>
                {closingLead && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setClosingLead(null)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white border border-zinc-100 rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center">
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};
