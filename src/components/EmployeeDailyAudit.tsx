import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Trash2, X } from 'lucide-react';
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
    const [history, setHistory] = useState<DailyAuditRow[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [records, setRecords] = useState<AuditRecord[]>([]);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recName, setRecName] = useState('');
    const [recPhone, setRecPhone] = useState('');
    const [recStatus, setRecStatus] = useState('');
    const [recSaving, setRecSaving] = useState(false);
    const [recError, setRecError] = useState<string | null>(null);

    const loadHistory = async () => {
        const { data, error } = await supabase
            .from('daily_audits')
            .select('*')
            .eq('worker_id', workerId)
            .order('audit_date', { ascending: false })
            .limit(30);
        if (error) setError(error.message);
        else setHistory((data as DailyAuditRow[]) || []);
    };

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

    const openRecordModal = () => {
        setRecName('');
        setRecPhone('');
        setRecStatus('');
        setRecError(null);
        setShowRecordModal(true);
    };

    const saveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recName.trim() || !recStatus.trim()) {
            setRecError('Client name and status are required.');
            return;
        }
        setRecSaving(true);
        setRecError(null);
        const { data, error } = await supabase
            .from('audit_records')
            .insert({
                worker_id: workerId,
                record_date: day,
                client_name: recName.trim(),
                phone_number: recPhone.trim() || null,
                status: recStatus.trim(),
            })
            .select('id');
        setRecSaving(false);
        if (error) {
            setRecError(error.message);
            return;
        }
        if (!data || data.length === 0) {
            setRecError('Not saved - you do not have permission to add records.');
            return;
        }
        setShowRecordModal(false);
        loadRecords();
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
        loadHistory();
    }, [workerId]);

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

    const existing = history.find(h => h.audit_date === day) || null;

    // Load the saved notes whenever the chosen day (or its saved report) changes
    useEffect(() => {
        setNotes(existing?.notes || '');
    }, [day, existing?.id]);

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

    const submit = async () => {
        setSaving(true);
        setError(null);
        const { data, error } = await supabase
            .from('daily_audits')
            .upsert(
                {
                    worker_id: workerId,
                    audit_date: day,
                    clients_added: summary.clientsAdded,
                    deals_closed: summary.dealsClosed,
                    total_sales: summary.sales,
                    commission: summary.commission,
                    notes: notes.trim() || null,
                    status: 'Submitted',
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'worker_id,audit_date' }
            )
            .select('id');
        setSaving(false);
        if (error) {
            setError(error.message);
            return;
        }
        if (!data || data.length === 0) {
            setError('Not saved — you do not have permission to submit this report.');
            return;
        }
        loadHistory();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1.5">End of day</p>
                    <h2 className="text-2xl font-black tracking-tighter text-ink uppercase">Daily Audit</h2>
                    <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">
                        Submit your day. The owner reviews it in the Master List.
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
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink">Client Records</h3>
                    <button
                        onClick={openRecordModal}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:shadow-xl hover:shadow-black/20 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Record
                    </button>
                </div>
                {records.length === 0 ? (
                    <p className="py-6 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">No records for this day</p>
                ) : (
                    <ul className="divide-y divide-zinc-50">
                        {records.map(r => (
                            <li key={r.id} className="flex items-center gap-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-black text-ink truncate">{r.client_name}</p>
                                    <p className="text-[10px] font-bold text-zinc-400 tabular-nums">{r.phone_number || 'No phone number'}</p>
                                </div>
                                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{r.status}</span>
                                <button
                                    title="Delete record"
                                    onClick={() => deleteRecord(r)}
                                    className="p-1.5 rounded-lg text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showRecordModal && createPortal(
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowRecordModal(false)}
                >
                    <form
                        onSubmit={saveRecord}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-ink">Add Record</h3>
                            <button type="button" title="Close" onClick={() => setShowRecordModal(false)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Client Name</span>
                            <input
                                autoFocus
                                value={recName}
                                onChange={(e) => setRecName(e.target.value)}
                                placeholder="Name of client"
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Phone Number</span>
                            <input
                                type="tel"
                                inputMode="tel"
                                value={recPhone}
                                onChange={(e) => setRecPhone(e.target.value)}
                                placeholder="09xx-xxx-xxxx"
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold outline-none focus:border-ink"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Status</span>
                            <input
                                list="record-status-options"
                                value={recStatus}
                                onChange={(e) => setRecStatus(e.target.value)}
                                placeholder="e.g. Pending, Closed"
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold outline-none focus:border-ink"
                            />
                            <datalist id="record-status-options">
                                {RECORD_STATUS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>
                        {recError && (
                            <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">{recError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={recSaving}
                            className="w-full py-3.5 bg-ink text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-40"
                        >
                            {recSaving ? 'Saving...' : 'Save'}
                        </button>
                    </form>
                </div>,
                document.body
            )}

            {existing ? (existing.notes ? (
                <div className="bg-white border border-zinc-100 rounded-[1.5rem] shadow-sm p-5 lg:p-6 space-y-3">
                    {existing.notes && (
                        <p className="text-xs font-medium text-zinc-600 leading-relaxed bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 whitespace-pre-wrap">
                            {existing.notes}
                        </p>
                    )}
                </div>
            ) : null) : (
                <div className="bg-white border border-zinc-100 rounded-[1.5rem] shadow-sm p-5 lg:p-6 space-y-4">
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-1">Notes for the owner</span>
                        <textarea
                            rows={3}
                            placeholder="Anything to report today? Follow-ups, problems, client concerns..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium outline-none focus:border-ink transition-all resize-none"
                        />
                    </div>

                    {error && (
                        <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">{error}</p>
                    )}

                    <button
                        onClick={submit}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3.5 bg-ink text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-30"
                    >
                        <ClipboardList className="w-4 h-4" />
                        {saving ? 'Submitting...' : 'Submit Daily Audit'}
                    </button>
                </div>
            )}
        </div>
    );
};
