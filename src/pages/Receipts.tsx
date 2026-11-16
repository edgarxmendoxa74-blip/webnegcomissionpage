import React, { useState, useEffect, useRef } from 'react';
import {
    Download,
    User,
    Calculator,
    Plus,
    Trash2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '../lib/supabase';
import { ReceiptCalculator } from '../components/ReceiptCalculator';

interface Worker {
    id: string;
    name: string;
    role: string;
    commission_percentage?: number | null;
}

export const ReceiptsPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [clientNames, setClientNames] = useState<string[]>(['']);
    const [amount, setAmount] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);
    const [packagePrice, setPackagePrice] = useState<number>(3499);
    const [showCalculator, setShowCalculator] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const receiptRef = useRef<HTMLDivElement>(null);
    // Stable per session so it doesn't change on every keystroke
    const [serial] = useState(() => `WN-${Math.floor(100000 + Math.random() * 900000)}`);

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);

    useEffect(() => {
        if (selectedWorker) {
            setCustomRole(selectedWorker.role || '');
        }
    }, [selectedWorker]);

    const handleClientNameChange = (index: number, value: string) => {
        setClientNames(prev => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const handleAddClient = () => {
        setClientNames(prev => [...prev, '']);
    };

    const handleRemoveClient = (index: number) => {
        if (clientNames.length <= 1) {
            setClientNames(['']);
            return;
        }
        setClientNames(prev => prev.filter((_, i) => i !== index));
    };

    const formattedDate = new Date(customDate).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    useEffect(() => {
        const fetchWorkers = async () => {
            const { data } = await supabase
                .from('workers')
                .select('id, name, role, is_owner, commission_percentage')
                .order('name');
            if (data) setWorkers(data.filter(w => !w.is_owner && w.role?.toLowerCase() !== 'owner'));
        };
        const fetchLogo = async () => {
            const { data } = await supabase.from('app_settings').select('logo_url, package_price').eq('id', 1).single();
            if (data?.logo_url) {
                setLogoUrl(data.logo_url);
                setLogoError(false);
            }
            if (data?.package_price) {
                setPackagePrice(Number(data.package_price));
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

    const validClientNames = clientNames.map(n => n.trim()).filter(n => n.length > 0);

    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 animate-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-start">
                {/* Generator Form */}
                <div className="bg-white border border-zinc-100 rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-6 shadow-sm space-y-3 sm:space-y-5">
                    <div className="space-y-2.5 sm:space-y-4">
                        {/* Member Select */}
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

                        {/* Role & Date */}
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

                        {/* Client Name Input */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                    Client Name
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddClient}
                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-black transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Client</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                {clientNames.map((name, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder={clientNames.length > 1 ? `Client #${index + 1} Name` : "Enter client name"}
                                            value={name}
                                            onChange={(e) => handleClientNameChange(index, e.target.value)}
                                            className="flex-1 px-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black font-bold text-xs transition-all"
                                        />
                                        {clientNames.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveClient(index)}
                                                className="p-2 text-zinc-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-zinc-100"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payout Amount (₱) & Calculator */}
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Payout Amount (₱)</span>
                                <button
                                    type="button"
                                    onClick={() => setShowCalculator(prev => !prev)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                                        showCalculator
                                            ? 'bg-black text-white border-black shadow-sm'
                                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200 shadow-xs'
                                    }`}
                                >
                                    <Calculator className="w-3 h-3" />
                                    <span>{showCalculator ? 'Close Calculator' : 'Calculator'}</span>
                                </button>
                            </div>
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

                        {showCalculator && (
                            <ReceiptCalculator
                                onApplyAmount={(calculated) => setAmount(calculated)}
                                initialPrice={packagePrice}
                                workerCommission={selectedWorker?.commission_percentage}
                                workerName={selectedWorker?.name}
                                dealsCount={validClientNames.length > 0 ? validClientNames.length : 1}
                                currentAmount={amount}
                                onClose={() => setShowCalculator(false)}
                            />
                        )}
                    </div>

                    <button
                        disabled={!selectedWorkerId || !amount || Number(amount) <= 0 || isDownloading}
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
                <div className="space-y-2 sm:space-y-4 lg:sticky lg:top-6">
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
                                    <span className="text-[11px] leading-none font-bold text-black text-right">
                                        Sales commission
                                    </span>
                                </div>

                                {/* Client Name on the Receipt */}
                                {validClientNames.length > 0 && (
                                    <>
                                        <div className="border-t border-dashed border-zinc-300" />
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-[8px] leading-none font-black uppercase tracking-[0.25em] text-zinc-400 pt-0.5">
                                                {validClientNames.length > 1 ? 'Clients' : 'Client'}
                                            </span>
                                            <div className="text-right space-y-0.5">
                                                {validClientNames.map((name, idx) => (
                                                    <p key={idx} className="text-[11px] leading-tight font-bold text-black">
                                                        {validClientNames.length > 1 ? `${idx + 1}. ` : ''}{name}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

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
