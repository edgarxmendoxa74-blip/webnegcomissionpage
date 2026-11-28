import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Download,
  FileText,
  Info,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react';
import { SignaturePad } from '../components/SignaturePad';
import { exportHtmlToPdf } from '../lib/pdfExport';

/* â”€â”€â”€ Brand & Page Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const A4_WIDTH_PX = 794;   // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi
const PAGE_GAP_PX = 24;

const PROVIDER = {
  brandLine: 'Smartmenu by Webnegosyo',
  city: 'Quezon',
  country: 'Philippines',
  salesEmail: 'smartmenusales@gmail.com',
  website: 'www.webnegosyo.com',
  agreementHeader: 'WebNegosyo /LUCENA CITY, QUEZON / webnegosyo3@gmail.com / 09452106254',
};

interface QuoteItem {
  id: string;
  title: string;
  description: string;
  qty: number;
  rate: number;
}

interface QuotationData {
  quoteNumber: string;
  quoteDate: string; // YYYY-MM-DD
  salesperson: string;
  salespersonPosition: string;
  clientName: string;
  clientPosition: string;
  businessLocation: string;
  notes: string;
  items: QuoteItem[];
  totalAmount?: number;
  packageName: string;
  includedFeatures: string;
  startDate: string; // YYYY-MM-DD
  monthlyFee: string;
  setupFee: string;
  paymentDueDate: string;
  paymentMethod: string;
  cancellationNotice: string;
  agreementDate: string; // YYYY-MM-DD
  providerSignature?: string;
}

const DEFAULT_ITEMS: QuoteItem[] = [
  {
    id: 'item-1',
    title: 'Smart Value Bundle',
    description:
      'One payment covers 6+1 month free\n\nBuilt for restaurants that want the best price and zero hassle. Pay 5,499 once and your Smart Menu is covered for a full 7 months.',
    qty: 1,
    rate: 5499,
  },
  {
    id: 'item-2',
    title: 'Customer Support',
    description:
      'Free customer support during tenure.\nCustomer Support is available from 9am-5pm Daily.',
    qty: 1,
    rate: 0,
  },
  {
    id: 'item-3',
    title: 'Requirements',
    description:
      '-Business Logo\n-Complete menulists\n-Downpayment\n\nDeliverables in 1-2 days\n(depending on the completeness of requirements)',
    qty: 1,
    rate: 0,
  },
];

const QUOTE_SEQ_STORAGE_KEY = 'smartmenu_quote_seq';

function getNextQuoteNumber(commit = false): string {
  let current = 20;
  try {
    const saved = Number(window.localStorage.getItem(QUOTE_SEQ_STORAGE_KEY));
    if (Number.isFinite(saved) && saved >= 20) current = saved;
    const next = current + 1;
    if (commit) {
      window.localStorage.setItem(QUOTE_SEQ_STORAGE_KEY, String(next));
    }
    return `QT-${String(next).padStart(6, '0')}`;
  } catch {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `QT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  }
}

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatSlashDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return iso || '';
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function formatShortSlashDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return iso || '';
  return `${m[2]}/${m[3]}/${m[1].slice(2)}`;
}

function formatMoney(n: number): string {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHTML(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value: string): string {
  return escapeHTML(value).replace(/\n/g, '<br/>');
}

/* â”€â”€â”€ 3-Page Quotation HTML Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function buildQuotationHTML(data: QuotationData, logoUrl: string): string {
  const esc = escapeHTML;
  const subtotal = data.items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0,
  );
  const totalAmount =
    typeof data.totalAmount === 'number' && Number.isFinite(data.totalAmount)
      ? data.totalAmount
      : subtotal;
  const quoteDateLabel = formatSlashDate(data.quoteDate);
  const startDateLabel = formatShortSlashDate(data.startDate);
  const agreementDateLabel = formatShortSlashDate(data.agreementDate || data.quoteDate);
  const clientClean = esc(data.clientName.trim());
  const quoteNo = esc(data.quoteNumber.trim() || 'QT-000001');

  const itemsRows = data.items
    .map((item, idx) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const amount = qty * rate;
      return `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="col-desc">
            <div class="item-title">${esc(item.title)}</div>
            ${item.description ? `<div class="item-body">${nl2br(item.description)}</div>` : ''}
          </td>
          <td class="col-qty">${qty.toFixed(2)}</td>
          <td class="col-rate">${formatMoney(rate)}</td>
          <td class="col-amt">${formatMoney(amount)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Quote ${quoteNo} - ${clientClean}</title>
<style>
  @page { size: A4 portrait; margin: 0; }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 210mm;
    background: #ffffff;
    color: #000000;
    font-family: "Helvetica Neue", Helvetica, Arial, "Segoe UI", sans-serif;
    font-size: 9.5pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    padding: 15mm 16mm 13mm;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }

  .page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* â”€â”€ Page 1 Header â”€â”€ */
  .top-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .brand-col {
    max-width: 95mm;
  }

  .logo-box {
    width: 34mm;
    margin-bottom: 3mm;
  }

  .logo-box img {
    width: 100%;
    height: auto;
    display: block;
  }

  .company-name {
    font-size: 10pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 0.5mm;
  }

  .company-meta {
    font-size: 9pt;
    color: #000000;
    line-height: 1.4;
  }

  .quote-col {
    text-align: right;
    padding-top: 2mm;
  }

  .quote-title {
    font-size: 28pt;
    font-weight: 400;
    color: #000000;
    line-height: 1.05;
    letter-spacing: -0.01em;
  }

  .quote-num {
    margin-top: 1.5mm;
    font-size: 9.5pt;
    font-weight: 700;
    color: #000000;
  }

  /* â”€â”€ Bill To & Meta â”€â”€ */
  .bill-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 8mm;
    margin-bottom: 5mm;
  }

  .bill-to-label {
    font-size: 9pt;
    color: #000000;
    margin-bottom: 0.8mm;
  }

  .bill-to-name {
    font-size: 10pt;
    font-weight: 700;
    color: #000000;
  }

  .meta-table {
    border-collapse: collapse;
    font-size: 9pt;
  }

  .meta-table td {
    padding: 0.8mm 0;
  }

  .meta-table td.k {
    color: #000000;
    text-align: right;
    padding-right: 6mm;
  }

  .meta-table td.v {
    color: #000000;
    text-align: right;
    min-width: 28mm;
  }

  /* â”€â”€ Items Table â”€â”€ */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1mm;
  }

  .items-table thead th {
    background: #333333;
    color: #ffffff;
    font-size: 8.8pt;
    font-weight: 600;
    padding: 2.3mm 2.5mm;
    text-align: left;
  }

  .items-table thead th.col-num { width: 8mm; text-align: center; }
  .items-table thead th.col-qty { width: 16mm; text-align: right; }
  .items-table thead th.col-rate { width: 24mm; text-align: right; }
  .items-table thead th.col-amt { width: 26mm; text-align: right; }

  .items-table tbody td {
    padding: 3.2mm 2.5mm;
    border-bottom: 0.5pt solid #e2e2e2;
    vertical-align: top;
    font-size: 8.8pt;
    color: #000000;
  }

  .items-table tbody td.col-num { text-align: center; color: #000000; }
  .items-table tbody td.col-qty { text-align: right; }
  .items-table tbody td.col-rate { text-align: right; }
  .items-table tbody td.col-amt { text-align: right; }

  .item-title {
    font-weight: 600;
    color: #000000;
    margin-bottom: 0.8mm;
  }

  .item-body {
    font-size: 8.4pt;
    color: #000000;
    line-height: 1.42;
  }

  /* â”€â”€ Totals â”€â”€ */
  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 2.5mm;
  }

  .totals-table {
    border-collapse: collapse;
    width: 78mm;
    font-size: 9pt;
  }

  .totals-table td {
    padding: 2mm 2.5mm;
    text-align: right;
  }

  .totals-table tr.total-row td {
    background: #f2f2f2;
    font-weight: 700;
    color: #000000;
    padding: 2.6mm 2.5mm;
  }

  /* â”€â”€ Notes & Terms Intro â”€â”€ */
  .notes-block {
    margin-top: 9mm;
  }

  .section-heading {
    font-size: 10pt;
    font-weight: 500;
    color: #000000;
    margin-bottom: 1.5mm;
  }

  .notes-text {
    font-size: 8.6pt;
    color: #000000;
  }

  .terms-block {
    margin-top: 7mm;
  }

  .terms-p {
    font-size: 8.4pt;
    color: #000000;
    line-height: 1.45;
    margin-bottom: 2.4mm;
  }

  .terms-subhead {
    font-size: 8.6pt;
    font-weight: 500;
    color: #000000;
    margin-top: 3mm;
    margin-bottom: 1mm;
  }

  .terms-list {
    margin: 0.8mm 0 2.2mm 5mm;
    font-size: 8.4pt;
    color: #000000;
    line-height: 1.42;
  }

  .terms-list li {
    margin-bottom: 0.6mm;
  }

  /* â”€â”€ Page 3 Agreement â”€â”€ */
  .agreement-meta {
    font-size: 8.8pt;
    color: #000000;
    line-height: 1.5;
    margin-bottom: 4.5mm;
  }

  .agreement-meta .row {
    display: flex;
    gap: 4mm;
  }

  .agreement-meta .lbl {
    min-width: 18mm;
  }

  .sub-details-title {
    font-size: 9pt;
    color: #000000;
    margin-bottom: 3.5mm;
  }

  .details-table {
    border-collapse: collapse;
    font-size: 8.6pt;
    color: #000000;
    margin-bottom: 5mm;
    width: 100%;
  }

  .details-table th {
    text-align: left;
    font-weight: 500;
    padding-bottom: 1.5mm;
  }

  .details-table td {
    padding: 0.55mm 0;
    vertical-align: top;
  }

  .details-table td.d-lbl {
    width: 44mm;
    padding-right: 4mm;
  }

  .agr-clauses {
    font-size: 8.6pt;
    color: #000000;
    line-height: 1.48;
    margin-bottom: 6mm;
  }

  .agr-clauses p {
    margin-bottom: 0.8mm;
  }

  .sig-section {
    font-size: 8.8pt;
    color: #000000;
    line-height: 1.5;
  }

  .sig-block {
    margin-top: 5mm;
  }

  .sig-line {
    margin-top: 7mm;
    width: 56mm;
    border-bottom: 0.75pt solid #222222;
  }

  .sig-img-wrap {
    margin-top: 1.5mm;
    height: 14mm;
    width: 56mm;
    display: flex;
    align-items: flex-end;
    border-bottom: 0.75pt solid #222222;
    padding-bottom: 0.5mm;
  }

  .sig-img {
    max-height: 13.5mm;
    max-width: 54mm;
    object-fit: contain;
    display: block;
  }

  /* â”€â”€ Page Footer â”€â”€ */
  .page-footer {
    margin-top: auto;
    padding-top: 3mm;
    text-align: right;
    font-size: 8.5pt;
    color: #000000;
  }

  .page-footer.with-rule {
    border-top: 0.5pt solid #cccccc;
  }

  @media print {
    html, body { width: 210mm; }
    .page { margin: 0; }
  }
