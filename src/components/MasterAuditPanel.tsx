import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AUDIT_STATUS_STYLE, type DailyAuditRow, type AuditRecord } from './EmployeeDailyAudit';

const STATUSES: DailyAuditRow['status'][] = ['Submitted', 'Reviewed', 'Needs Review'];

interface WorkerLite {
    id: string;
    name: string;
    role: string | null;
    is_owner?: boolean;
}

interface DayGroup {
    key: string;
    worker_id: string;
    date: string;
    report: DailyAuditRow | null;
    records: AuditRecord[];
}

const peso = (n: number) => `₱${(Number(n) || 0).toLocaleString()}`;

/** Owner-side Daily Audit: everything each employee entered, grouped by account and day. */
export const MasterAuditPanel: React.FC = () => {
    const [workers, setWorkers] = useState<WorkerLite[]>([]);
    const [reports, setReports] = useState<DailyAuditRow[]>([]);
    const [records, setRecords] = useState<AuditRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recordsError, setRecordsError] = useState<string | null>(null);
    const [workerId, setWorkerId] = useState('all');
    const [day, setDay] = useState('');
    const [filter, setFilter] = useState<'All' | DailyAuditRow['status']>('All');
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = async () => {
        // Plain selects (no joins) so one failing query can never hide the other data
        const [ws, rep, rec] = await Promise.all([
            supabase.from('workers').select('id, name, role, is_owner').order('name'),
            supabase.from('daily_audits').select('*').order('audit_date', { ascending: false }).limit(500),
            supabase
                .from('audit_records')
                .select('*')
                .order('record_date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1000),
        ]);
        if (ws.data) setWorkers(ws.data.filter(w => !w.is_owner && w.role?.toLowerCase() !== 'owner'));
        if (rep.error) setError(rep.error.message);
        else { setError(null); setReports((rep.data as DailyAuditRow[]) || []); }
        if (rec.error) setRecordsError(rec.error.message);
        else { setRecordsError(null); setRecords((rec.data as AuditRecord[]) || []); }
        setLoading(false);
    };

    useEffect(() => {
        load();
        const channel = supabase
            .channel('master-daily-audits')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_audits' }, () => load())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_records' }, () => load())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const setStatus = async (id: string, status: DailyAuditRow['status']) => {
        const previous = reports;
        setSavingId(id);
        setReports(rs => rs.map(r => (r.id === id ? { ...r, status } : r)));
        const { error } = await supabase
            .from('daily_audits')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) {
            setReports(previous);
            setError(error.message);
        } else {
            setError(null);
        }
        setSavingId(null);
    };

    const workerOf = (id: string) => workers.find(w => w.id === id);

    // One group per employee per day, holding that day's submitted report and every record they entered
    const groups = useMemo(() => {
        const map = new Map<string, DayGroup>();
        const get = (worker_id: string, date: string) => {
            const key = `${worker_id}|${date}`;
            let g = map.get(key);
            if (!g) { g = { key, worker_id, date, report: null, records: [] }; map.set(key, g); }
            return g;
        };
        reports.forEach(r => { get(r.worker_id, r.audit_date).report = r; });
        records.forEach(r => { get(r.worker_id, r.record_date).records.push(r); });
        return Array.from(map.values()).sort(
            (a, b) => b.date.localeCompare(a.date) || (workerOf(a.worker_id)?.name || '').localeCompare(workerOf(b.worker_id)?.name || '')
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports, records, workers]);

    const visible = groups.filter(g =>
        (workerId === 'all' || g.worker_id === workerId) &&
        (!day || g.date === day) &&
        (filter === 'All' || g.report?.status === filter)
    );

    const counts = useMemo(() => {
        const c: Record<DailyAuditRow['status'], number> = { 'Submitted': 0, 'Reviewed': 0, 'Needs Review': 0 };
        groups
            .filter(g => (workerId === 'all' || g.worker_id === workerId) && (!day || g.date === day))
            .forEach(g => { if (g.report) c[g.report.status]++; });
        return c;
    }, [groups, workerId, day]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <select
                    aria-label="Account"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black"
                >
                    <option value="all">All accounts</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <input
                    type="date"
                    aria-label="Date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black outline-none focus:border-black"
                />
                {day && (
                    <button onClick={() => setDay('')} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-black">
                        All dates
                    </button>
                )}
            </div>

            {/* Status cards only matter once employees' reports exist */}
            <div className={reports.length === 0 ? 'hidden' : 'grid grid-cols-3 gap-2'}>
                {STATUSES.map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setFilter(f => (f === s ? 'All' : s))}
                        className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${filter === s ? 'border-ink bg-white shadow-md' : 'border-zinc-100 bg-white'}`}
                    >
                        <p className="text-xl font-black text-black tabular-nums">{counts[s]}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s}</p>
                    </button>
                ))}
            </div>

            {error && (
                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">
                    Could not load submitted reports: {error}
                </p>
            )}
            {recordsError && (
                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">
                    Could not load client records: {recordsError}
                </p>
            )}

            {loading ? (
                <div className="h-24 bg-white rounded-2xl animate-pulse" />
            ) : visible.length === 0 ? (
                <p className="py-12 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest bg-white border border-zinc-100 rounded-2xl">
                    {groups.length === 0 ? 'Nothing submitted yet' : 'Nothing matches this filter'}
                </p>
            ) : (
                <ul className="space-y-3">
                    {visible.map(g => {
                        const w = workerOf(g.worker_id);
                        const r = g.report;
                        return (
                            <li key={g.key} className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-zinc-50">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm text-black truncate">{w?.name || 'Unknown'}</p>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                            {new Date(`${g.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            {w?.role ? ` · ${w.role}` : ''}
                                        </p>
                                    </div>
                                    {r ? (
                                        <>
                                            <div className="grid grid-cols-4 sm:flex gap-4 sm:gap-6 text-[10px]">
                                                <div>
                                                    <p className="font-black text-zinc-400 uppercase tracking-widest">Added</p>
                                                    <p className="font-black text-black tabular-nums">{r.clients_added}</p>
                                                </div>
                                                <div>
                                                    <p className="font-black text-zinc-400 uppercase tracking-widest">Paid</p>
                                                    <p className="font-black text-black tabular-nums">{r.deals_closed}</p>
                                                </div>
                                                <div>
                                                    <p className="font-black text-zinc-400 uppercase tracking-widest">Sales</p>
                                                    <p className="font-black text-black tabular-nums">{peso(r.total_sales)}</p>
                                                </div>
                                                <div>
                                                    <p className="font-black text-zinc-400 uppercase tracking-widest">Comm.</p>
                                                    <p className="font-black text-green-600 tabular-nums">{peso(r.commission)}</p>
                                                </div>
                                            </div>
                                            <select
                                                aria-label={`Status for ${w?.name || 'report'}`}
                                                value={r.status}
                                                disabled={savingId === r.id}
                                                onChange={(e) => setStatus(r.id, e.target.value as DailyAuditRow['status'])}
                                                className={`h-9 px-4 rounded-full border font-black uppercase tracking-widest text-[9px] outline-none cursor-pointer disabled:opacity-50 ${AUDIT_STATUS_STYLE[r.status]}`}
                                            >
                                                {STATUSES.map(s => <option key={s} value={s} className="bg-white text-black">{s}</option>)}
                                            </select>
                                        </>
                                    ) : (
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                            {g.records.length} client record{g.records.length === 1 ? '' : 's'}
                                        </span>
                                    )}
                                </div>

                                {r?.notes && (
                                    <p className="mx-4 mt-3 text-xs font-medium text-zinc-600 leading-relaxed bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 whitespace-pre-wrap">
                                        {r.notes}
                                    </p>
                                )}

                                <div className="p-4">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">
                                        Client records · {g.records.length}
                                    </p>
                                    {g.records.length === 0 ? (
                                        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">No client records</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-zinc-100">
                                                        <th className="py-2 pr-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Client</th>
                                                        <th className="py-2 pr-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Phone Number</th>
                                                        <th className="py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-50">
                                                    {g.records.map(rec => (
                                                        <tr key={rec.id}>
                                                            <td className="py-2 pr-4 text-[11px] font-black text-black">{rec.client_name}</td>
                                                            <td className="py-2 pr-4 text-[11px] font-bold text-zinc-600 tabular-nums">{rec.phone_number || '—'}</td>
                                                            <td className="py-2">
                                                                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{rec.status}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
