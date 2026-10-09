import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AUDIT_STATES = ['Not Yet', 'Audited', 'Needs Review'] as const;
type AuditState = typeof AUDIT_STATES[number];

interface AuditLead {
    id: string;
    client_name: string;
    deal_value: number | null;
    down_payment: number | null;
    commission_rate: number | null;
    payment_status: string | null;
    created_at: string;
    is_audited: string | null;
}

const peso = (n: number) => `₱${Math.round(n).toLocaleString()}`;

const commissionOf = (l: AuditLead) =>
    l.payment_status === 'Downpayment Only' || l.payment_status === 'Cancelled Project'
        ? (Number(l.down_payment) || 0) * 0.1
        : (Number(l.deal_value) || 0) * ((l.commission_rate || 20) / 100);

const stateOf = (l: AuditLead): AuditState =>
    (AUDIT_STATES as readonly string[]).includes(l.is_audited ?? '') ? (l.is_audited as AuditState) : 'Not Yet';

const stateStyle: Record<AuditState, string> = {
    'Not Yet': 'bg-zinc-100 text-zinc-500 border-zinc-200',
    'Audited': 'bg-ink text-white border-ink',
    'Needs Review': 'bg-red-50 text-red-600 border-red-200',
};

/** Owner-side audit panel for one employee account: review their deals and mark each as audited. */
export const WorkerAudit: React.FC<{ workerId: string }> = ({ workerId }) => {
    const [leads, setLeads] = useState<AuditLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'All' | AuditState>('All');
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('leads')
                .select('id, client_name, deal_value, down_payment, commission_rate, payment_status, created_at, is_audited')
                .eq('worker_id', workerId)
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (error) setError(error.message);
            else setLeads(data ?? []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [workerId]);

    const setAudit = async (id: string, value: AuditState) => {
        const previous = leads;
        setSavingId(id);
        setLeads(ls => ls.map(l => (l.id === id ? { ...l, is_audited: value } : l)));
        const { error } = await supabase.from('leads').update({ is_audited: value }).eq('id', id);
        if (error) {
            setLeads(previous);
            setError(error.message);
        } else {
            setError(null);
        }
        setSavingId(null);
    };

    const counts = useMemo(() => {
        const c: Record<AuditState, number> = { 'Not Yet': 0, 'Audited': 0, 'Needs Review': 0 };
        leads.forEach(l => { c[stateOf(l)]++; });
        return c;
    }, [leads]);

    const auditedCommission = useMemo(
        () => leads.filter(l => stateOf(l) === 'Audited').reduce((s, l) => s + commissionOf(l), 0),
        [leads]
    );
    const visible = filter === 'All' ? leads : leads.filter(l => stateOf(l) === filter);

    return (
        <div className="mt-10 pt-8 border-t border-zinc-100 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter text-black uppercase">Audit</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">
                        Review this account&apos;s deals before commission release
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Audited commission</p>
                    <p className="text-xl font-black text-black tabular-nums">{peso(auditedCommission)}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {AUDIT_STATES.map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setFilter(f => (f === s ? 'All' : s))}
                        className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${filter === s ? 'border-ink bg-white shadow-md' : 'border-zinc-100 bg-zinc-50'}`}
                    >
                        <p className="text-xl font-black text-black tabular-nums">{counts[s]}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s}</p>
                    </button>
                ))}
            </div>

            {error && (
                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">
                    {error}
                </p>
            )}

            {loading ? (
                <div className="h-24 bg-zinc-50 rounded-2xl animate-pulse" />
            ) : visible.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {leads.length === 0 ? 'No deals for this account yet.' : 'No deals in this filter.'}
                </p>
            ) : (
                <ul className="space-y-2">
                    {visible.map(l => {
                        const st = stateOf(l);
                        return (
                            <li key={l.id} className="p-3 sm:p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-black truncate">{l.client_name}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                        {new Date(l.created_at).toLocaleDateString()} · {l.payment_status || 'Downpayment Only'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-6 text-[10px]">
                                    <div>
                                        <p className="font-black text-zinc-400 uppercase tracking-widest">Deal</p>
                                        <p className="font-black text-black tabular-nums">{peso(Number(l.deal_value) || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="font-black text-zinc-400 uppercase tracking-widest">Commission</p>
                                        <p className="font-black text-black tabular-nums">{peso(commissionOf(l))}</p>
                                    </div>
                                </div>
                                <select
                                    aria-label={`Audit status for ${l.client_name}`}
                                    value={st}
                                    disabled={savingId === l.id}
                                    onChange={(e) => setAudit(l.id, e.target.value as AuditState)}
                                    className={`h-10 px-4 rounded-full border font-black uppercase tracking-widest text-[9px] outline-none cursor-pointer disabled:opacity-50 ${stateStyle[st]}`}
                                >
                                    {AUDIT_STATES.map(s => <option key={s} value={s} className="bg-white text-black">{s}</option>)}
                                </select>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
