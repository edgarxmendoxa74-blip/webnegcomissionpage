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
    // Stable per session so it doesn't change on every keystroke
    const [serial] = useState(() => `WN-${Math.floor(100000 + Math.random() * 900000)}`);

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
                .select('id, name, role, is_owner')
                .order('name');
            if (data) setWorkers(data.filter(w => !w.is_owner && w.role?.toLowerCase() !== 'owner'));
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
            const node = receiptRef.current;
            const width = 340;
            // Fixed width and a transparent-safe white background so the saved image matches the preview on any screen.
            const dataUrl = await toPng(node, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#ffffff',
                width,
                height: node.offsetHeight,
                style: { width: `${width}px`, maxWidth: 'none', margin: '0', zoom: '1', borderRadius: '0', boxShadow: 'none', border: 'none' },
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
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 animate-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-start">
                {/* Generator Form */}
                <div className="bg-white border border-zinc-100 rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-6 shadow-sm space-y-3 sm:space-y-5">
                    <div className="space-y-2.5 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Select Team Member</span>
                            <div className="relative">
                                <select
                                    className="w-full px-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none font-bold"
                                    value={selectedWorkerId}
                                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                                >
                                    <option value="">-- Choose Member --</option>
                                    {workers.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <User className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                            <div className="space-y-1 sm:space-y-2">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Role</span>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all font-bold text-xs"
                                    placeholder="Position/Role"
                                    value={customRole}
                                    onChange={(e) => setCustomRole(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 sm:space-y-2">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Date</span>
                                <input
                                    type="date"
                                    aria-label="Payment Date"
                                    className="w-full px-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all font-bold text-xs"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Commission Amount (₱)</span>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-zinc-300">₱</span>
                                <input
                                    type="number"
                                    className="w-full pl-8 pr-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all font-black text-base"
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
                        className="w-full py-2.5 sm:py-3 bg-black text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:shadow-2xl hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
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
                <div className="space-y-2 sm:space-y-4">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest px-2 sm:px-4">Instant Preview</span>

                    <div className="relative [zoom:0.8] sm:[zoom:1]">
                        {/* The Actual Receipt for Export */}
                        <div
                            ref={receiptRef}
                            className="bg-white rounded-2xl border border-zinc-200 shadow-lg overflow-hidden"
                            style={{ width: '340px', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}
                        >
                            {/* Header */}
                            <div className="bg-white text-black px-6 pt-6 pb-5 border-b border-dashed border-zinc-300">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {!logoError && (
                                            <img
                                                src={logoUrl || `${import.meta.env.BASE_URL}logo-mark.png`}
                                                alt="WebNegosyo Logo"
                                                crossOrigin="anonymous"
                                                className="w-9 h-9 object-contain"
                                                onError={() => setLogoError(true)}
                                            />
                                        )}
                                        <div>
                                            <h3 className="text-base font-black tracking-tight italic leading-none">WEBNEGOSYO</h3>
                                            <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.25em] mt-1.5">Commission Payout</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-end justify-between">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-400">Receipt No.</p>
                                        <p className="text-xs font-black tracking-wider tabular-nums mt-0.5">{serial}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-green-50 border border-green-200">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        <span className="text-[8px] leading-none font-black uppercase tracking-[0.2em] text-green-600" style={{ marginRight: '-0.2em' }}>Paid</span>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-400">Payable To</p>
                                    <h4 className="text-lg font-black text-black tracking-tight leading-tight mt-1">{selectedWorker?.name || 'Member Name'}</h4>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{customRole || 'Developer/Agent'}</p>
                                </div>

                                <div className="border-t border-dashed border-zinc-300" />

                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-[8px] leading-none font-black uppercase tracking-[0.25em] text-zinc-400">Payment Date</span>
                                    <span className="text-[11px] leading-none font-bold text-black text-right">{formattedDate}</span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-[8px] leading-none font-black uppercase tracking-[0.25em] text-zinc-400">Description</span>
                                    <span className="text-[11px] leading-none font-bold text-black text-right">Sales commission</span>
                                </div>

                                <div className="border-t border-dashed border-zinc-300" />

                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-[9px] leading-none font-black uppercase tracking-[0.25em] text-black">Total Payout</span>
                                    <span className="text-2xl font-black text-black tracking-tighter tabular-nums leading-none">
                                        ₱{(Number(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-3 text-center">
                                <p className="text-[8px] leading-none font-black uppercase tracking-[0.3em] text-zinc-400" style={{ paddingLeft: '0.3em' }}>Thank you for your hard work</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