</style>
</head>
<body>

<!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PAGE 1 â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div class="page">
  <div class="top-header">
    <div class="brand-col">
      <div class="logo-box">
        <img src="${logoUrl}" alt="SmartMenu"/>
      </div>
      <div class="company-name">${PROVIDER.brandLine}</div>
      <div class="company-meta">
        ${PROVIDER.city}<br/>
        ${PROVIDER.country}<br/>
        ${PROVIDER.salesEmail}<br/>
        ${PROVIDER.website}
      </div>
    </div>

    <div class="quote-col">
      <div class="quote-title">Quote</div>
      <div class="quote-num">Quote# ${quoteNo}</div>
    </div>
  </div>

  <div class="bill-meta-row">
    <div>
      <div class="bill-to-label">Bill To</div>
      <div class="bill-to-name">${clientClean}</div>
    </div>
    <table class="meta-table">
      <tr>
        <td class="k">Quote Date :</td>
        <td class="v">${esc(quoteDateLabel)}</td>
      </tr>
      <tr>
        <td class="k">Salesperson :</td>
        <td class="v">${esc(data.salesperson.trim())}</td>
      </tr>
    </table>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-desc">Item &amp; Description</th>
        <th class="col-qty">Qty</th>
        <th class="col-rate">Rate</th>
        <th class="col-amt">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals-table">
      <tr>
        <td>Sub Total</td>
        <td>${formatMoney(subtotal)}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td>PHP${formatMoney(totalAmount)}</td>
      </tr>
    </table>
  </div>

  <div class="notes-block">
    <div class="section-heading">Notes</div>
    <div class="notes-text">${nl2br(data.notes.trim() || 'Looking forward for your business.')}</div>
  </div>

  <div class="terms-block">
    <div class="section-heading">Terms &amp; Conditions</div>
    <p class="terms-p">SmartMenu Terms and Conditions and Subscription Agreement</p>
    <p class="terms-p">Part 1: Terms and Conditions</p>
    <p class="terms-p">
      By availing of SmartMenu, the Client agrees to these Terms and Conditions. In this document, "we", "us" and "the Provider" mean
      WebNegosyo, and "you" and "the Client" mean the business subscribing to SmartMenu. These Terms work together with your Quotation
    </p>
  </div>

  <div class="page-footer">1</div>
