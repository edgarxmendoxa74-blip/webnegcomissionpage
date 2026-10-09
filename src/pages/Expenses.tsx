import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Expense {
    id: string;
    expense_date: string;
    category: string;
    description: string | null;
    amount: number;
}


const peso = (n: number) => `₱${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const digitsOnly = (v: string) => v.replace(/[^0-9.]/g, '');
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ExpensesPage: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [date, setDate] = useState(today());
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(today().slice(0, 7)); // yyyy-mm, '' = all

    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from('expenses')
            .select('id, expense_date, category, description, amount')
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) setLoadError(error.message);
        else { setExpenses(data || []); setLoadError(null); }
        setLoading(false);
    };

    useEffect(() => { fetchExpenses(); }, []);

    const addExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(amount);
        if (amount === '' || isNaN(value) || value <= 0) {
            alert('Enter a valid amount.');
            return;
        }
        setSaving(true);
        const { data, error } = await supabase
            .from('expenses')
            .insert({ expense_date: date, category: category.trim() || 'Other', description: description.trim() || null, amount: value })
            .select('id, expense_date, category, description, amount')
            .single();
        setSaving(false);
        if (error || !data) {
            alert(`Failed to save: ${error?.message || 'Unknown error'}`);
            return;
        }
        setExpenses(prev => [data, ...prev].sort((a, b) => b.expense_date.localeCompare(a.expense_date)));
        setDescription('');
        setAmount('');
    };

    const removeExpense = async (x: Expense) => {
        if (!confirm(`Delete ${peso(x.amount)} — ${x.description || x.category}?`)) return;
        const { error } = await supabase.from('expenses').delete().eq('id', x.id);
        if (error) { alert(`Failed to delete: ${error.message}`); return; }
        setExpenses(prev => prev.filter(e => e.id !== x.id));
    };

    const visible = useMemo(() => (month ? expenses.filter(x => x.expense_date.startsWith(month)) : expenses), [expenses, month]);
    const total = visible.reduce((s, x) => s + Number(x.amount), 0);
    const byCategory = useMemo(() => {
        const m = new Map<string, number>();
        visible.forEach(x => m.set(x.category, (m.get(x.category) || 0) + Number(x.amount)));
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [visible]);

    const inputCls = 'w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] font-bold outline-none focus:border-black';
    const labelCls = 'block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1';

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div>
                <h1 className="text-lg font-black tracking-tight text-black uppercase">Expenses</h1>
                <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                    Record everything spent to run the business.
                </p>
            </div>

            {loadError && (
                <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest">
                    {loadError} — run supabase/migrations/20260411000000_create_expenses.sql in the Supabase SQL editor.
                </p>
            )}

            <form onSubmit={addExpense} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm grid grid-cols-2 lg:grid-cols-[9rem_12rem_1fr_9rem_auto] gap-3 items-end">
                <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Category</label>
                    <input type="text" placeholder="e.g. Ads, Hosting" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2 lg:col-span-1">
                    <label className={labelCls}>Description</label>
                    <input type="text" placeholder="e.g. Facebook ads for October" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-300">₱</span>
                        <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(digitsOnly(e.target.value))} className={`${inputCls} pl-7 tabular-nums`} />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Add'}
                </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <input type="month" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black outline-none focus:border-black" />
                    {month && (
                        <button onClick={() => setMonth('')} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-black">Show all</button>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Total expenses</p>
                    <p className="text-xl font-black text-red-600 tabular-nums">{peso(total)}</p>
                </div>
            </div>

            {byCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {byCategory.map(([c, v]) => (
                        <div key={c} className="px-3 py-2 bg-white border border-zinc-100 rounded-xl shadow-sm">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{c}</p>
                            <p className="text-[12px] font-black text-black tabular-nums">{peso(v)}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Date</th>
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Category</th>
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Description</th>
                                <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Amount</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">Loading...</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">No expenses recorded</td></tr>
                            ) : visible.map(x => (
                                <tr key={x.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 whitespace-nowrap">
                                        {new Date(`${x.expense_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-2.5 text-[10px] font-black text-black uppercase tracking-widest whitespace-nowrap">{x.category}</td>
                                    <td className="px-4 py-2.5 text-[11px] font-bold text-zinc-600">{x.description || '—'}</td>
                                    <td className="px-4 py-2.5 text-right text-[11px] font-black text-red-600 tabular-nums">{peso(x.amount)}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button title="Delete" onClick={() => removeExpense(x)} className="p-1.5 rounded-lg text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
