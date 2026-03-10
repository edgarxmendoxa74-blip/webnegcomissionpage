import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Eye,
    EyeOff,
    Trash2,
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
    worker?: { name: string; commission_percentage: number };
    is_hidden: boolean;
    commission_rate?: number;
    created_at: string;
}

interface Worker {
    id: string;
    name: string;
    commission_percentage: number;
}

export const LeadsTracker: React.FC = () => {
    const { profile, isOwner } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [closingLead, setClosingLead] = useState<Lead | null>(null);
    const [showHidden, setShowHidden] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        client_name: '',
        contact_info: '',
        ad_source: '',
        worker_id: '',
        deal_value: 0,
        down_payment: 0,
        payment_status: 'Downpayment Only' as string
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const leadsQuery = supabase.from('leads').select('*, worker:workers(name, commission_percentage)').order('created_at', { ascending: false });

            if (!isOwner && profile?.id) {
                leadsQuery.eq('worker_id', profile.id);
            }

            const [leadsRes, workersRes] = await Promise.all([
                leadsQuery,
                supabase.from('workers').select('id, name, commission_percentage').eq('active', true)
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
                    payment_status: formData.payment_status,
                    closed_at: new Date().toISOString()
                })
                .eq('id', closingLead.id);

            if (leadError) throw leadError;

            // 2. Calculate commission
            const commissionRate = formData.payment_status === 'Cancelled Project' ? 10 : (closingLead.commission_rate || closingLead.worker?.commission_percentage || 20);
            const commissionAmount = (dealValue * commissionRate) / 100;

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

    const togglePaymentStatus = async (lead: Lead) => {
        const nextStatus = lead.payment_status === 'Fully Paid' ? 'Downpayment Only' : 'Fully Paid';
        try {
            const { error } = await supabase
                .from('leads')
                .update({ payment_status: nextStatus })
                .eq('id', lead.id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error toggling payment status:', err);
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
            return [
                date.toLocaleString('default', { month: 'long' }),
                date.toLocaleDateString(),
                l.client_name,
                l.deal_value,
                l.down_payment,
                Number(l.deal_value - l.down_payment).toFixed(2),
                l.status === 'failed' ? 'Cancelled' : (l.payment_status || 'Downpayment Only'),
                Number(l.deal_value * (l.payment_status === 'Cancelled Project' ? 0.1 : (l.commission_rate || 20) / 100)).toFixed(2)
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

    const filteredLeads = leads.filter(l => showHidden ? true : !l.is_hidden);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-black">Master List</h2>
                    <p className="text-zinc-400 font-medium">Manage your potential clients and project collections.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold tracking-tight transition-all active:scale-95 text-xs uppercase",
                            showHidden ? "bg-black text-white" : "bg-white border border-zinc-100 text-zinc-400 hover:text-black"
                        )}
                    >
                        {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {showHidden ? 'Showing Hidden' : 'Show Hidden Items'}
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-100 text-black rounded-2xl hover:bg-zinc-50 transition-all active:scale-95 font-bold tracking-tight text-xs uppercase"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </button>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Month</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Client Name</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Total Package</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Downpayment</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Total Balance</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Commission</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-10"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredLeads.map((lead) => (
                                <tr key={lead.id} className={cn(
                                    "group transition-colors",
                                    lead.payment_status === 'Fully Paid' ? "bg-yellow-50/50 hover:bg-yellow-100/50" :
                                        lead.payment_status === 'Downpayment Only' ? "bg-blue-50/50 hover:bg-blue-100/50" :
                                            lead.payment_status === 'Cancelled Project' ? "bg-red-50/50 hover:bg-red-100/50" :
                                                "hover:bg-zinc-50/50",
                                    lead.is_hidden && "opacity-40 grayscale"
                                )}>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-black text-xs uppercase tracking-widest">{new Date(lead.created_at).toLocaleString('default', { month: 'short' })}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-xs text-zinc-400 font-black tabular-nums">{new Date(lead.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-black text-sm">{lead.client_name}</div>
                                        <div className="text-[10px] text-zinc-400 font-medium">{lead.contact_info}</div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-sm font-black text-black tabular-nums">₱{Number(lead.deal_value).toLocaleString()}</div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-sm font-black text-amber-600 tabular-nums">₱{Number(lead.down_payment).toLocaleString()}</div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-sm font-black text-red-600 tabular-nums">₱{Number(lead.payment_status === 'Cancelled Project' ? 0 : lead.deal_value - lead.down_payment).toLocaleString()}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide">
                                                {getStatusIcon(lead.status)}
                                                <span className={cn(
                                                    lead.status === 'closed' ? "text-green-600" :
                                                        lead.status === 'failed' ? "text-red-600" : "text-amber-600"
                                                )}>
                                                    {lead.status === 'failed' ? 'Cancelled' : lead.status}
                                                </span>
                                            </div>
                                            {lead.status === 'closed' && (
                                                <button
                                                    onClick={() => togglePaymentStatus(lead)}
                                                    className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border self-start transition-all",
                                                        lead.payment_status === 'Fully Paid'
                                                            ? "bg-green-50 text-green-600 border-green-100"
                                                            : lead.payment_status === 'Downpayment Only'
                                                                ? "bg-blue-50 text-blue-600 border-blue-100"
                                                                : "bg-red-50 text-red-500 border-red-100"
                                                    )}
                                                >
                                                    {lead.payment_status || 'Downpayment Only'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-sm font-black text-green-600 tabular-nums">
                                            ₱{Number(lead.deal_value * (lead.payment_status === 'Cancelled Project' ? 0.1 : (lead.commission_rate || 20) / 100)).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                                        {lead.status === 'pending' && (
                                            <button
                                                onClick={() => setClosingLead(lead)}
                                                className="px-5 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-zinc-800 transition-all shadow-lg shadow-black/5 active:scale-95"
                                            >
                                                Close Deal
                                            </button>
                                        )}

                                        <div className="flex items-center gap-1 ml-4 border-l border-zinc-100 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleHideLead(lead)}
                                                title={lead.is_hidden ? "Unhide" : "Hide Record"}
                                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-colors"
                                            >
                                                {lead.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLead(lead.id)}
                                                title="Delete Record"
                                                className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
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
        </div>
    );
};