</div>

<!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PAGE 2 â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div class="page">
  <p class="terms-p">and the Subscription Agreement that follows.</p>

  <div class="terms-subhead">1. The Service</div>
  <p class="terms-p" style="margin-bottom:0.8mm;">SmartMenu is a QR code digital menu platform. Your subscription includes:</p>
  <ul class="terms-list">
    <li>A hosted digital menu with its own QR code</li>
    <li>A dashboard where you can update items, prices, and photos</li>
    <li>Hosting, maintenance, and basic platform updates</li>
    <li>Any additional features listed in your Quotation, such as online ordering, POS integration, or extra branches</li>
  </ul>
  <p class="terms-p">We may improve or change the platform over time. The core service will remain available.</p>

  <div class="terms-subhead">2. Fees and Payment</div>
  <ul class="terms-list">
    <li>Your monthly fee and any one-time setup fee are stated in your Quotation and Subscription Agreement.</li>
    <li>Payment is made in advance, on or before the due date each month.</li>
    <li>If payment is more than 7 days late, we may suspend the service until the balance is settled.</li>
    <li>Fees are non-refundable for a month that has already started.</li>
    <li>We may change the monthly fee by giving you at least 30 days' notice before your next renewal.</li>
  </ul>

  <div class="terms-subhead">3. Monthly Renewal and Cancellation</div>
  <p class="terms-p">
    Your subscription renews automatically every month on the same date. Either party may cancel at any time by giving at least 7 days' notice
    before the next renewal date. Email or message to the contact details in the Subscription Agreement counts as written notice. Cancellation
    takes effect at the end of the current paid month.
  </p>

  <div class="terms-subhead">4. Your Responsibilities</div>
  <p class="terms-p" style="margin-bottom:0.8mm;">As the Client, you agree to:</p>
  <ul class="terms-list">
    <li>Keep your menu items, prices, and other information accurate and up to date</li>
    <li>Keep your login details private and not share your account outside your business</li>
    <li>Use SmartMenu only for lawful purposes and not upload content that is illegal, misleading, or infringes someone else's rights</li>
    <li>Not copy, resell, or reverse engineer the platform</li>
  </ul>
  <p class="terms-p">You are responsible for all activity under your account.</p>

  <div class="terms-subhead">5. Your Content and Our Platform</div>
  <p class="terms-p">
    You own your menu content, photos, logos, and business data. You allow us to host and display this content so we can deliver the service.
    We own the SmartMenu platform, software, and design.
  </p>

  <div class="terms-subhead">6. Data Privacy</div>
  <p class="terms-p">
    Both parties will handle customer and order data in line with the Data Privacy Act of 2012 (Republic Act No. 10173). We will not share this
    data with third parties, except when needed to run the service or when required by law. After total cancellation or tenant deletion, we will
    give you a copy of your menu data on request within 14 days. We may delete the data after that period.
  </p>

  <div class="terms-subhead">7. Support and Availability</div>
  <p class="terms-p">
    Support is available through EMAIL / MESSENGER / PHONE during weekdays 9AM-5PM. We aim to respond within 24 hours. We work to
    keep SmartMenu available at all times, but we cannot guarantee uninterrupted service. We will announce planned maintenance in
    advance where possible.
  </p>

  <div class="terms-subhead">8. Suspension and Termination</div>
  <p class="terms-p" style="margin-bottom:0.8mm;">We may suspend or end the service immediately if you:</p>
  <ul class="terms-list">
    <li>Do not pay within the late period stated in Section 2</li>
    <li>Break the rules in Section 4 and do not fix the problem within 7 days of written notice</li>
  </ul>

  <div class="terms-subhead">9. Limits of Liability</div>
  <p class="terms-p">
    SmartMenu is provided "as is". We are not liable for lost sales, lost profits, or indirect damages. Our total liability is limited to the fees you
    paid in the last 1 month. Neither party is responsible for delays caused by events beyond its control, such as internet or power outages,
    but take note that we have an offline core functionality.
  </p>

  <div class="terms-subhead">10. Governing Law and Disputes</div>
  <p class="terms-p">
    These Terms are governed by the laws of the Republic of the Philippines. If a dispute arises, both parties will first try to settle it through
    good faith discussion. If that does not work, the dispute will be brought to the proper courts of LUCENA CITY, QUEZON, PROVINCE.
  </p>

  <div class="terms-subhead">11. General Terms</div>
  <p class="terms-p">
    These Terms, your Quotation, and the Subscription Agreement form the full agreement between us. Any change must be in writing and
    agreed by both parties. If any part is found unenforceable, the rest remains in effect.
  </p>

  <div class="terms-subhead" style="margin-top:4mm;">Part 2: SmartMenu Subscription Agreement</div>
  <p class="terms-p">
    This Agreement is made on ${esc(quoteDateLabel)} between WebNegosyo (the "Provider") and the Client named in this QUOTATION. By
    signing, both parties agree to the Terms and Conditions in Part 1 and to the subscription details in this Agreement.
  </p>
  <p class="terms-p">
    Parties:<br/>
    Party Name / Address / Contact
  </p>

  <div class="page-footer with-rule">2</div>
