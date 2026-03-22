import React, { useState, useEffect } from 'react';
import {
    Search,
    Mail,
    Wallet,
    QrCode,
    ExternalLink,
    X,
    Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Worker {
    id: string;
    name: string;
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

    const filteredWorkers = workers.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative flex-1 max-w-lg group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-black transition-colors duration-500" />
                    <input
                        type="text"
                        placeholder="Search workers by name or email..."
                        aria-label="Search workers"
                        className="w-full pl-12 pr-6 py-3.5 bg-white border border-zinc-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all duration-500 shadow-sm placeholder:text-zinc-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Workers Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 bg-white rounded-[2rem] animate-pulse border border-zinc-100" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredWorkers.map((worker) => (
                            <motion.div
                                key={worker.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group relative bg-white border border-zinc-100 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-8 relative">
                                    <div className="flex flex-col gap-4">
                                        <div className="relative w-20 h-20">
                                            {worker.photo_url ? (
                                                <img src={worker.photo_url} className="w-20 h-20 rounded-[1.5rem] object-cover ring-4 ring-zinc-50 transition-all duration-500 group-hover:ring-black/5" alt={worker.name} />
                                            ) : (
                                                <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-50 flex items-center justify-center text-zinc-400 font-bold text-2xl group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-inner">
                                                    {worker.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl tracking-tight text-black leading-none mb-1">{worker.name}</h3>
                                            <div className="flex items-center gap-3 mb-2">
                                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">{worker.role || 'Employee'}</p>
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

                                <div className="space-y-4 relative">
                                    <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                                            <Mail className="w-4 h-4 text-black" />
                                        </div>
                                        <span className="truncate">{worker.email}</span>
                                    </div>
                                    {worker.contact_email && (
                                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-11">
                                            <span className="truncate">{worker.contact_email}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-black/5 transition-colors">
                                            <Wallet className="w-4 h-4 text-black" />
                                        </div>
                                        <span>GCash: {worker.gcash_number || 'Not Set'}</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-zinc-50 flex items-center justify-between">
                                    <div className="flex -space-x-2 relative z-10">
                                        {worker.qr_code_url && (
                                            <button
                                                title="View GCash QR Code"
                                                onClick={() => setSelectedQrCode(worker.qr_code_url)}
                                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-zinc-100 shadow-sm overflow-hidden hover:scale-110 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                                            >
                                                <img src={worker.qr_code_url} alt="QR Code" className="w-full h-full object-cover" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedWorker(worker)}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors flex items-center gap-2 group/btn"
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
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10"
                        >
                            <button
                                title="Close Modal"
                                onClick={() => setSelectedWorker(null)}
                                className="absolute top-8 right-8 p-3 bg-zinc-50 hover:bg-black hover:text-white rounded-2xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col md:flex-row gap-10 items-start">
                                <div className="space-y-6 flex-shrink-0 text-center mx-auto md:mx-0">
                                    <div className="w-48 h-48 rounded-[2rem] bg-zinc-50 border-4 border-zinc-100 overflow-hidden mx-auto shadow-inner relative">
                                        {selectedWorker.photo_url ? (
                                            <img src={selectedWorker.photo_url} className="w-full h-full object-cover" alt={selectedWorker.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-300 font-black text-6xl">
                                                {selectedWorker.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                            <div className={cn("w-3 h-3 rounded-full", selectedWorker.active ? "bg-green-500" : "bg-red-500")} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8 flex-1 w-full">
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter text-black uppercase italic leading-none">{selectedWorker.name}</h2>
                                        <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">{selectedWorker.role}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-4 bg-zinc-50 rounded-2xl flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Mail className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Email Addresses</p>
                                                <p className="font-bold text-sm text-black truncate">{selectedWorker.email}</p>
                                                {selectedWorker.contact_email && (
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 italic">{selectedWorker.contact_email}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-zinc-50 rounded-2xl flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Phone className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contact Number</p>
                                                <p className="font-bold text-sm text-black">{selectedWorker.phone || 'Not Provided'}</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-zinc-50 rounded-2xl flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Wallet className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">GCash Details</p>
                                                <p className="font-bold text-sm text-black">{selectedWorker.gcash_number || 'Not Provided'}</p>
                                            </div>
                                            {selectedWorker.qr_code_url && (
                                                <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm shrink-0">
                                                    <img src={selectedWorker.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Code Scan Modal */}
            <AnimatePresence>
                {selectedQrCode && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setSelectedQrCode(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-10 flex flex-col items-center text-center overflow-hidden"
                        >
                            <div className="absolute top-0 inset-x-0 h-32 bg-zinc-50 border-b border-zinc-100" />

                            <button
                                title="Close Modal"
                                onClick={() => setSelectedQrCode(null)}
                                className="absolute top-6 right-6 p-3 bg-white hover:bg-black hover:text-white rounded-2xl shadow-sm transition-all z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="w-20 h-20 bg-black text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-xl relative z-10">
                                <QrCode className="w-8 h-8" />
                            </div>

                            <div className="relative z-10 mb-8">
                                <h3 className="text-3xl font-black tracking-tighter text-black uppercase italic mb-1">Scan to Pay</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">GCash Transfer</p>
                            </div>

                            <div className="w-full aspect-square bg-zinc-50 rounded-[2.5rem] p-6 border-2 border-dashed border-zinc-200 flex items-center justify-center relative z-10">
                                <img src={selectedQrCode} alt="Scan to Pay" className="w-full h-full object-contain mix-blend-multiply" />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
