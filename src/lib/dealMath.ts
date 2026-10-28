interface DealLike {
    payment_status?: string | null;
    deal_value: number | string;
    down_payment?: number | string;
    commission_rate?: number | string | null;
}

/** Fixed commission: ₱300 per deal if 5499, ₱250 per deal if 3499.
 *  Commission is only earned once a project is Fully Paid.
 *  Tips are separate and never included in commission or balance.
 */
export const dealCommission = (lead: DealLike, fallbackRate = 0) => {
    if (lead.payment_status !== 'Fully Paid') return 0;
    const val = Number(lead.deal_value) || 0;
    if (val >= 5499) return 300;
    if (val >= 3499) return 250;
    return val * (Number(lead.commission_rate ?? fallbackRate) / 100);
};

/** Money still attributed to the deal:
 *  - If Downpayment Only or Cancelled Project: down payment
 *  - If Fully Paid: package minus commission (e.g. 5499 - 300 = 5199, or 3499 - 250 = 3249)
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