</div>

<!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PAGE 3 â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div class="page">
  <div class="agreement-meta">
    <div class="row"><span class="lbl">Provider:</span><span>${PROVIDER.agreementHeader}</span></div>
    <div class="row"><span class="lbl">Client:</span><span>${clientClean}</span></div>
  </div>

  <div class="sub-details-title">Subscription Details</div>

  <table class="details-table">
    <thead>
      <tr>
        <th style="width:44mm;">Item</th>
        <th>Details:</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="d-lbl">Business name / location:</td>
        <td>${esc(data.businessLocation.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Package:</td>
        <td>${esc(data.packageName.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Included features:</td>
        <td>${esc(data.includedFeatures.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Start date:</td>
        <td>${esc(startDateLabel)}</td>
      </tr>
      <tr>
        <td class="d-lbl">Monthly fee:</td>
        <td>${esc(data.monthlyFee.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Setup fee (one-time):</td>
        <td>${esc(data.setupFee.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Payment due date</td>
        <td>${esc(data.paymentDueDate.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Payment method</td>
        <td>${esc(data.paymentMethod.trim())}</td>
      </tr>
      <tr>
        <td class="d-lbl">Cancellation notice</td>
        <td>${esc(data.cancellationNotice.trim())}</td>
      </tr>
    </tbody>
  </table>

  <div class="agr-clauses">
    <p style="margin-bottom:2mm;">Agreement</p>
    <p>1. &nbsp;&nbsp;&nbsp; The Provider will give the Client access to SmartMenu for the business and package stated above.</p>
    <p>2. &nbsp;&nbsp;&nbsp; The subscription runs for twelve months from the start date and renews automatically each month until cancelled under the Terms and Conditions.</p>
    <p>3. &nbsp;&nbsp;&nbsp; The Client will pay the fees stated above on time and follow the Terms and Conditions.</p>
    <p>4. &nbsp;&nbsp;&nbsp; This Agreement, the Terms and Conditions, and the Quotation form the full agreement between the parties.</p>
  </div>

  <div class="sig-section">
    <div>Signatures:</div>
    <div>By signing below, both parties agree to the terms above.</div>

    <div class="sig-block">
      <div>Provider: WebNegosyo</div>
      <div>Name: ${esc(data.salesperson.trim())}</div>
      <div>Position: ${esc(data.salespersonPosition.trim() || 'Marketing Manager')}</div>
      <div>Date: ${esc(agreementDateLabel)}</div>
      <div>Signature:</div>
      ${
        data.providerSignature
          ? `<div class="sig-img-wrap"><img class="sig-img" src="${data.providerSignature}" alt="Provider Signature"/></div>`
          : `<div class="sig-line"></div>`
      }
    </div>

    <div class="sig-block" style="margin-top:8mm;">
      <div>Client:</div>
      <div>Name: ${clientClean}</div>
      <div>Position: ${esc(data.clientPosition.trim() || 'Owner')}</div>
      <div>Date: ${esc(agreementDateLabel)}</div>
      <div>Signature:</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <div class="page-footer with-rule">3</div>
</div>

</body>
</html>`;
}

/* â”€â”€â”€ Print via hidden iframe â†’ "Save as PDF" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function printToPDF(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    frame.remove();
    return;
  }

  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      window.setTimeout(() => frame.remove(), 1000);
    }
  };

  frameWindow.addEventListener('load', () => window.setTimeout(print, 350), { once: true });
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  window.setTimeout(print, 2500);
}

/* â”€â”€â”€ Field Styling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const labelCls =
  'block text-[10px] font-black text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-[0.16em]';
const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8191A]/20 focus:border-[#E8191A] transition-colors';
const sectionTitleCls =
  'flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400';

/* â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function QuotationGenerator() {
  const today = toISODate(new Date());

  const [quoteNumber, setQuoteNumber] = useState(() => getNextQuoteNumber(false));
  const [quoteCommitted, setQuoteCommitted] = useState(false);
  const [quoteDate, setQuoteDate] = useState(today);
  const [salesperson, setSalesperson] = useState('Edgar Mendoza');
  const [salespersonPosition, setSalespersonPosition] = useState('Marketing Manager');

  const [clientName, setClientName] = useState('');
  const [clientPosition, setClientPosition] = useState('Owner');
  const [businessLocation, setBusinessLocation] = useState('');
  const [notes, setNotes] = useState('Looking forward for your business.');

  const [items, setItems] = useState<QuoteItem[]>(() => DEFAULT_ITEMS.map((i) => ({ ...i })));
  const [totalOverride, setTotalOverride] = useState<string | null>(null);

  const [packageName, setPackageName] = useState('Smart Value Bundle');
  const [includedFeatures, setIncludedFeatures] = useState('online ordering menu website');
  const [startDate, setStartDate] = useState(today);
  const [monthlyFee, setMonthlyFee] = useState('999 per month');
  const [setupFee, setSetupFee] = useState('5499');
  const [paymentDueDate, setPaymentDueDate] = useState('On or before the 25th of each month, in advance');
  const [paymentMethod, setPaymentMethod] = useState('GCash / bank transfer / other, with account details');
  const [cancellationNotice, setCancellationNotice] = useState("7 days' written notice");
  const [agreementDate, setAgreementDate] = useState(today);
  const [providerSignature, setProviderSignature] = useState('');
  const [sigResetSignal, setSigResetSignal] = useState(0);

  const [previewHTML, setPreviewHTML] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}smartmenu-logo.jpg`;

  const touch = () => setIsDirty(true);

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0,
  );

  const parsedOverride = totalOverride !== null && totalOverride.trim() !== '' ? Number(totalOverride) : NaN;
  const finalTotal = Number.isFinite(parsedOverride) ? parsedOverride : subtotal;

  const isReady = Boolean(
    quoteDate &&
    salesperson.trim() &&
    clientName.trim() &&
    items.length > 0,
  );

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const measure = () => setPreviewScale(Math.min(1, el.clientWidth / A4_WIDTH_PX));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewHTML]);

  const handleUpdateItem = (id: string, patch: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    touch();
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        title: '',
        description: '',
        qty: 1,
        rate: 0,
      },
    ]);
    touch();
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    touch();
  };

  const handleGenerate = () => {
    if (!isReady) return;
    const activeQuoteNo = quoteCommitted ? quoteNumber : getNextQuoteNumber(true);
    if (!quoteCommitted) {
      setQuoteNumber(activeQuoteNo);
      setQuoteCommitted(true);
    }
    const data: QuotationData = {
      quoteNumber: activeQuoteNo,
      quoteDate,
      salesperson,
      salespersonPosition,
      clientName,
      clientPosition,
      businessLocation,
      notes,
      items,
      totalAmount: finalTotal,
      packageName,
      includedFeatures,
      startDate,
      monthlyFee,
      setupFee,
      paymentDueDate,
      paymentMethod,
      cancellationNotice,
      agreementDate,
      providerSignature,
    };
    setPreviewHTML(buildQuotationHTML(data, logoUrl));
    setIsDirty(false);
  };

  const handleReset = () => {
    const d = toISODate(new Date());
    setQuoteNumber(getNextQuoteNumber(false));
    setQuoteCommitted(false);
    setQuoteDate(d);
    setSalesperson('Edgar Mendoza');
    setSalespersonPosition('Marketing Manager');
    setClientName('');
    setClientPosition('Owner');
    setBusinessLocation('');
    setNotes('Looking forward for your business.');
    setItems(DEFAULT_ITEMS.map((i) => ({ ...i })));
    setTotalOverride(null);
    setPackageName('Smart Value Bundle');
    setIncludedFeatures('online ordering menu website');
    setStartDate(d);
    setMonthlyFee('999 per month');
    setSetupFee('5499');
    setPaymentDueDate('On or before the 25th of each month, in advance');
    setPaymentMethod('GCash / bank transfer / other, with account details');
    setCancellationNotice("7 days' written notice");
    setAgreementDate(d);
    setProviderSignature('');
    setSigResetSignal((n) => n + 1);
    setPreviewHTML('');
    setIsDirty(false);
  };

  const totalPreviewHeightPx = Math.round((A4_HEIGHT_PX * 3 + PAGE_GAP_PX) * previewScale);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-[#E8191A]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-black">Quotation Generator</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Buuin ang opisyal na SmartMenu Quote, Terms &amp; Subscription Agreement (3-page PDF)
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 sm:p-6 shadow-sm space-y-5">
        {/* â”€â”€ Quote & Client â”€â”€ */}
        <section className="space-y-4">
          <div className={sectionTitleCls}>
            <User className="w-3.5 h-3.5" />
            Quote &amp; Client Details
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>
                Quote # <span className="text-zinc-400 font-normal normal-case">(auto)</span>
              </label>
              <input
                type="text"
                value={quoteNumber}
                readOnly
                className={`${inputCls} bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold cursor-default`}
              />
            </div>
            <div>
              <label className={labelCls}>Quote Date *</label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => { setQuoteDate(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Salesperson *</label>
              <input
                type="text"
                value={salesperson}
                onChange={(e) => { setSalesperson(e.target.value); touch(); }}
                placeholder="Edgar Mendoza"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Bill To (Client Name) *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => { setClientName(e.target.value); touch(); }}
                placeholder="Ms. Mylene Epistola"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Client Position</label>
              <input
                type="text"
                value={clientPosition}
                onChange={(e) => { setClientPosition(e.target.value); touch(); }}
                placeholder="Owner"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Provider Position</label>
              <input
                type="text"
                value={salespersonPosition}
                onChange={(e) => { setSalespersonPosition(e.target.value); touch(); }}
                placeholder="Marketing Manager"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Business Name / Location</label>
              <input
                type="text"
                value={businessLocation}
                onChange={(e) => { setBusinessLocation(e.target.value); touch(); }}
                placeholder="Restaurant Name / City"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); touch(); }}
                placeholder="Looking forward for your business."
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

        {/* â”€â”€ Line Items â”€â”€ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className={sectionTitleCls}>
              <Package className="w-3.5 h-3.5" />
              Line Items
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    Item #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Item Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                      placeholder="Smart Value Bundle"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.qty}
                      onChange={(e) => handleUpdateItem(item.id, { qty: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Rate (PHP)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleUpdateItem(item.id, { rate: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                    placeholder="Item details..."
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
            <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Sub Total: <span className="text-zinc-800 dark:text-zinc-200">PHP{formatMoney(subtotal)}</span>
            </div>

            <div className="w-full sm:w-56">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className={`${labelCls} mb-0`}>Total (PHP)</label>
                {totalOverride !== null && (
                  <button
                    type="button"
                    onClick={() => { setTotalOverride(null); touch(); }}
                    className="text-[11px] font-bold text-[#E8191A] hover:underline cursor-pointer"
                  >
                    Auto
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalOverride ?? String(subtotal)}
                onChange={(e) => { setTotalOverride(e.target.value); touch(); }}
                className={`${inputCls} font-black text-right`}
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

        {/* â”€â”€ Subscription Agreement Details (Page 3) â”€â”€ */}
        <section className="space-y-4">
          <div className={sectionTitleCls}>
            <Briefcase className="w-3.5 h-3.5" />
            Subscription Agreement Details (Page 3)
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Package</label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => { setPackageName(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Included Features</label>
              <input
                type="text"
                value={includedFeatures}
                onChange={(e) => { setIncludedFeatures(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Agreement Date</label>
              <input
                type="date"
                value={agreementDate}
                onChange={(e) => { setAgreementDate(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Monthly Fee</label>
              <input
                type="text"
                value={monthlyFee}
                onChange={(e) => { setMonthlyFee(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Setup Fee (One-time)</label>
              <input
                type="text"
                value={setupFee}
                onChange={(e) => { setSetupFee(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Payment Due Date</label>
              <input
                type="text"
                value={paymentDueDate}
                onChange={(e) => { setPaymentDueDate(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Payment Method</label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Cancellation Notice</label>
              <input
                type="text"
                value={cancellationNotice}
                onChange={(e) => { setCancellationNotice(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

        {/* â”€â”€ E-Signatures (Page 3) â”€â”€ */}
        <section className="space-y-4">
          <div className={sectionTitleCls}>
            Provider E-Signature Pen (Opsyonal Â· Page 3)
          </div>

          <SignaturePad
            label="Provider Signature (WebNegosyo)"
            value={providerSignature}
            onChange={(url) => { setProviderSignature(url); touch(); }}
            resetSignal={sigResetSignal}
          />
        </section>

        <motion.button
          whileHover={{ scale: isReady ? 1.02 : 1 }}
          whileTap={{ scale: isReady ? 0.97 : 1 }}
          onClick={handleGenerate}
          disabled={!isReady}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isReady
              ? 'bg-[#E8191A] hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 cursor-pointer'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
          }`}
        >
          <FileText className="w-4 h-4" />
          {previewHTML ? 'I-generate muli' : 'Generate Quotation'}
        </motion.button>

        <p className="text-xs text-zinc-400 text-center">
          Kailangan ang Quote Date, Salesperson, at Bill To (Client Name). Auto-generated ang Quote #.
        </p>
      </div>

      {/* Preview */}
      {previewHTML && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <p className="text-sm font-black text-zinc-900 dark:text-white">Preview Â· 3 Pages (A4 Portrait)</p>
              <p className="text-[11px] text-zinc-400">
                Quote# {quoteNumber}
                {isDirty && (
                  <span className="ml-2 font-bold text-amber-600">Â· may binago, i-generate muli</span>
                )}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: isExporting ? 1 : 1.03 }}
              whileTap={{ scale: isExporting ? 1 : 0.97 }}
              disabled={isExporting}
              onClick={async () => {
                setExportError('');
                setIsExporting(true);
                try {
                  const safeClient = clientName.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Client';
                  await exportHtmlToPdf(previewHTML, `${quoteNumber}-${safeClient}.pdf`);
                } catch (err) {
                  setExportError(err instanceof Error ? err.message : 'Hindi ma-export ang PDF.');
                } finally {
                  setIsExporting(false);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E8191A] hover:bg-red-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-200 dark:shadow-red-900/30 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Ginagawa ang PDF...' : 'I-download bilang PDF'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Bago Muli
            </motion.button>
          </div>

          {exportError && (
            <p className="text-xs font-bold text-red-600 dark:text-red-400">{exportError}</p>
          )}

          <div
            ref={previewWrapRef}
            className={`rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xl bg-zinc-100 transition-opacity ${
              isDirty ? 'opacity-60' : 'opacity-100'
            }`}
            style={{ height: totalPreviewHeightPx }}
          >
            <iframe
              srcDoc={previewHTML}
              title="Quotation Preview"
              scrolling="no"
              style={{
                width: A4_WIDTH_PX,
                height: A4_HEIGHT_PX * 3 + PAGE_GAP_PX,
                border: 'none',
                background: '#fff',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-3.5 py-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
              <span className="font-bold">Sa print dialog:</span> Destination â†’ â€œSave as PDFâ€, Paper â†’ A4,
              Margins â†’ None, at i-check ang â€œBackground graphicsâ€ para lumabas ang dark table header at total highlight.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
