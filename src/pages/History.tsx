import React, { useState, useEffect } from 'react';
import {
    Search,
    Calendar,
    CheckCircle2,
    Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Lead {
    id: string;
    client_name: string;
    status: 'pending' | 'closed' | 'failed';
    payment_status: 'Fully Paid' | 'Cancelled Project' | 'Downpayment Only';
    deal_value: number;
    down_payment: number;
    worker_id: string;
    worker?: { name: string };
    closed_at: string;
    created_at: string;
}

export const HistoryPage: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('All');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select('*, worker:workers(name)')
                .eq('status', 'closed')
                .order('closed_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        'All', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.client_name.toLowerCase().includes(searchQuery.toLowerCase());
        const date = new Date(lead.closed_at || lead.created_at);
        const monthName = months[date.getMonth() + 1];
        const matchesMonth = selectedMonth === 'All' || monthName === selectedMonth;
        return matchesSearch && matchesMonth;
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(val);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic text-black">Completed Clients History</h2>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Archived Successful Projects</p>
                </div>

                <div className="flex items-center gap-3">
                    <button title="Export Receipt History" className="p-3 bg-white border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm">
                        <Download className="w-5 h-5 text-black" />
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[1.5rem] border border-zinc-100 shadow-sm">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Client..."
                        className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 min-w-[200px]">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <select
                        title="Filter by Month"
                        className="flex-1 bg-zinc-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest py-2.5 px-4 outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        {months.map(m => <option key={m} value={m}>{m === 'All' ? 'All Months' : m}</option>)}
                    </select>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100 px-4">
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Completed</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Date</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Client Name</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Package</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Down Payment</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Dev Assigned</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 text-xs">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-8 py-10"><div className="h-4 bg-zinc-50 rounded-full w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-8 py-20 text-center text-zinc-300 font-bold uppercase tracking-widest text-xs">No records found</td>
                                </tr>
                            ) : filteredLeads.map((lead) => {
                                const balance = (lead.payment_status === 'Cancelled Project' || lead.payment_status === 'Downpayment Only')
                                    ? lead.down_payment - (lead.down_payment * 0.1)
                                    : lead.payment_status === 'Fully Paid'
                                        ? lead.deal_value - (lead.deal_value * 0.2) // Defaulting to 20% commission
                                        : lead.deal_value - (lead.down_payment || 0);
                                return (
                                    <tr key={lead.id} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-zinc-400">
                                            {new Date(lead.closed_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 font-black text-black uppercase tracking-tight">
                                            {lead.client_name}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-black italic">
                                            {formatCurrency(lead.deal_value)}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-zinc-400">
                                            {formatCurrency(lead.down_payment || 0)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                lead.payment_status === 'Fully Paid'
                                                    ? "bg-green-50 text-green-600 border-green-100"
                                                    : lead.payment_status === 'Downpayment Only'
                                                        ? "bg-blue-50 text-blue-600 border-blue-100"
                                                        : "bg-zinc-50 text-zinc-400 border-zinc-100"
                                            )}>
                                                {lead.payment_status || 'Downpayment Only'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-zinc-100 rounded-md flex items-center justify-center text-[7px] font-black uppercase text-zinc-400">
                                                    {lead.worker?.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-black">{lead.worker?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-black">
                                            <span className={balance > 0 ? "text-red-500" : "text-green-500"}>
                                                {formatCurrency(balance)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
