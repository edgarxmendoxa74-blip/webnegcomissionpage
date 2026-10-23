interface DealLike {
    payment_status?: string | null;
    deal_value: number | string;
    down_payment: number | string;
    commission_rate?: number | string | null;
}

/** Commission is only earned once a project is Fully Paid: package x the deal's commission %. */
export const dealCommission = (lead: DealLike, fallbackRate = 0) =>
    lead.payment_status === 'Fully Paid'
        ? Number(lead.deal_value) * Number(lead.commission_rate ?? fallbackRate) / 100
        : 0;

/** Money still attributed to the deal: the down payment if Downpayment Only/Cancelled,
 *  package minus commission if Fully Paid, otherwise the unpaid part of the package. */
export const dealBalance = (lead: DealLike, fallbackRate = 0) => {
    if (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project') {
        return Number(lead.down_payment);
    }
    if (lead.payment_status === 'Fully Paid') {
        return Number(lead.deal_value) - dealCommission(lead, fallbackRate);
    }
    return Number(lead.deal_value) - Number(lead.down_payment);
};
