import React, { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

export interface DailyAuditRow {
    id: string;
    worker_id: string;
    audit_date: string;
    clients_added: number;
    deals_closed: number;
    total_sales: number;
    commission: number;
    notes: string | null;
    status: 'Submitted' | 'Reviewed' | 'Needs Review';
    updated_at: string | null;
}

export interface AuditRecord {
    id: string;
    worker_id: string;
    record_date: string;
    client_name: string;
    phone_number: string | null;
    socials: string | null;
    notes?: string | null;
    status: string;
    created_at: string;
}

export const RECORD_STATUS_SUGGESTIONS = ['Pending', 'Follow-up', 'Closed', 'Cancelled'];

interface DayLead {
    id: string;
    client_name: string | null;
    deal_value: number | null;
    payment_status: string | null;
    created_at: string;
    closed_at: string | null;
}

export const AUDIT_STATUS_STYLE: Record<DailyAuditRow['status'], string> = {
    'Submitted': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Reviewed': 'bg-green-50 text-green-700 border-green-200',
    'Needs Review': 'bg-red-50 text-red-600 border-red-200',
};

const peso = (n: number) => `₱${(Number(n) || 0).toLocaleString()}`;

// yyyy-mm-dd in the viewer's local timezone
export const toInputDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sameLocalDay = (iso: string | null | undefined, day: string) => !!iso && toInputDate(new Date(iso)) === day;

/** Employee-side daily audit: summarises the day's deals and submits a report to the owner's Master List > Audit. */
export const EmployeeDailyAudit: React.FC<{ workerId: string; rate: number }> = ({ workerId, rate }) => {
    const [day, setDay] = useState(() => toInputDate(new Date()));
    const [leads, setLeads] = useState<DayLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [records, setRecords] = useState<AuditRecord[]>([]);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recName, setRecName] = useState('');
    const [recPhone, setRecPhone] = useState('');
    const [recSocials, setRecSocials] = useState('');
    const [recStatus, setRecStatus] = useState('');
    const [recNotes, setRecNotes] = useState('');
    const [recDate, setRecDate] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [recSaving, setRecSaving] = useState(false);
    const [recError, setRecError] = useState<string | null>(null);
    const [report, setReport] = useState<DailyAuditRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState<string | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFrom, setExportFrom] = useState('');
    const [exportTo, setExportTo] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);


    const loadRecords = async () => {
        const { data, error } = await supabase
            .from('audit_records')
            .select('*')
            .eq('worker_id', workerId)
            .eq('record_date', day)
            .order('created_at', { ascending: false });
        if (error) setError(error.message);
        else setRecords((data as AuditRecord[]) || []);
    };

    useEffect(() => {
        loadRecords();
    }, [day, workerId]);

    const openRecordModal = (r?: AuditRecord) => {
        setEditingId(r?.id ?? null);
        setRecName(r?.client_name ?? '');
        setRecPhone(r?.phone_number ?? '');
        setRecSocials(r?.socials ?? '');
        setRecStatus(r?.status ?? '');
        setRecNotes(r?.notes ?? '');
        setRecDate(r?.record_date ?? day);
        setRecError(null);
        setShowRecordModal(true);
    };

    const saveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recName.trim() || !recStatus.trim() || !recDate) {
            setRecError('Date, client name and status are required.');
            return;
        }
        setRecSaving(true);
        setRecError(null);
        const fields = {
            record_date: recDate,
            client_name: recName.trim(),
            phone_number: recPhone.trim() || null,
            socials: recSocials.trim() || null,
            status: recStatus.trim(),
            notes: recNotes.trim() || null,
        };
        const { data, error } = editingId
            ? await supabase.from('audit_records').update(fields).eq('id', editingId).select('id')
            : await supabase
                .from('audit_records')
                .insert({ worker_id: workerId, ...fields })
                .select('id');
        setRecSaving(false);
        if (error) {
            setRecError(error.message);
            return;
        }
        if (!data || data.length === 0) {
            setRecError(`Not saved - you do not have permission to ${editingId ? 'edit' : 'add'} records.`);
            return;
        }
        setShowRecordModal(false);
        // Jump to the record's date so it doesn't vanish from the list when the date was changed.
        if (recDate !== day) setDay(recDate);
        else loadRecords();
    };

    const deleteRecord = async (r: AuditRecord) => {
        if (!confirm(`Delete the record for ${r.client_name}?`)) return;
        const { error } = await supabase.from('audit_records').delete().eq('id', r.id);
        if (error) {
            setError(error.message);
            return;
        }
        setRecords(prev => prev.filter(x => x.id !== r.id));
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            // Pad the window a day each side for timezone edges, then filter exactly below.
            const start = new Date(`${day}T00:00:00`);
            const from = new Date(start.getTime() - 24 * 3600 * 1000).toISOString();
            const to = new Date(start.getTime() + 48 * 3600 * 1000).toISOString();
            const { data, error } = await supabase
                .from('leads')
                .select('id, client_name, deal_value, payment_status, created_at, closed_at')
                .eq('worker_id', workerId)
                .or(`and(created_at.gte.${from},created_at.lt.${to}),and(closed_at.gte.${from},closed_at.lt.${to})`);
            if (cancelled) return;
            if (error) setError(error.message);
            else setLeads((data as DayLead[]) || []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [day, workerId]);

    const summary = useMemo(() => {
        const todays = leads.filter(l => sameLocalDay(l.created_at, day) || sameLocalDay(l.closed_at, day));
        const paid = todays.filter(l => l.payment_status === 'Fully Paid');
        const sales = paid.reduce((s, l) => s + (Number(l.deal_value) || 0), 0);
        return {
            todays,
            clientsAdded: leads.filter(l => sameLocalDay(l.created_at, day)).length,
            dealsClosed: paid.length,
            sales,
            commission: sales * rate / 100,
        };
    }, [leads, day, rate]);

    const loadReport = async () => {
        const { data } = await supabase
            .from('daily_audits')
            .select('*')
            .eq('worker_id', workerId)
            .eq('audit_date', day)
            .maybeSingle();
        setReport((data as DailyAuditRow) || null);
    };

    useEffect(() => {
        setSavedMsg(null);
        loadReport();
    }, [day, workerId]);

    // Writes the day's totals to the owner's Daily Audit. `submit` also (re)marks the report as Submitted.
    const syncReport = async (submit: boolean) => {
        const payload: Record<string, unknown> = {
            worker_id: workerId,
            audit_date: day,
            clients_added: summary.clientsAdded,
            deals_closed: summary.dealsClosed,
            total_sales: summary.sales,
            commission: summary.commission,
            updated_at: new Date().toISOString(),
        };
        if (submit) payload.status = 'Submitted';
        const { error } = await supabase.from('daily_audits').upsert(payload, { onConflict: 'worker_id,audit_date' });
        if (!error) loadReport();
        return error;
    };

    // Keep the owner's copy current without any button press (skipped once the owner has marked it Reviewed).
    useEffect(() => {
        if (loading || report?.status === 'Reviewed') return;
        const hasActivity = summary.clientsAdded > 0 || summary.dealsClosed > 0 || records.length > 0;
        if (!hasActivity) return;
        const same = report
            && report.clients_added === summary.clientsAdded
            && report.deals_closed === summary.dealsClosed
            && Number(report.total_sales) === summary.sales
            && Number(report.commission) === summary.commission;
        if (!same) syncReport(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, summary, records.length, report]);

    const run = async (submit: boolean) => {
        setSaving(true);
        setSavedMsg(null);
        setError(null);
        const err = await syncReport(submit);
        setSaving(false);
        if (err) setError(err.message);
        else setSavedMsg(submit ? 'Audit submitted to the owner' : 'Saved');
    };
    const handleSave = () => run(false);
    const handleSubmit = () => run(true);

    // Opens the export form, defaulting to the past week (the export is meant to be done weekly).
    const handleExport = () => {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 6 * 24 * 3600 * 1000);
        setExportFrom(toInputDate(weekAgo));
        setExportTo(toInputDate(today));
        setExportError(null);
        setShowExportModal(true);
    };

    const runExport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exportFrom || !exportTo) {
            setExportError('Please set both dates.');
            return;
        }
        if (exportFrom > exportTo) {
            setExportError('"From" date must be on or before the "To" date.');
            return;
        }
        setExporting(true);
        setExportError(null);
        const { data, error } = await supabase
            .from('audit_records')
            .select('*')
            .eq('worker_id', workerId)
            .gte('record_date', exportFrom)
            .lte('record_date', exportTo)
            .order('record_date', { ascending: true })
            .order('created_at', { ascending: true });
        setExporting(false);
        if (error) {
            setExportError(error.message);
            return;
        }
        const list = (data as AuditRecord[]) || [];
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows: unknown[][] = [
            ['Client Records', `${exportFrom} to ${exportTo}`],
            [],
            ['Date', 'Client', 'Phone Number', 'Socials', 'Status', 'Notes'],
            ...list.map(r => [r.record_date, r.client_name, r.phone_number || '', r.socials || '', r.status, r.notes || '']),
        ];
        const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `client-records-${exportFrom}_to_${exportTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1.5">End of day</p>
                    <h2 className="text-2xl font-black tracking-tighter text-ink uppercase">Daily Audit</h2>
                    <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">
                        Your records and totals are sent to the owner automatically.
                    </p>
                </div>
                <input
                    type="date"
                    aria-label="Audit date"
                    value={day}
                    max={toInputDate(new Date())}
                    onChange={(e) => e.target.value && setDay(e.target.value)}
                    className="px-4 py-3 bg-white border border-zinc-100 rounded-2xl text-[11px] font-black outline-none focus:border-ink"
                />
            </div>

            {error && (
                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">{error}</p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {[
                    { label: 'Clients Added', value: String(summary.clientsAdded) },
                    { label: 'Deals Fully Paid', value: String(summary.dealsClosed) },
                    { label: 'Total Sales', value: peso(summary.sales) },
                    { label: 'Commission', value: peso(summary.commission), highlight: true },
                ].map(c => (
                    <div
                        key={c.label}
                        className={`rounded-2xl p-4 lg:p-5 shadow-sm border ${c.highlight ? 'bg-ink text-white border-ink' : 'bg-white border-zinc-100'}`}
                    >
                        <p className={`text-[8px] font-black uppercase tracking-[0.25em] ${c.highlight ? 'text-zinc-400' : 'text-zinc-400'}`}>{c.label}</p>
                        <p className="text-xl lg:text-2xl font-black tracking-tighter tabular-nums mt-2">{loading ? '—' : c.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-zinc-100 rounded-[1.5rem] shadow-sm p-5 lg:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink">Client Records</h3>
                    <div className="grid grid-cols-2 sm:flex items-start sm:items-center gap-2">
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={handleExport}
                                className="flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                            >
                                <Download className="w-3.5 h-3.5" /> Export
                            </button>
                            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-400 text-center leading-tight">
                                Export list every 1 week
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="self-start flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 bg-white border border-zinc-200 text-ink rounded-xl font-black uppercase tracking-widest text-[9px] hover:border-ink transition-all active:scale-95 disabled:opacity-40"
                        >
                            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={() => openRecordModal()}
                            className="col-span-2 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 bg-ink text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:shadow-xl hover:shadow-black/20 transition-all active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>
                </div>
                {savedMsg && <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">{savedMsg}</p>}
                {records.length === 0 ? (
                    <p className="py-6 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">No records for this day</p>
                ) : (
                    <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50/60 border-b border-zinc-100">
                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Date</th>
                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Client</th>
                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Phone</th>
                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Socials</th>
                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Status</th>
                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Notes</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {records.map(r => (
                                        <tr key={r.id} className="group hover:bg-zinc-50/60 transition-colors">
                                            <td className="px-4 py-3 text-[11px] font-bold tabular-nums text-zinc-500 whitespace-nowrap">
                                                {new Date(`${r.record_date}T00:00:00`).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-black text-[12px] text-ink">{r.client_name}</p>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] font-bold tabular-nums text-zinc-500 whitespace-nowrap">{r.phone_number || '—'}</td>
                                            <td className="px-4 py-3 text-[11px] font-bold text-zinc-500 max-w-[10rem] truncate">{r.socials || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border w-fit whitespace-nowrap bg-zinc-100 text-zinc-600 border-zinc-200">
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] font-medium text-zinc-500 min-w-[10rem] max-w-[16rem] whitespace-pre-wrap break-words">{r.notes || '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        title="Edit"
                                                        onClick={() => openRecordModal(r)}
                                                        className="p-1.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-ink hover:text-white transition-all active:scale-90"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        title="Delete"
                                                        onClick={() => deleteRecord(r)}
                                                        className="p-1.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {report && (
                    <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full border font-black uppercase tracking-widest text-[9px] ${AUDIT_STATUS_STYLE[report.status]}`}>
                        {report.status}
                    </span>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={saving || loading || report?.status === 'Reviewed'}
                    className="sm:ml-auto w-full sm:w-auto px-8 py-3.5 bg-ink text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-40"
                >
                    {saving ? 'Submitting...' : report?.status === 'Reviewed' ? 'Reviewed by owner' : 'Submit Audit'}
                </button>
            </div>

            {showExportModal && createPortal(
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowExportModal(false)}
                >
                    <form
                        onSubmit={runExport}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-ink">Export Client Records</h3>
                            <button type="button" title="Close" onClick={() => setShowExportModal(false)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-relaxed">
                            Set the date range of the list you want to export. Export every 1 week.
                        </p>
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">From</span>
                            <input
                                type="date"
                                value={exportFrom}
                                max={exportTo || toInputDate(new Date())}
                                onChange={(e) => setExportFrom(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">To</span>
                            <input
                                type="date"
                                value={exportTo}
                                min={exportFrom || undefined}
                                max={toInputDate(new Date())}
                                onChange={(e) => setExportTo(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        {exportError && (
                            <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">{exportError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={exporting}
                            className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-40"
                        >
                            {exporting ? 'Exporting...' : 'Export CSV'}
                        </button>
                    </form>
                </div>,
                document.body
            )}

            {showRecordModal && createPortal(
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowRecordModal(false)}
                >
                    <form
                        onSubmit={saveRecord}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-4 sm:p-6 space-y-2.5 sm:space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-ink">{editingId ? 'Edit Record' : 'Add Record'}</h3>
                            <button type="button" title="Close" onClick={() => setShowRecordModal(false)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Date</span>
                            <input
                                type="date"
                                value={recDate}
                                max={toInputDate(new Date())}
                                onChange={(e) => setRecDate(e.target.value)}
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Client Name</span>
                            <input
                                autoFocus
                                value={recName}
                                onChange={(e) => setRecName(e.target.value)}
                                placeholder="Name of client"
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Phone Number</span>
                            <input
                                type="tel"
                                inputMode="tel"
                                value={recPhone}
                                onChange={(e) => setRecPhone(e.target.value)}
                                placeholder="09xx-xxx-xxxx"
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Socials</span>
                            <input
                                value={recSocials}
                                onChange={(e) => setRecSocials(e.target.value)}
                                placeholder="Facebook / Instagram / TikTok link or handle"
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Status</span>
                            <input
                                list="record-status-options"
                                value={recStatus}
                                onChange={(e) => setRecStatus(e.target.value)}
                                placeholder="e.g. Pending, Closed"
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-ink"
                            />
                            <datalist id="record-status-options">
                                {RECORD_STATUS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Notes</span>
                            <textarea
                                rows={2}
                                value={recNotes}
                                onChange={(e) => setRecNotes(e.target.value)}
                                placeholder="Optional notes about this client"
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-ink resize-none"
                            />
                        </div>
                        {recError && (
                            <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">{recError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={recSaving}
                            className="w-full py-2.5 sm:py-3.5 bg-ink text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-40"
                        >
                            {recSaving ? 'Saving...' : 'Save'}
                        </button>
                    </form>
                </div>,
                document.body
            )}
        </div>
    );
};
