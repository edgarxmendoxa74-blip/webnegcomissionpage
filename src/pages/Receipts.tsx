import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Download,
    User,
    Calculator,
    CheckCircle2,
    Check,
    Sparkles
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

interface ClosedDeal {
    id: string;
    client_name: string;
    deal_value: number;
    down_payment: number;
    payment_status: string;
    status: string;
    closed_at?: string;
    created_at: string;
    month?: string | null;
}

export const ReceiptsPage: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [amount, setAmount] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);
    const [packagePrice, setPackagePrice] = useState<number>(3499);
    const [showCalculator, setShowCalculator] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [closedDeals, setClosedDeals] = useState<ClosedDeal[]>([]);
    const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
    const [loadingDeals, setLoadingDeals] = useState(false);
    const [includeClientsOnReceipt, setIncludeClientsOnReceipt] = useState(true);
    const receiptRef = useRef<HTMLDivElement>(null);
    // Stable per session so it doesn't change on every keystroke
    const [serial] = useState(() => `WN-${Math.floor(100000 + Math.random() * 900000)}`);

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);

    useEffect(() => {
        if (selectedWorker) {
            setCustomRole(selectedWorker.role);
        }
    }, [selectedWorker]);

    // Fetch closed deals when a worker is selected
    useEffect(() => {
        if (!selectedWorkerId) {
            setClosedDeals([]);
            setSelectedDealIds([]);
            return;
        }

        const fetchWorkerDeals = async () => {
            setLoadingDeals(true);
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('id, client_name, deal_value, down_payment, payment_status, status, closed_at, created_at, month, worker_id, webdev_id')
                    .or(`worker_id.eq.${selectedWorkerId},webdev_id.eq.${selectedWorkerId}`)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching worker deals:', error);
                    return;
                }

                // Only include Fully Paid deals in the receipt list
                const closed = (data || []).filter(l =>
                    l.payment_status === 'Fully Paid'
                );
                setClosedDeals(closed);
                // Default select all closed deals
                setSelectedDealIds(closed.map(d => d.id));
            } catch (err) {
                console.error('Error fetching deals:', err);
            } finally {
                setLoadingDeals(false);
            }
        };

        fetchWorkerDeals();
    }, [selectedWorkerId]);

    const selectedDeals = useMemo(() => {
        return closedDeals.filter(d => selectedDealIds.includes(d.id));
    }, [closedDeals, selectedDealIds]);

    const totalSelectedValue = useMemo(() => {
        return selectedDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0);
    }, [selectedDeals]);

    const toggleDealSelection = (id: string) => {
        setSelectedDealIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleAllDeals = () => {
        if (selectedDealIds.length === closedDeals.length) {
            setSelectedDealIds([]);
        } else {
            setSelectedDealIds(closedDeals.map(d => d.id));
        }
    };

    // Fixed commission: ₱300 per deal if 5499, ₱250 per deal if 3499
    const getFixedCommission = (dealValue: number): number => {
        if (dealValue >= 5499) return 300;
        if (dealValue >= 3499) return 250;
        // Fallback: use worker commission percentage
        const rate = selectedWorker?.commission_percentage ?? 10;
        return dealValue * (rate / 100);
    };

    const handleAutoCalculate = () => {
        const total = selectedDeals.reduce((sum, d) => {
            const val = Number(d.deal_value) > 0 ? Number(d.deal_value) : packagePrice;
            return sum + getFixedCommission(val);
        }, 0);
        const formatted = Number.isInteger(total) ? String(total) : total.toFixed(2);
        setAmount(formatted);
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

                        {/* Closed Deals & Client List */}
                        {selectedWorkerId && (
                            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3 sm:p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            Closed Deals
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                                            {closedDeals.length} {closedDeals.length === 1 ? 'deal' : 'deals'}
                                        </span>
                                    </div>

                                    {closedDeals.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleToggleAllDeals}
                                            className="text-[9px] font-bold text-zinc-500 hover:text-black uppercase tracking-wider transition-colors"
                                        >
                                            {selectedDealIds.length === closedDeals.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>

                                {loadingDeals ? (
                                    <div className="py-4 text-center text-xs text-zinc-400 font-medium animate-pulse flex items-center justify-center gap-2">
                                        <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
                                        <span>Loading closed deals...</span>
                                    </div>
                                ) : closedDeals.length === 0 ? (
                                    <div className="p-3 bg-white border border-dashed border-zinc-200 rounded-xl text-center">
                                        <p className="text-xs font-bold text-zinc-600">No closed deals found</p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5">This member has no closed leads recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Scrollable list of closed client deals */}
                                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                            {closedDeals.map((deal) => {
                                                const isSelected = selectedDealIds.includes(deal.id);
                                                return (
                                                    <div
                                                        key={deal.id}
                                                        onClick={() => toggleDealSelection(deal.id)}
                                                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                                                            isSelected
                                                                ? 'bg-white border-zinc-300 shadow-xs'
                                                                : 'bg-zinc-100/60 border-zinc-200/60 opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                                                isSelected ? 'bg-black border-black text-white' : 'border-zinc-300 bg-white'
                                                            }`}>
                                                                {isSelected && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-black text-xs truncate leading-tight">{deal.client_name}</p>
                                                                <p className="text-[9px] text-zinc-400 font-medium">
                                                                    {deal.closed_at
                                                                        ? new Date(deal.closed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                        : deal.month || 'Closed'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-black text-black text-xs tabular-nums">
                                                                ₱{(Number(deal.deal_value) || 0).toLocaleString()}
                                                            </p>
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                {deal.payment_status || 'Closed'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Summary & Auto-calculate action */}
                                        <div className="pt-2 border-t border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="text-[10px] text-zinc-500 font-medium">
                                                Selected: <span className="font-bold text-black">{selectedDeals.length}</span> deals (₱{totalSelectedValue.toLocaleString()})
                                            </div>
                                            {selectedDeals.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleAutoCalculate}
                                                    className="px-2.5 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <Sparkles className="w-3 h-3 text-amber-300" />
                                                    <span>Auto-Calculate (₱250/₱300 per deal)</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Option to show on receipt */}
                                        <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={includeClientsOnReceipt}
                                                onChange={(e) => setIncludeClientsOnReceipt(e.target.checked)}
                                                className="w-3.5 h-3.5 rounded text-black focus:ring-black accent-black cursor-pointer"
                                            />
                                            <span className="text-[10px] font-bold text-zinc-600">
                                                Include client names on receipt preview & export
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Commission Amount (₱)</span>
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
                                dealsCount={selectedDeals.length > 0 ? selectedDeals.length : 1}
                                currentAmount={amount}
                                onClose={() => setShowCalculator(false)}
                            />
                        )}
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
                                        {selectedDeals.length > 0
                                            ? `Sales commission (${selectedDeals.length} closed ${selectedDeals.length === 1 ? 'deal' : 'deals'})`
                                            : 'Sales commission'}
                                    </span>
                                </div>

                                {/* Closed Clients List on the Actual Receipt */}
                                {includeClientsOnReceipt && selectedDeals.length > 0 && (
                                    <>
                                        <div className="border-t border-dashed border-zinc-300" />
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[8px] leading-none font-black uppercase tracking-[0.25em] text-zinc-400">
                                                    Fully Paid Clients ({selectedDeals.length})
                                                </span>
                                                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                                                    Commission
                                                </span>
                                            </div>
                                            <div className="space-y-1 bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                                                {selectedDeals.map((deal, idx) => (
                                                    <div key={deal.id || idx} className="flex justify-between items-center text-[10px] gap-2">
                                                        <span className="font-bold text-black truncate max-w-[170px]" title={deal.client_name}>
                                                            {idx + 1}. {deal.client_name}
                                                        </span>
                                                        <span className="font-mono font-semibold text-emerald-700 text-[9px] tabular-nums shrink-0">
                                                            ₱{getFixedCommission(Number(deal.deal_value) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
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
