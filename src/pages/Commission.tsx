import React, { useState, useEffect } from 'react';
import { Percent, Save, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Worker {
    id: string;
    name: string;
    role: string | null;
    photo_url: string | null;
    commission_percentage: number | null;
    is_owner?: boolean;
}

const digitsOnly = (v: string) => v.replace(/[^0-9.]/g, '');

export const CommissionPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [packagePrice, setPackagePrice] = useState('');
    const [savedPrice, setSavedPrice] = useState('3499');
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [priceState, setPriceState] = useState<'idle' | 'saving' | 'saved'>('idle');

    const fetchData = async () => {
        try {
            const [w, a] = await Promise.all([
                supabase.from('workers').select('id, name, role, photo_url, commission_percentage, is_owner').order('name'),
                supabase.from('app_settings').select('package_price').eq('id', 1).maybeSingle(),
            ]);
            if (w.error) throw w.error;
            if (a.error) {
                console.error('app_settings error:', a.error);
                setSettingsError(a.error.message);
            } else if (a.data?.package_price != null) {
                setSavedPrice(String(a.data.package_price));
            }
            setWorkers((w.data || []).filter(x => !x.is_owner && x.role?.toLowerCase() !== 'owner'));
        } catch (err) {
            console.error('Error fetching commission data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const savePackagePrice = async () => {
        const price = Number(packagePrice);
        if (packagePrice === '' || isNaN(price) || price < 0) {
            alert('Enter a valid package price.');
            return;
        }
        setPriceState('saving');
        try {
            const { data, error } = await supabase.from('app_settings').upsert({ id: 1, package_price: price }).select('id');
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Not saved — no permission to update settings.');
            setSavedPrice(String(price));
            setPackagePrice('');
            setPriceState('saved');
            setTimeout(() => setPriceState('idle'), 2000);
        } catch (err: any) {
            setPriceState('idle');
            alert(`Failed to save: ${err?.message || 'Unknown error'}`);
        }
    };

    const rateOf = (w: Worker) => Number(w.commission_percentage ?? 10);

    const saveRow = async (w: Worker) => {
        const pctStr = drafts[w.id] || String(rateOf(w));
        const pct = Number(pctStr);
        const role = (roleEdits[w.id] ?? w.role ?? '').trim();
        if (pctStr === '' || isNaN(pct) || pct < 0 || pct > 100) {
            alert('Enter a percentage between 0 and 100.');
            return;
        }
        if (!role) {
            alert('Role cannot be empty.');
            return;
        }
        setSavingId(w.id);
        try {
            const { data, error } = await supabase.from('workers').update({ commission_percentage: pct, role }).eq('id', w.id).select('id');
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Not saved — no permission to update this person (check workers RLS policy).');
            setWorkers(prev => prev.map(x => (x.id === w.id ? { ...x, commission_percentage: pct, role } : x)));
            setDrafts(prev => { const n = { ...prev }; delete n[w.id]; return n; });
            setRoleEdits(prev => { const n = { ...prev }; delete n[w.id]; return n; });
            setSavedId(w.id);
            setTimeout(() => setSavedId(null), 2000);
        } catch (err: any) {
            alert(`Failed to save: ${err?.message || 'Unknown error'}`);
        } finally {
            setSavingId(null);
        }
    };

    const deleteWorker = async (w: Worker) => {
        if (!confirm(`Delete ${w.name}? This removes their profile and unbinds their deals.`)) return;
        try {
            await supabase.from('leads').update({ worker_id: null }).eq('worker_id', w.id);
            await supabase.from('leads').update({ webdev_id: null }).eq('webdev_id', w.id);
            await supabase.from('client_storage').update({ worker_id: null }).eq('worker_id', w.id);
            await supabase.from('client_storage').update({ assigned_webdev_id: null }).eq('assigned_webdev_id', w.id);
            const { error } = await supabase.from('workers').delete().eq('id', w.id);
            if (error) throw error;
            setWorkers(prev => prev.filter(x => x.id !== w.id));
        } catch (err: any) {
            alert(`Failed to delete person: ${err?.message || 'Unknown error'}`);
        }
    };

    const livePrice = packagePrice !== '' ? Number(packagePrice) || 0 : Number(savedPrice) || 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div>
                <h1 className="text-lg font-black tracking-tight text-black uppercase">Commission</h1>
                <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                    New sign-ups appear here automatically. Set each employee's role and commission %. Employees only see their commission once a project is fully paid.
                </p>
            </div>

            {/* Package price */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Package Price</p>
                    <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest mt-0.5">Default package amount when employees add a client</p>
                    {settingsError && (
                        <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest mt-1">
                            Settings error: {settingsError}. Run the package_price migration in Supabase.
                        </p>
                    )}
                </div>
                <div className="relative w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-300">₱</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        title="Package price"
                        placeholder={savedPrice}
                        value={packagePrice}
                        onChange={(e) => setPackagePrice(digitsOnly(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-black outline-none focus:border-black tabular-nums"
                    />
                </div>
                <button
                    onClick={savePackagePrice}
                    disabled={priceState === 'saving' || packagePrice === ''}
                    className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                >
                    {priceState === 'saved' ? 'Saved' : priceState === 'saving' ? 'Saving...' : 'Save'}
                </button>
            </div>


            {/* Per employee */}
            <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Employee</th>
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Role</th>
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Commission %</th>
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-green-600 text-right">Overall Commission</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">Loading...</td></tr>
                            ) : workers.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">No team members yet</td></tr>
                            ) : workers.map(w => {
                                const rate = rateOf(w);
                                const draft = drafts[w.id];
                                const roleDraft = roleEdits[w.id];
                                // Live: typed price / % apply immediately, falling back to the saved values
                                const liveRate = draft ? Math.min(Number(draft) || 0, 100) : rate;
                                const total = livePrice * liveRate / 100;
                                const dirty = (!!draft && draft !== String(rate)) || (roleDraft !== undefined && roleDraft.trim() !== (w.role || ''));
                                return (
                                    <tr key={w.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-[10px] font-black overflow-hidden">
                                                    {w.photo_url ? <img src={w.photo_url} alt="" className="w-full h-full object-cover" /> : w.name?.charAt(0)}
                                                </div>
                                                <span className="text-[11px] font-black text-black">{w.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <input
                                                type="text"
                                                title="Role"
                                                placeholder="Role"
                                                value={roleDraft ?? w.role ?? ''}
                                                onChange={(e) => setRoleEdits(prev => ({ ...prev, [w.id]: e.target.value }))}
                                                className="w-32 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none focus:border-black"
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="relative w-20">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    title="Commission percentage"
                                                    placeholder={String(rate)}
                                                    value={draft ?? ''}
                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [w.id]: digitsOnly(e.target.value) }))}
                                                    className="w-full pl-2.5 pr-6 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-black outline-none focus:border-black"
                                                />
                                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-300" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">
                                            <p className="text-[11px] font-black text-green-600">₱{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                        </td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            {savedId === w.id ? (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                                                    <CheckCircle2 className="w-3 h-3" /> Saved
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => saveRow(w)}
                                                    disabled={!dirty || savingId === w.id}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                                                >
                                                    <Save className="w-3 h-3" /> Save
                                                </button>
                                            )}
                                            <button
                                                title="Delete person"
                                                onClick={() => deleteWorker(w)}
                                                className="ml-1.5 p-1.5 rounded-lg text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors align-middle"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
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
};
