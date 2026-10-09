import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Worker {
    id: string;
    name: string;
    role: string | null;
    is_owner?: boolean;
}

interface DayLead {
    id: string;
    worker_id: string | null;
    client_name: string | null;
    contact_info: string | null;
    payment_status: string | null;
    created_at: string;
    updated_at: string | null;
    closed_at: string | null;
}

const STATUS_STYLE: Record<string, string> = {
    'Fully Paid': 'bg-green-50 text-green-600',
    'Cancelled Project': 'bg-red-50 text-red-600',
};

// yyyy-mm-dd in the viewer's local timezone
const toInputDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sameLocalDay = (iso: string | null | undefined, day: string) => !!iso && toInputDate(new Date(iso)) === day;

/** Owner-side daily audit: the clients each account entered on a given day (name, phone number, status). */
export const DailyAudit: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workerId, setWorkerId] = useState('all');
    const [day, setDay] = useState(() => toInputDate(new Date()));
    const [leads, setLeads] = useState<DayLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        supabase.from('workers').select('id, name, role, is_owner').order('name').then(({ data }) => {
            setWorkers((data || []).filter(w => !w.is_owner && w.role?.toLowerCase() !== 'owner'));
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            // Pad the window by a day each side so local-timezone boundaries are covered, then filter exactly below.
            const start = new Date(`${day}T00:00:00`);
            const from = new Date(start.getTime() - 24 * 3600 * 1000).toISOString();
            const to = new Date(start.getTime() + 48 * 3600 * 1000).toISOString();
            let q = supabase
                .from('leads')
                .select('id, worker_id, client_name, contact_info, payment_status, created_at, updated_at, closed_at')
                .or(`and(created_at.gte.${from},created_at.lt.${to}),and(updated_at.gte.${from},updated_at.lt.${to}),and(closed_at.gte.${from},closed_at.lt.${to})`);
            if (workerId !== 'all') q = q.eq('worker_id', workerId);
            const { data, error } = await q;
            if (cancelled) return;
            if (error) setError(error.message);
            else setLeads(data || []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [day, workerId]);

    // One row per client the account touched that day, newest activity first
    const rows = useMemo(() => {
        return leads
            .filter(l => sameLocalDay(l.created_at, day) || sameLocalDay(l.closed_at, day) || sameLocalDay(l.updated_at, day))
            .map(l => {
                const times = [l.created_at, l.closed_at, l.updated_at].filter(t => sameLocalDay(t, day)) as string[];
                return { lead: l, at: times.sort().reverse()[0] };
            })
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }, [leads, day]);

    const nameOf = (id: string | null) => workers.find(w => w.id === id)?.name || 'Unassigned';

    return (
        <div className="bg-white border border-zinc-100 rounded-xl lg:rounded-2xl shadow-sm p-4 lg:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                    {rows.length} client{rows.length === 1 ? '' : 's'} on this day
                </p>
                <div className="flex gap-2">
                    <select
                        aria-label="Account"
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                        className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black"
                    >
                        <option value="all">All accounts</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <input
                        type="date"
                        aria-label="Date"
                        value={day}
                        max={toInputDate(new Date())}
                        onChange={(e) => e.target.value && setDay(e.target.value)}
                        className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-black outline-none focus:border-black"
                    />
                </div>
            </div>

            {error && (
                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">{error}</p>
            )}

            {loading ? (
                <div className="h-20 bg-zinc-50 rounded-xl animate-pulse" />
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">No clients on this day</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-100">
                                <th className="py-2 pr-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Client</th>
                                <th className="py-2 pr-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Phone Number</th>
                                <th className="py-2 pr-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                {workerId === 'all' && <th className="py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Account</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {rows.map(({ lead: l }) => (
                                <tr key={l.id}>
                                    <td className="py-2.5 pr-4 text-[11px] font-black text-black">{l.client_name || '—'}</td>
                                    <td className="py-2.5 pr-4 text-[11px] font-bold text-zinc-600 tabular-nums">{l.contact_info || '—'}</td>
                                    <td className="py-2.5 pr-4">
                                        <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${STATUS_STYLE[l.payment_status || ''] || 'bg-zinc-100 text-zinc-500'}`}>
                                            {l.payment_status || 'Downpayment Only'}
                                        </span>
                                    </td>
                                    {workerId === 'all' && (
                                        <td className="py-2.5 text-right text-[9px] font-black text-zinc-500 uppercase tracking-widest">{nameOf(l.worker_id)}</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
