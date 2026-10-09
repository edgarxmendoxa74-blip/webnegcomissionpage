import React, { useState, useEffect } from 'react';
import {
    Search,
    Mail,
    Wallet,
    QrCode,
    ExternalLink,
    X,
    Phone,
    User,
    Key,
    Trash2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { WorkerAudit } from '../components/WorkerAudit';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Worker {
    id: string;
    name: string;
    is_owner?: boolean;
    email: string;
    phone: string;
    role: string;
    gcash_number: string;
    qr_code_url: string;
    photo_url: string;
    contact_email?: string;
    commission_percentage: number;
    active: boolean;
    created_at: string;
}

export const WorkersPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('workers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWorkers(data || []);
        } catch (err) {
            console.error('Error fetching workers:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('workers')
                .update({ active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchWorkers();
        } catch (err) {
            console.error('Error toggling worker status:', err);
        }
    };

    const deleteAccount = async (w: Worker) => {
        if (!confirm(`Permanently delete the account of ${w.name}?\n\nTheir deals stay in the Master List but are unlinked from them. This cannot be undone.`)) return;
        setDeletingId(w.id);
        try {
            await supabase.from('leads').update({ worker_id: null }).eq('worker_id', w.id);
            await supabase.from('leads').update({ webdev_id: null }).eq('webdev_id', w.id);
            await supabase.from('client_storage').update({ worker_id: null }).eq('worker_id', w.id);
            await supabase.from('client_storage').update({ assigned_webdev_id: null }).eq('assigned_webdev_id', w.id);
            const { data, error } = await supabase.from('workers').delete().eq('id', w.id).select('id');
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Not deleted - no permission to remove this account.');
            setWorkers(prev => prev.filter(x => x.id !== w.id));
            setSelectedWorker(prev => (prev?.id === w.id ? null : prev));
        } catch (err: any) {
            alert(`Failed to delete account: ${err?.message || 'Unknown error'}`);
        } finally {
            setDeletingId(null);
        }
    };

    const filteredWorkers = workers.filter(w =>
        !w.is_owner &&
        w.role?.toLowerCase() !== 'owner' &&
        (w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         w.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-700">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative flex-1 max-w-lg group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors duration-500" />
                    <input
                        type="text"
                        placeholder="Search workers by name or email..."
                        aria-label="Search workers"
                        className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all duration-500 shadow-sm placeholder:text-zinc-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Workers Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-44 bg-white rounded-2xl animate-pulse border border-zinc-100" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    <AnimatePresence mode="popLayout">
                        {filteredWorkers.map((worker) => (
                            <motion.div
                                key={worker.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group relative bg-white border border-zinc-100 rounded-2xl p-4 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-3 relative">
                                    <div className="flex flex-col gap-2">
                                        <div className="relative w-12 h-12">
                                            {worker.photo_url ? (
                                                <img src={worker.photo_url} className="w-12 h-12 rounded-xl object-cover ring-2 ring-zinc-50 transition-all duration-500 group-hover:ring-black/5" alt={worker.name} />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 font-bold text-base group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-inner">
                                                    {worker.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-sm tracking-tight text-black leading-none mb-1">{worker.name}</h3>
                                            <div className="flex items-center gap-3 mb-2">
                                                <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.2em]">{worker.role || 'Employee'}</p>
                                                <span className="w-1 h-1 rounded-full bg-zinc-200" />
                                                <button
                                                    onClick={() => toggleActiveStatus(worker.id, worker.active)}
                                                    className={cn(
                                                        "text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border transition-all active:scale-95",
                                                        worker.active
                                                            ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100"
                                                            : "bg-red-50 text-red-500 border-red-100 hover:bg-red-100"
                                                    )}
                                                >
                                                    {worker.active ? 'Active' : 'Inactive'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                        <div className="w-6 h-6 rounded-md bg-zinc-50 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                                            <User className="w-3 h-3 text-black" />
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest leading-none">Login Username</p>
                                            <span className="font-bold text-black text-[10px]">{worker.email?.split('@')[0]}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-zinc-500 font-medium pr-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-md bg-zinc-50 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                                                <Key className="w-3 h-3 text-black" />
                                            </div>
                                            <div>
                                                <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest leading-none">Password</p>
                                                <span className="font-bold text-black text-[10px] font-mono">
                                                    Set by employee (private)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {worker.contact_email && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                            <div className="w-6 h-6 rounded-md bg-zinc-50 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                                                <Mail className="w-3 h-3 text-black" />
                                            </div>
                                            <span className="truncate">{worker.contact_email}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                        <div className="w-6 h-6 rounded-md bg-zinc-50 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                                            <Wallet className="w-3 h-3 text-black" />
                                        </div>
                                        <span>GCash: {worker.gcash_number || 'Not Set'}</span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center justify-between gap-2">
                                    {worker.qr_code_url ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedQrCode(worker.qr_code_url)}
                                            className="px-2.5 py-1.5 bg-zinc-50 hover:bg-black hover:text-white text-zinc-600 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 border border-zinc-100 shadow-sm active:scale-95"
                                        >
                                            <QrCode className="w-3 h-3" />
                                            <span>View QR Code</span>
                                        </button>
                                    ) : (
                                        <div className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">No QR Code</div>
                                    )}
                                    <button
                                        type="button"
                                        title="Delete account"
                                        disabled={deletingId === worker.id}
                                        onClick={() => deleteAccount(worker)}
                                        className="p-1.5 rounded-lg text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedWorker(worker)}
                                        className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors flex items-center gap-2 group/btn"
                                    >
                                        View Profile
                                        <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
            {/* View Profile modal (portal so it centers on the screen, not inside the animated page) */}
            {createPortal(
                <AnimatePresence>
                    {selectedWorker && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setSelectedWorker(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
                            >
                                <button
                                    title="Close"
                                    onClick={() => setSelectedWorker(null)}
                                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Header */}
                                <div className="flex flex-col items-center text-center px-6 pt-8 pb-5 bg-zinc-50/70 border-b border-zinc-100 rounded-t-3xl">
                                    <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-sm relative">
                                        {selectedWorker.photo_url ? (
                                            <img src={selectedWorker.photo_url} className="w-full h-full object-cover" alt={selectedWorker.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-300 font-black text-3xl">
                                                {selectedWorker.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
                                            <div className={cn("w-2 h-2 rounded-full", selectedWorker.active ? "bg-green-500" : "bg-red-500")} />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-black tracking-tighter text-black uppercase leading-tight mt-3">{selectedWorker.name}</h2>
                                    <span className="mt-1.5 px-3 py-1 rounded-full bg-black text-white text-[8px] font-black uppercase tracking-[0.2em]">{selectedWorker.role}</span>
                                </div>

                                {/* Details */}
                                <div className="p-5 space-y-2">
                                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                                        <div className="w-8 h-8 shrink-0 bg-white rounded-lg flex items-center justify-center shadow-sm"><User className="w-4 h-4 text-zinc-400" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Login Username</p>
                                            <p className="font-black text-xs text-black truncate">{selectedWorker.email?.split('@')[0]}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                                        <div className="w-8 h-8 shrink-0 bg-white rounded-lg flex items-center justify-center shadow-sm"><Key className="w-4 h-4 text-zinc-400" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Password</p>
                                            <p className="font-bold text-xs text-black">Set by the employee (private)</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                                        <div className="w-8 h-8 shrink-0 bg-white rounded-lg flex items-center justify-center shadow-sm"><Mail className="w-4 h-4 text-zinc-400" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Contact Email</p>
                                            <p className="font-bold text-xs text-black truncate">{selectedWorker.contact_email || '—'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                                        <div className="w-8 h-8 shrink-0 bg-white rounded-lg flex items-center justify-center shadow-sm"><Phone className="w-4 h-4 text-zinc-400" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Contact Number</p>
                                            <p className="font-bold text-xs text-black">{selectedWorker.phone || 'Not Provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                                        <div className="w-8 h-8 shrink-0 bg-white rounded-lg flex items-center justify-center shadow-sm"><Wallet className="w-4 h-4 text-zinc-400" /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">GCash</p>
                                            <p className="font-bold text-xs text-black">{selectedWorker.gcash_number || 'Not Provided'}</p>
                                        </div>
                                        {selectedWorker.qr_code_url && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedQrCode(selectedWorker.qr_code_url)}
                                                className="px-3 py-1.5 bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                                            >
                                                <QrCode className="w-3 h-3" />
                                                View QR
                                            </button>
                                        )}
                                    </div>

                                    <WorkerAudit workerId={selectedWorker.id} />

                                    <button
                                        type="button"
                                        disabled={deletingId === selectedWorker.id}
                                        onClick={() => deleteAccount(selectedWorker)}
                                        className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {deletingId === selectedWorker.id ? 'Deleting...' : 'Delete Account'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* QR Code Scan Modal (portal so it centers on the screen, not inside the animated page) */}
            {createPortal(
                <AnimatePresence>
                    {selectedQrCode && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setSelectedQrCode(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-[17rem] bg-white rounded-3xl shadow-2xl p-5 flex flex-col items-center text-center"
                            >
                                <button
                                    title="Close"
                                    onClick={() => setSelectedQrCode(null)}
                                    className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <h3 className="text-base font-black tracking-tighter text-black uppercase italic">Scan to Pay</h3>
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-0.5 mb-4">GCash Transfer</p>

                                <div className="w-full aspect-square bg-white rounded-2xl p-3 border border-zinc-200 flex items-center justify-center">
                                    <img src={selectedQrCode} alt="Scan to Pay" className="w-full h-full object-contain" />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
