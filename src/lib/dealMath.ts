interface DealLike {
    payment_status?: string | null;
    deal_value: number | string;
    down_payment?: number | string;
    commission_rate?: number | string | null;
    commission_amount?: number | string | null;
}

/** Returns the commission for a deal.
 *  If commission_amount is set directly, that value is used.
 *  Otherwise falls back to the fixed-rate logic (₱300 for ≥5499, ₱250 for ≥3499).
 *  Commission is only earned once a project is Fully Paid.
 *  Tips are separate and never included in commission or balance.
 */
export const dealCommission = (lead: DealLike, fallbackRate = 0) => {
    if (lead.payment_status !== 'Fully Paid') return 0;

    // Direct commission amount takes priority
    const direct = Number(lead.commission_amount);
    if (!isNaN(direct) && direct > 0) return direct;

    // Legacy fixed-rate fallback
    const val = Number(lead.deal_value) || 0;
    if (val >= 5499) return 300;
    if (val >= 3499) return 250;
    return val * (Number(lead.commission_rate ?? fallbackRate) / 100);
};

/** Money still attributed to the deal:
 *  - Downpayment Only / Cancelled Project: down payment
 *  - Fully Paid: package minus commission
 *  - Tip is separate and NOT included in total or balance.
 */
export const dealBalance = (lead: DealLike, fallbackRate = 0) => {
    const val = Number(lead.deal_value) || 0;
    const dp = Number(lead.down_payment) || 0;
    if (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project') {
        return dp;
    }
    if (lead.payment_status === 'Fully Paid') {
        return val - dealCommission(lead, fallbackRate);
    }
    return val - dp;
};
