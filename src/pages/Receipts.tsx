import React, { useState, useEffect, useRef } from 'react';
import {
    Download,
    User
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '../lib/supabase';

interface Worker {
    id: string;
    name: string;
    role: string;
}

export const ReceiptsPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [amount, setAmount] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);

    useEffect(() => {
        if (selectedWorker) {
            setCustomRole(selectedWorker.role);
        }
    }, [selectedWorker]);

    const formattedDate = new Date(customDate).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    useEffect(() => {
        const fetchWorkers = async () => {
            const { data } = await supabase
                .from('workers')
                .select('id, name, role')
                .order('name');
            if (data) setWorkers(data);
        };
        const fetchLogo = async () => {
            const { data } = await supabase.from('app_settings').select('logo_url').eq('id', 1).single();
            if (data?.logo_url) {
                setLogoUrl(data.logo_url);
                setLogoError(false);
            }
        };
        fetchWorkers();
        fetchLogo();

        const channel = supabase
            .channel('receipts_app_settings_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1' },
                (payload) => {
                    if (payload.new.logo_url) {
                        setLogoUrl(payload.new.logo_url);
                        setLogoError(false);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleDownload = async () => {
        if (!receiptRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(receiptRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `receipt-${selectedWorker?.name || 'payout'}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error generating image:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Generator Form */}
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Select Team Member</span>
                            <div className="relative">
                                <select
                                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none font-bold"
                                    value={selectedWorkerId}
                                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                                >
                                    <option value="">-- Choose Member --</option>
                                    {workers.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Role</span>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all font-bold text-sm"
                                    placeholder="Position/Role"
                                    value={customRole}
                                    onChange={(e) => setCustomRole(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</span>
                                <input
                                    type="date"
                                    aria-label="Payment Date"
                                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all font-bold text-sm"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Commission Amount (₱)</span>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-zinc-300">₱</span>
                                <input
                                    type="number"
                                    className="w-full pl-10 pr-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all font-black text-xl"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={!selectedWorkerId || !amount || isDownloading}
                        onClick={handleDownload}
                        className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
                    >
                        {isDownloading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                <span>Export Receipt</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Preview Area */}
                <div className="space-y-6">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-4">Instant Preview</span>

                    <div className="relative">
                        {/* The Actual Receipt for Export */}
                        <div
                            ref={receiptRef}
                            className="bg-white p-12 rounded-[3rem] border border-zinc-100 shadow-2xl space-y-12 overflow-hidden relative"
                            style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}
                        >
                            {/* Watermark/Logo abstraction */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-zinc-50 rounded-full blur-3xl opacity-50" />

                            <div className="flex justify-between items-start relative">
                                <div className="flex flex-col gap-3 min-h-[3rem]">
                                    {!logoError && (
                                        <img
                                            src={logoUrl || "/logo.png"}
                                            alt="WebNegosyo Logo"
                                            className="w-12 h-12 object-contain"
                                            onError={() => setLogoError(true)}
                                        />
                                    )}
                                    <div>
                                        <h3 className="text-xl font-black tracking-tighter text-black italic">WEBNEGOSYO</h3>
                                        <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Management Suite</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Serial No.</div>
                                    <div className="text-sm font-black text-black">#WN-{Math.floor(100000 + Math.random() * 900000)}</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="border-l-4 border-black pl-6 py-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Payable To</p>
                                    <h4 className="text-2xl font-black text-black">{selectedWorker?.name || 'Member Name'}</h4>
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{customRole || 'Developer/Agent'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Payment Date</p>
                                        <p className="text-sm font-bold text-black">{formattedDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <p className="text-sm font-black text-black uppercase tracking-widest">Paid</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-50 rounded-[2rem] p-8 space-y-4">
                                <div className="h-px bg-zinc-200/50" />
                                <div className="flex justify-between items-center pt-4">
                                    <span className="text-xs font-black uppercase tracking-widest text-black">Total Payout</span>
                                    <span className="text-2xl font-black text-black tracking-tighter">₱{Number(amount).toLocaleString() || '0.00'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
