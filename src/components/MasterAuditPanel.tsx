import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AUDIT_STATUS_STYLE, type DailyAuditRow, type AuditRecord } from './EmployeeDailyAudit';
import { RefreshCw, AlertCircle, LayoutGrid, Table2, Download } from 'lucide-react';

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
    const [viewMode, setViewMode] = useState<'grid' | 'sheet'>('grid');

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            setRecordsError(null);

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

            if (ws.data) {
                setWorkers(ws.data.filter(w => !w.is_owner && w.role?.toLowerCase() !== 'owner'));
            }

            if (rep.error) {
                const msg = rep.error.message || '';
                setError(msg.includes('fetch') || msg.includes('network')
                    ? 'Network connection issue. Please check your internet connection.'
                    : msg);
            } else {
                setError(null);
                setReports((rep.data as DailyAuditRow[]) || []);
            }

            if (rec.error) {
                const msg = rec.error.message || '';
                setRecordsError(msg.includes('fetch') || msg.includes('network')
                    ? 'Network connection issue. Please check your internet connection.'
                    : msg);
            } else {
                setRecordsError(null);
                setRecords((rec.data as AuditRecord[]) || []);
            }
        } catch (err: any) {
            console.error('Error loading master audit:', err);
            const msg = err?.message || String(err);
            setError(msg.includes('fetch') || msg.includes('network')
                ? 'Network connection issue. Please check your internet connection.'
                : msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();

        const handleOnline = () => {
            load();
        };
        window.addEventListener('online', handleOnline);

        const channel = supabase
            .channel('master-daily-audits')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_audits' }, () => load())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_records' }, () => load())
            .subscribe();

        return () => {
            window.removeEventListener('online', handleOnline);
            supabase.removeChannel(channel);
        };
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

    const exportCSV = () => {
        // Header rows
        const auditHeaders = ['Account', 'Role', 'Date', 'Clients Added', 'Deals Closed', 'Total Sales', 'Commission', 'Status', 'Notes'];
        const recordHeaders = ['Account', 'Date', 'Client Name', 'Phone', 'Socials', 'Status', 'Notes'];

        const esc = (v: string | number | null | undefined) => {
            const s = String(v ?? '').replace(/"/g, '""');
            return `"${s}"`;
        };

        // Section 1: audit summaries
        const auditRows = visible.map(g => {
            const w = workerOf(g.worker_id);
            const r = g.report;
            return [
                esc(w?.name || 'Unknown'),
                esc(w?.role || ''),
                esc(g.date),
                esc(r?.clients_added ?? ''),
                esc(r?.deals_closed ?? ''),
                esc(r ? Number(r.total_sales) : ''),
                esc(r ? Number(r.commission) : ''),
                esc(r?.status || ''),
                esc(r?.notes || ''),
            ].join(',');
        });

        // Section 2: client records (flat)
        const recordRows = visible.flatMap(g => {
            const w = workerOf(g.worker_id);
            return g.records.map(rec => [
                esc(w?.name || 'Unknown'),
                esc(rec.record_date),
                esc(rec.client_name),
                esc(rec.phone_number || ''),
                esc(rec.socials || ''),
                esc(rec.status),
                esc(rec.notes || ''),
            ].join(','));
        });

        const csv = [
            'DAILY AUDIT SUMMARY',
            auditHeaders.map(h => `"${h}"`).join(','),
            ...auditRows,
            '',
            'CLIENT RECORDS',
            recordHeaders.map(h => `"${h}"`).join(','),
            ...recordRows,
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = day || new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `daily-audit-${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        disabled={loading}
                        title="Refresh Daily Audits"
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-slate-700 hover:border-black transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-black' : ''}`} />
                        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                    </button>

                    <button
                        onClick={exportCSV}
                        disabled={visible.length === 0}
                        title="Export to CSV"
                        className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-700 text-white border border-zinc-900 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        aria-label="Account"
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:border-black"
                    >
                        <option value="all">All accounts</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <input
                        type="date"
                        aria-label="Date"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                    >
                    </input>
                    {day && (
                        <button onClick={() => setDay('')} className="text-xs font-bold text-zinc-500 uppercase tracking-wider hover:text-black">
                            All dates
                        </button>
                    )}
                </div>
            </div>

            {/* Status cards only matter once employees' reports exist */}
            <div className={reports.length === 0 ? 'hidden' : 'grid grid-cols-3 gap-1.5 sm:gap-2'}>
                {STATUSES.map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setFilter(f => (f === s ? 'All' : s))}
                        className={`px-2.5 py-1.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all active:scale-95 ${filter === s ? 'border-ink bg-white shadow-md' : 'border-zinc-100 bg-white'}`}
                    >
                        <p className="text-sm sm:text-xl font-black text-black tabular-nums leading-tight">{counts[s]}</p>
                        <p className="text-[7px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wide sm:tracking-widest">{s}</p>
                    </button>
                ))}
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="font-semibold">{error}</span>
                    </div>
                    <button
                        onClick={load}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shrink-0 active:scale-95"
                    >
                        Retry
                    </button>
                </div>
            )}
            {recordsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="font-semibold">{recordsError}</span>
                    </div>
                    <button
                        onClick={load}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shrink-0 active:scale-95"
                    >
                        Retry
                    </button>
                </div>
            )}

            {loading ? (
                <div className="h-24 bg-white rounded-2xl animate-pulse" />
            ) : visible.length === 0 ? (
                <p className="py-12 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider bg-white border border-zinc-100 rounded-2xl">
                    {groups.length === 0 ? 'Nothing submitted yet' : 'Nothing matches this filter'}
                </p>
            ) : (
                <>
                    {/* View toggle */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400 font-medium">
                            {visible.length} record{visible.length !== 1 ? 's' : ''} shown
                        </p>
                        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('sheet')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'sheet' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
                            >
                                <Table2 className="w-3.5 h-3.5" />
                                Sheet
                            </button>
                        </div>
                    </div>

                    {viewMode === 'grid' ? (
                        /* ── Grid / Card View ── */
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
                                                        className={`h-7 sm:h-9 px-2.5 sm:px-4 rounded-full border font-black uppercase tracking-wide sm:tracking-widest text-[8px] sm:text-[9px] w-fit outline-none cursor-pointer disabled:opacity-50 ${AUDIT_STATUS_STYLE[r.status]}`}
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

                                        <div className="p-3 sm:p-4">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">
                                                Client records · {g.records.length}
                                            </p>
                                            {g.records.length === 0 ? (
                                                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">No client records</p>
                                            ) : (
                                                <div className="overflow-x-auto scrollbar-hide -mx-1">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Client</th>
                                                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Phone</th>
                                                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Socials</th>
                                                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                                                                <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-50">
                                                            {g.records.map(rec => (
                                                                <tr key={rec.id}>
                                                                    <td className="px-2 py-1">
                                                                        <div className="font-bold text-[9px] text-black break-words">{rec.client_name}</div>
                                                                        <div className="text-[7px] font-medium uppercase tracking-widest text-zinc-400 tabular-nums">{new Date(`${rec.record_date}T00:00:00`).toLocaleDateString()}</div>
                                                                    </td>
                                                                    <td className="px-2 py-1 text-[8px] font-bold text-zinc-600 tabular-nums whitespace-nowrap">{rec.phone_number || '—'}</td>
                                                                    <td className="px-2 py-1 text-[8px] font-bold text-zinc-600 max-w-[5rem] break-words">{rec.socials || '—'}</td>
                                                                    <td className="px-2 py-1">
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[7px] font-black uppercase tracking-widest whitespace-nowrap">{rec.status}</span>
                                                                    </td>
                                                                    <td className="px-2 py-1 text-[8px] font-medium text-zinc-500 min-w-[5rem] max-w-[10rem] whitespace-pre-wrap break-words">{rec.notes || '—'}</td>
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
                    ) : (
                        /* ── Sheet / Table View ── */
                        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-50 border-b border-zinc-200">
                                            <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Account</th>
                                            <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Date</th>
                                            <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Clients Added</th>
                                            <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Deals Closed</th>
                                            <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Total Sales</th>
                                            <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Commission</th>
                                            <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Client Records</th>
                                            <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Status</th>
                                            <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {visible.map(g => {
                                            const w = workerOf(g.worker_id);
                                            const r = g.report;
                                            return (
                                                <tr key={g.key} className="hover:bg-zinc-50 transition-colors group">
                                                    {/* Account */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <p className="font-bold text-black">{w?.name || 'Unknown'}</p>
                                                        {w?.role && <p className="text-[9px] text-zinc-400 font-medium">{w.role}</p>}
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600 font-medium">
                                                        {new Date(`${g.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>

                                                    {/* Clients Added */}
                                                    <td className="px-4 py-3 text-right tabular-nums font-black text-black">
                                                        {r ? r.clients_added : '—'}
                                                    </td>

                                                    {/* Deals Closed */}
                                                    <td className="px-4 py-3 text-right tabular-nums font-black text-black">
                                                        {r ? r.deals_closed : '—'}
                                                    </td>

                                                    {/* Total Sales */}
                                                    <td className="px-4 py-3 text-right tabular-nums font-black text-black">
                                                        {r ? peso(r.total_sales) : '—'}
                                                    </td>

                                                    {/* Commission */}
                                                    <td className="px-4 py-3 text-right tabular-nums font-black text-green-600">
                                                        {r ? peso(r.commission) : '—'}
                                                    </td>

                                                    {/* Client Records count */}
                                                    <td className="px-4 py-3 text-right tabular-nums text-zinc-500 font-medium">
                                                        {g.records.length}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {r ? (
                                                            <select
                                                                aria-label={`Status for ${w?.name || 'report'}`}
                                                                value={r.status}
                                                                disabled={savingId === r.id}
                                                                onChange={(e) => setStatus(r.id, e.target.value as DailyAuditRow['status'])}
                                                                className={`h-7 px-2.5 rounded-full border font-black uppercase tracking-widest text-[8px] outline-none cursor-pointer disabled:opacity-50 ${AUDIT_STATUS_STYLE[r.status]}`}
                                                            >
                                                                {STATUSES.map(s => <option key={s} value={s} className="bg-white text-black">{s}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">No report</span>
                                                        )}
                                                    </td>

                                                    {/* Notes */}
                                                    <td className="px-4 py-3 text-zinc-500 font-medium max-w-[200px] truncate">
                                                        {r?.notes || <span className="text-zinc-300">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
