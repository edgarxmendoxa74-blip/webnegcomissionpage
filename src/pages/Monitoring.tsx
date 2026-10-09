import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Worker {
    id: string;
    name: string;
    role: string | null;
    photo_url: string | null;
    is_owner?: boolean;
}

interface Lead {
    id: string;
    worker_id: string | null;
    client_name: string | null;
    contact_info: string | null;
    deal_value: number | null;
    down_payment: number | null;
    payment_status: string | null;
    created_at: string | null;
}

type Bucket = 'closed' | 'cancelled' | 'pending';

const BUCKETS: { key: Bucket; label: string; active: string; text: string }[] = [
    { key: 'closed', label: 'Closed Deals', active: 'bg-green-600 text-white', text: 'text-green-600' },
    { key: 'cancelled', label: 'Cancelled Projects', active: 'bg-red-600 text-white', text: 'text-red-600' },
    { key: 'pending', label: 'Pending', active: 'bg-black text-white', text: 'text-zinc-500' },
];

const bucketOf = (l: Lead): Bucket =>
    l.payment_status === 'Fully Paid' ? 'closed' : l.payment_status === 'Cancelled Project' ? 'cancelled' : 'pending';

const peso = (n: number | null) => `₱${(Number(n) || 0).toLocaleString()}`;

export const MonitoringPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [bucket, setBucket] = useState<Bucket>('closed');

    useEffect(() => {
        (async () => {
            try {
                const [w, l] = await Promise.all([
                    supabase.from('workers').select('id, name, role, photo_url, is_owner').order('name'),
                    supabase
                        .from('leads')
                        .select('id, worker_id, client_name, contact_info, deal_value, down_payment, payment_status, created_at')
                        .order('created_at', { ascending: false }),
                ]);
                if (w.error) throw w.error;
                if (l.error) throw l.error;
                setWorkers((w.data || []).filter(x => !x.is_owner && x.role?.toLowerCase() !== 'owner'));
                setLeads(l.data || []);
            } catch (err) {
                console.error('Error fetching monitoring data:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const counts = useMemo(() => {
        const map = new Map<string, Record<Bucket, number>>();
        leads.forEach(l => {
            if (!l.worker_id) return;
            const c = map.get(l.worker_id) || { closed: 0, cancelled: 0, pending: 0 };
            c[bucketOf(l)]++;
            map.set(l.worker_id, c);
        });
        return map;
    }, [leads]);

    const selected = workers.find(w => w.id === selectedId) || null;
    const shown = selected ? leads.filter(l => l.worker_id === selected.id && bucketOf(l) === bucket) : [];
    const selectedCounts = (selected && counts.get(selected.id)) || { closed: 0, cancelled: 0, pending: 0 };

    // Detail page for the chosen account
    if (selected) {
        return (
            <div className="space-y-5 animate-in fade-in duration-500">
                <button
                    onClick={() => setSelectedId(null)}
                    className="inline-flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-black transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to accounts
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-sm font-black overflow-hidden shrink-0">
                        {selected.photo_url ? <img src={selected.photo_url} alt="" className="w-full h-full object-cover" /> : selected.name?.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-black uppercase">{selected.name}</h1>
                        <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest">{selected.role || 'Employee'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {BUCKETS.map(b => (
                        <button
                            key={b.key}
                            onClick={() => setBucket(b.key)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${bucket === b.key ? b.active : 'bg-white border border-zinc-100 text-zinc-500 hover:bg-zinc-50'}`}
                        >
                            {b.label} · {selectedCounts[b.key]}
                        </button>
                    ))}
                </div>

                <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Client</th>
                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Contact</th>
                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Deal Value</th>
                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Down Payment</th>
                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {shown.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">Nothing here</td></tr>
                                ) : shown.map(l => (
                                    <tr key={l.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-4 py-2.5 text-[11px] font-black text-black">{l.client_name || '—'}</td>
                                        <td className="px-4 py-2.5 text-[10px] font-bold text-zinc-500">{l.contact_info || '—'}</td>
                                        <td className={`px-4 py-2.5 text-right text-[11px] font-black tabular-nums ${BUCKETS.find(b => b.key === bucket)!.text}`}>{peso(l.deal_value)}</td>
                                        <td className="px-4 py-2.5 text-right text-[11px] font-bold tabular-nums text-zinc-500">{peso(l.down_payment)}</td>
                                        <td className="px-4 py-2.5 text-right text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                                            {l.created_at ? new Date(l.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div>
                <h1 className="text-lg font-black tracking-tight text-black uppercase">Monitoring</h1>
                <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                    Click an account to see their closed deals, cancelled projects and pending clients.
                </p>
            </div>

            {/* Accounts */}
            <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <p className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">Loading...</p>
                ) : workers.length === 0 ? (
                    <p className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">No accounts yet</p>
                ) : (
                    <ul className="divide-y divide-zinc-50">
                        {workers.map(w => {
                            const c = counts.get(w.id) || { closed: 0, cancelled: 0, pending: 0 };
                            return (
                                <li key={w.id}>
                                    <button
                                        onClick={() => { setSelectedId(w.id); setBucket('closed'); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-zinc-50/60"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[10px] font-black overflow-hidden shrink-0">
                                            {w.photo_url ? <img src={w.photo_url} alt="" className="w-full h-full object-cover" /> : w.name?.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-black text-black truncate">{w.name}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest truncate">{w.role || 'Employee'}</p>
                                        </div>
                                        <div className="flex gap-3 text-[9px] font-black tabular-nums">
                                            <span className="text-green-600" title="Closed">{c.closed} closed</span>
                                            <span className="text-red-600" title="Cancelled">{c.cancelled} cancelled</span>
                                            <span className="text-zinc-400" title="Pending">{c.pending} pending</span>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};
