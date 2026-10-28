import React, { useState, useEffect, useMemo } from 'react';
import {
    Calculator as CalcIcon,
    Percent,
    Delete,
    Equal,
    Check,
    Plus,
    Minus,
    Sparkles,
    X,
    ArrowDownToLine
} from 'lucide-react';

interface ReceiptCalculatorProps {
    onApplyAmount: (amount: string) => void;
    initialPrice?: number;
    workerCommission?: number | null;
    workerName?: string;
    currentAmount?: string;
    dealsCount?: number;
    onClose?: () => void;
}

const evaluateExpression = (expr: string): number | null => {
    try {
        const sanitized = expr
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/,/g, '');

        // Strictly allow numbers and basic math operators
        if (!/^[0-9+\-*/().%\s]+$/.test(sanitized)) {
            return null;
        }

        // Handle trailing percent or percent after numbers: 500 * 10% -> 500 * (10/100)
        const withPercentages = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new Function(`'use strict'; return (${withPercentages});`);
        const result = fn();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return result;
        }
        return null;
    } catch {
        return null;
    }
};

export const ReceiptCalculator: React.FC<ReceiptCalculatorProps> = ({
    onApplyAmount,
    initialPrice = 3499,
    workerCommission,
    workerName,
    currentAmount = '',
    dealsCount,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'commission' | 'standard'>('commission');

    // Commission helper state
    const [dealPrice, setDealPrice] = useState<string>(String(initialPrice || 3499));
    const [dealCount, setDealCount] = useState<number>(dealsCount && dealsCount > 0 ? dealsCount : 1);
    const [ratePercent, setRatePercent] = useState<string>(
        workerCommission !== undefined && workerCommission !== null
            ? String(workerCommission)
            : '10'
    );
    const [bonusAmount, setBonusAmount] = useState<string>('0');
    const [deductionAmount, setDeductionAmount] = useState<string>('0');

    // Standard keypad state
    const [expression, setExpression] = useState<string>(currentAmount && !isNaN(Number(currentAmount)) ? currentAmount : '');
    const [appliedSuccess, setAppliedSuccess] = useState(false);

    // Sync dealsCount when it changes
    useEffect(() => {
        if (dealsCount !== undefined && dealsCount > 0) {
            setDealCount(dealsCount);
        }
    }, [dealsCount]);

    // Update defaults when worker commission or package price changes
    useEffect(() => {
        if (workerCommission !== undefined && workerCommission !== null) {
            setRatePercent(String(workerCommission));
        }
    }, [workerCommission]);

    useEffect(() => {
        if (initialPrice) {
            setDealPrice(String(initialPrice));
        }
    }, [initialPrice]);

    // Live calculations for Commission Mode
    const parsedDealPrice = Math.max(0, Number(dealPrice) || 0);
    const parsedRate = Math.max(0, Number(ratePercent) || 0);
    const parsedBonus = Math.max(0, Number(bonusAmount) || 0);
    const parsedDeduction = Math.max(0, Number(deductionAmount) || 0);

    const grossTotal = dealCount * parsedDealPrice;
    const baseCommission = grossTotal * (parsedRate / 100);
    const netCommission = Math.max(0, baseCommission + parsedBonus - parsedDeduction);

    // Standard mode live evaluation
    const evaluatedKeypadResult = useMemo(() => {
        if (!expression.trim()) return null;
        return evaluateExpression(expression);
    }, [expression]);

    const handleApply = (value: number) => {
        // Format to up to 2 decimal places, trimming trailing zeros if clean integer
        const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
        onApplyAmount(formatted);
        setAppliedSuccess(true);
        setTimeout(() => setAppliedSuccess(false), 2000);
    };

    // Keypad actions
    const handleKeypadPress = (val: string) => {
        if (val === 'C') {
            setExpression('');
            return;
        }
        if (val === 'BACK') {
            setExpression(prev => prev.slice(0, -1));
            return;
        }
        if (val === '=') {
            const res = evaluateExpression(expression);
            if (res !== null) {
                const formatted = Number.isInteger(res) ? String(res) : res.toFixed(2);
                setExpression(formatted);
            }
            return;
        }

        // Append operator or digit
        setExpression(prev => {
            const lastChar = prev.slice(-1);
            const operators = ['+', '-', '×', '÷', '%'];

            // Prevent double operators
            if (operators.includes(val) && operators.includes(lastChar)) {
                return prev.slice(0, -1) + val;
            }
            // Prevent multiple decimals in the same number segment
            if (val === '.') {
                const segments = prev.split(/[+\-×÷%]/);
                const currentSegment = segments[segments.length - 1];
                if (currentSegment.includes('.')) return prev;
            }
            return prev + val;
        });
    };

    const quickPercents = [5, 10, 15, 20, 25, 30, 50];

    return (
        <div className="bg-zinc-900 text-white rounded-2xl p-4 sm:p-5 border border-zinc-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header with Title and Mode Switcher */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
                        <CalcIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Receipt Calculator</h4>
                        <p className="text-[9px] text-zinc-400 font-medium">
                            {workerName ? `For: ${workerName}` : 'Compute payout amount'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            title="Close Calculator"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-800/80 rounded-xl text-[10px] font-black uppercase tracking-wider">
                <button
                    type="button"
                    onClick={() => setActiveTab('commission')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'commission'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Commission Rate</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('standard')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'standard'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    <CalcIcon className="w-3.5 h-3.5" />
                    <span>Keypad Math</span>
                </button>
            </div>

            {/* Tab 1: Commission Helper */}
            {activeTab === 'commission' && (
                <div className="space-y-3.5 text-xs">
                    {/* Deals count & Package Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                Number of Deals
                            </span>
                            <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setDealCount(prev => Math.max(1, prev - 1))}
                                    className="px-3 py-2 text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    value={dealCount}
                                    onChange={(e) => setDealCount(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full text-center bg-transparent py-2 font-black text-sm text-white outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setDealCount(prev => prev + 1)}
                                    className="px-3 py-2 text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                Deal Price (₱)
                            </span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-xs">₱</span>
                                <input
                                    type="number"
                                    value={dealPrice}
                                    onChange={(e) => setDealPrice(e.target.value)}
                                    placeholder="3499"
                                    className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl font-bold text-sm text-white outline-none focus:border-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Commission Rate % */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                Commission Rate (%)
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400">
                                {workerCommission ? `Worker rate: ${workerCommission}%` : 'Standard: 10%'}
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={ratePercent}
                                onChange={(e) => setRatePercent(e.target.value)}
                                placeholder="10"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl font-bold text-sm text-white outline-none focus:border-white transition-all pr-8"
                            />
                            <Percent className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* Quick Rate Pills */}
                        <div className="flex flex-wrap gap-1 pt-1">
                            {quickPercents.map(pct => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setRatePercent(String(pct))}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                        Number(ratePercent) === pct
                                            ? 'bg-white text-black'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    }`}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Bonus & Deduction */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                                + Bonus (₱)
                            </span>
                            <input
                                type="number"
                                value={bonusAmount}
                                onChange={(e) => setBonusAmount(e.target.value)}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
                                - Deduction (₱)
                            </span>
                            <input
                                type="number"
                                value={deductionAmount}
                                onChange={(e) => setDeductionAmount(e.target.value)}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-xs font-bold text-rose-300 outline-none focus:border-rose-500"
                            />
                        </div>
                    </div>

                    {/* Calculation Summary Card */}
                    <div className="p-3 bg-zinc-800/90 rounded-xl border border-zinc-700/80 space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Gross Sales ({dealCount} × ₱{parsedDealPrice.toLocaleString()}):</span>
                            <span className="font-bold text-zinc-200">₱{grossTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Base Commission ({parsedRate}%):</span>
                            <span className="font-bold text-zinc-200">₱{baseCommission.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {(parsedBonus > 0 || parsedDeduction > 0) && (
                            <div className="flex justify-between text-[10px] text-zinc-400 border-t border-zinc-700/50 pt-1">
                                <span>Adjustments (+₱{parsedBonus} / -₱{parsedDeduction}):</span>
                                <span className={`font-bold ${parsedBonus >= parsedDeduction ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {parsedBonus >= parsedDeduction ? '+' : '-'}₱{Math.abs(parsedBonus - parsedDeduction).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                                Net Calculated Payout
                            </span>
                            <span className="text-lg font-black text-white tabular-nums tracking-tight">
                                ₱{netCommission.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Apply Button */}
                    <button
                        type="button"
                        onClick={() => handleApply(netCommission)}
                        className={`w-full py-2.5 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            appliedSuccess
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-white text-black hover:bg-zinc-100 shadow-lg'
                        }`}
                    >
                        {appliedSuccess ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Applied to Receipt!</span>
                            </>
                        ) : (
                            <>
                                <ArrowDownToLine className="w-4 h-4" />
                                <span>Apply ₱{netCommission.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to Receipt</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Tab 2: Standard Keypad Math */}
            {activeTab === 'standard' && (
                <div className="space-y-3">
                    {/* Screen Display */}
                    <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-right space-y-1">
                        <div className="text-[11px] text-zinc-400 font-mono tracking-wider min-h-[1.25rem] overflow-x-auto whitespace-nowrap">
                            {expression || '0'}
                        </div>
                        <div className="text-xl font-black text-white tabular-nums font-mono tracking-tight">
                            {evaluatedKeypadResult !== null
                                ? `₱${evaluatedKeypadResult.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '₱0.00'}
                        </div>
                    </div>

                    {/* Keypad Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-sm font-bold">
                        {/* Row 1 */}
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('C')}
                            className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all text-xs font-black uppercase"
                        >
                            C
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('BACK')}
                            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center text-zinc-300"
                        >
                            <Delete className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('%')}
                            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-zinc-300"
                        >
                            %
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('÷')}
                            className="p-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all text-white font-black"
                        >
                            ÷
                        </button>

                        {/* Row 2 */}
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('7')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            7
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('8')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            8
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('9')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            9
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('×')}
                            className="p-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all text-white font-black"
                        >
                            ×
                        </button>

                        {/* Row 3 */}
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('4')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            4
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('5')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            5
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('6')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            6
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('-')}
                            className="p-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all text-white font-black"
                        >
                            -
                        </button>

                        {/* Row 4 */}
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('1')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            1
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('2')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            2
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('3')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            3
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('+')}
                            className="p-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all text-white font-black"
                        >
                            +
                        </button>

                        {/* Row 5 */}
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('0')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white"
                        >
                            0
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('.')}
                            className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all text-white font-black"
                        >
                            .
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKeypadPress('=')}
                            className="col-span-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black active:scale-95 transition-all flex items-center justify-center gap-1"
                        >
                            <Equal className="w-4 h-4" />
                            <span>=</span>
                        </button>
                    </div>

                    {/* Apply Button */}
                    <button
                        type="button"
                        disabled={evaluatedKeypadResult === null || evaluatedKeypadResult <= 0}
                        onClick={() => {
                            if (evaluatedKeypadResult !== null) {
                                handleApply(evaluatedKeypadResult);
                            }
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
                            appliedSuccess
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-white text-black hover:bg-zinc-100 shadow-lg'
                        }`}
                    >
                        {appliedSuccess ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Applied to Receipt!</span>
                            </>
                        ) : (
                            <>
                                <ArrowDownToLine className="w-4 h-4" />
                                <span>
                                    {evaluatedKeypadResult !== null && evaluatedKeypadResult > 0
                                        ? `Apply ₱${evaluatedKeypadResult.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to Receipt`
                                        : 'Apply Result to Receipt'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
