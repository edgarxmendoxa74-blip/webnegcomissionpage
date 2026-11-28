import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  ChevronDown,
  Download,
  FileText,
  Info,
  PenLine,
  RefreshCw,
  User,
} from 'lucide-react';
import { SignaturePad } from '../components/SignaturePad';

/* ─── Brand tokens ───────────────────────────────────────────────────────── */
const BRAND = {
  name: 'SmartMenu',
  tagline: 'GROWING RESTAURANTS. TOGETHER.',
  email: 'webnegosyo3@gmail.com',
  address: '', // e.g. 'Unit 1204, Ayala Avenue, Makati City' — printed next to the email once set
  red: '#E8191A',
  amber: '#F5A623',
};

const A4_WIDTH_PX = 794;   // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi

const STATUS_OPTIONS = [
  'Regular',
  'Probationary',
  'Contractual',
  'Project-based',
  'Part-time',
  'Seasonal',
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
type Pronoun = 'he' | 'she';

const PRONOUNS: Record<Pronoun, { subject: string; possessive: string }> = {
  he: { subject: 'He', possessive: 'His' },
  she: { subject: 'She', possessive: 'Her' },
};

const PRONOUN_OPTIONS: Pronoun[] = ['he', 'she'];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(value?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLong(d: Date | null): string {
  return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = n % 100;
  return `${n}${suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]}`;
}

function tenureLabel(start: Date | null, end: Date | null): string {
  if (!start) return '';
  const stop = end ?? new Date();
  if (stop < start) return '';
  let months = (stop.getFullYear() - start.getFullYear()) * 12 + (stop.getMonth() - start.getMonth());
  if (stop.getDate() < start.getDate()) months -= 1;
  if (months < 1) return 'less than a month';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (rest) parts.push(`${rest} month${rest > 1 ? 's' : ''}`);
  return parts.join(' and ');
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Certificate model ──────────────────────────────────────────────────── */
interface CertificateData {
  employeeName: string;
  position: string;
  employmentStatus: string;
  startDate: string;  // ISO, required
  endDate: string;    // ISO, empty when still employed
  purpose: string;
  place: string;
  issueDate: string;  // ISO, required
  signatoryName: string;
  signatoryRole: string;
  pronoun: Pronoun;
  referenceNo: string;
  signatorySignature?: string;
}

/* ─── Certificate HTML — A4 print sheet ──────────────────────────────────── */
function buildCertificateHTML(data: CertificateData, logoUrl: string): string {
  const issued = parseISO(data.issueDate) ?? new Date();
  const start = parseISO(data.startDate);
  const end = parseISO(data.endDate);
  const tenure = tenureLabel(start, end);
  const esc = escapeHTML;

  const employeeName = esc(data.employeeName);
  const position = esc(data.position);
  const status = esc(data.employmentStatus);
  const startLabel = start ? formatLong(start) : esc(data.startDate);
  const endLabel = end ? formatLong(end) : 'Present';
  const purpose = esc(data.purpose);
  const place = esc(data.place);

  // Pronoun-aware phrasing so the letter never prints "he/she"
  const possessive = PRONOUNS[data.pronoun].possessive;
  const subjectLower = PRONOUNS[data.pronoun].subject.toLowerCase();
  const possessiveLower = possessive.toLowerCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate of Employment - ${employeeName} - ${toISODate(issued)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 210mm;
    height: 297mm;
    background: #ffffff;
    color: #141416;
    font-family: "Helvetica Neue", Helvetica, Arial, "Segoe UI", sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── brand bands ── */
  .band-red   { height: 8px; background: ${BRAND.red};   flex-shrink: 0; }
  .band-amber { height: 3px; background: ${BRAND.amber}; flex-shrink: 0; }

  .sheet {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 13mm 20mm 9mm;
  }

  /* ── letterhead ── */
  .masthead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10mm;
  }

  .logo { width: 33mm; height: auto; display: block; }

  .meta { text-align: right; padding-top: 1.5mm; }

  .meta .eyebrow {
    font-size: 6.6pt;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #a1a1aa;
  }

  .meta .line {
    margin-top: 1.7mm;
    font-size: 7.6pt;
    letter-spacing: 0.02em;
    color: #52525b;
  }

  .meta .line span { color: #0b0b0d; font-weight: 700; }

  .meta .contact {
    margin-top: 2.4mm;
    font-size: 6.8pt;
    letter-spacing: 0.07em;
    color: #8a8a90;
  }

  .masthead-rule {
    margin-top: 6mm;
    height: 1.5px;
    background: linear-gradient(90deg, ${BRAND.red} 0 30mm, ${BRAND.amber} 30mm 55mm, #e4e4e7 55mm 100%);
  }

  /* ── title ── */
  .title-wrap { text-align: center; margin-top: 11mm; }

  .title {
    font-size: 21pt;
    font-weight: 800;
    letter-spacing: 0.17em;
    text-transform: uppercase;
    color: #0b0b0d;
    line-height: 1.05;
  }

  .title-rule {
    width: 42mm;
    height: 2.4px;
    background: ${BRAND.red};
    margin: 4.2mm auto 0;
  }

  /* ── body copy ── */
  .letter {
    flex: 1;
    margin-top: 11mm;
    font-size: 10.6pt;
    line-height: 1.95;
    text-align: justify;
    color: #1f1f23;
  }

  .letter p { margin-bottom: 4.4mm; }
  .letter p:last-child { margin-bottom: 0; }
  .letter strong { font-weight: 700; color: #0b0b0d; }
  .salutation { letter-spacing: 0.06em; }

  /* ── signature ── */
  .signature { display: flex; justify-content: flex-end; margin-top: 9mm; }

  .signature-box { width: 74mm; }

  .signature-closing {
    font-size: 10.4pt;
    color: #1f1f23;
    margin-bottom: 15mm;
  }

  .signature-closing.with-img {
    margin-bottom: 2mm;
  }

  .signature-img-wrap {
    height: 15mm;
    display: flex;
    align-items: flex-end;
    margin-bottom: 1mm;
  }

  .signature-img {
    max-height: 14.5mm;
    max-width: 68mm;
    object-fit: contain;
    display: block;
  }

  .signature-line { height: 1px; background: #1f1f23; margin-bottom: 2.4mm; }

  .signature-caption {
    margin-top: 2.4mm;
    font-size: 6.4pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #a1a1aa;
  }

  .signature-name {
    font-size: 10.8pt;
    font-weight: 700;
    color: #0b0b0d;
  }

  .signature-role {
    margin-top: 0.6mm;
    font-size: 8.6pt;
    color: #52525b;
  }

  .signature-org {
    margin-top: 0.6mm;
    font-size: 8.4pt;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: ${BRAND.red};
  }

  /* ── footer ── */
  .footer { margin-top: auto; padding-top: 7mm; }

  .footer-rule { height: 1px; background: #e4e4e7; }

  .footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 3mm;
    font-size: 6.6pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #a1a1aa;
  }

  .footer-row .tagline {
    color: #3f3f46;
    font-weight: 700;
    letter-spacing: 0.2em;
  }

  @media print {
    html, body { width: 210mm; height: 297mm; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="band-red"></div>
  <div class="band-amber"></div>

  <div class="sheet">

    <!-- LETTERHEAD -->
    <div class="masthead">
      <img class="logo" src="${logoUrl}" alt="${BRAND.name}"/>
      <div class="meta">
        <div class="eyebrow">Official Document</div>
        <div class="line">Ref. No. <span>${esc(data.referenceNo)}</span></div>
        <div class="line">Date Issued: <span>${formatLong(issued)}</span></div>
        ${tenure ? `<div class="line">Length of Service: <span>${tenure}</span></div>` : ''}
        <div class="contact">${BRAND.email}${BRAND.address ? ` &middot; ${esc(BRAND.address)}` : ''}</div>
      </div>
    </div>

    <div class="masthead-rule"></div>

    <!-- TITLE -->
    <div class="title-wrap">
      <div class="title">Certificate of Employment</div>
      <div class="title-rule"></div>
    </div>

    <!-- BODY -->
    <div class="letter">
      <p class="salutation"><strong>TO WHOM IT MAY CONCERN:</strong></p>

      <p>
        This is to certify that <strong>${employeeName}</strong> has been employed by
        <strong>${BRAND.name}</strong> as <strong>${position}</strong>${status ? ` on a <strong>${status}</strong> basis` : ''}
        from <strong>${startLabel}</strong> to <strong>${endLabel}</strong>.
      </p>

      <p>
        During the period of employment, ${subjectLower} rendered ${possessiveLower} services with
        diligence, professionalism, and dedication, and consistently carried out all assigned duties
        and responsibilities to the satisfaction of the company.
      </p>

      <p>
        This certification is issued upon the request of the above-named employee${purpose ? ` for
        <strong>${purpose}</strong> purposes` : ''} and for whatever legal purpose or intent it may serve.
      </p>

      <p>
        Issued this <strong>${ordinal(issued.getDate())}</strong> day of
        <strong>${issued.toLocaleDateString('en-US', { month: 'long' })} ${issued.getFullYear()}</strong>
        ${place ? `at <strong>${place}, Philippines</strong>` : 'in the <strong>Philippines</strong>'}.
      </p>
    </div>

    <!-- SIGNATURE -->
    <div class="signature">
      <div class="signature-box">
        <div class="signature-closing${data.signatorySignature ? ' with-img' : ''}">Sincerely,</div>
        ${
          data.signatorySignature
            ? `<div class="signature-img-wrap"><img class="signature-img" src="${data.signatorySignature}" alt="Signatory E-Signature"/></div>`
            : ''
        }
        <div class="signature-line"></div>
        <div class="signature-name">${esc(data.signatoryName)}</div>
        <div class="signature-role">${esc(data.signatoryRole)}</div>
        <div class="signature-org">${BRAND.name}</div>
        <div class="signature-caption">Signature over Printed Name</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-rule"></div>
      <div class="footer-row">
        <span>Ref. No. ${esc(data.referenceNo)}</span>
        <span class="tagline">${BRAND.tagline}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>

  </div>

  <div class="band-amber"></div>
  <div class="band-red"></div>

</div>
</body>
</html>`;
}

/* ─── Print via hidden iframe → "Save as PDF" ────────────────────────────── */
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

  // Listener is attached before writing so the load event is never missed
  frameWindow.addEventListener('load', () => window.setTimeout(print, 350), { once: true });
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  // Safety net in case the frame never reports a load event
  window.setTimeout(print, 2500);
}

/* ─── Field styling ──────────────────────────────────────────────────────── */
const labelCls =
  'block text-[10px] font-black text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-[0.16em]';
const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8191A]/20 focus:border-[#E8191A] transition-colors';
const sectionTitleCls =
  'flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400';

/* ─── Component ──────────────────────────────────────────────────────────── */
export function CertificateGenerator() {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [pronoun, setPronoun] = useState<Pronoun>('he');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPresent, setIsPresent] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState('');

  const [purpose, setPurpose] = useState('');
  const [place, setPlace] = useState('');
  const [issueDate, setIssueDate] = useState(() => toISODate(new Date()));
  const [signatoryName, setSignatoryName] = useState('John Angelo David');
  const [signatoryRole, setSignatoryRole] = useState('Owner / Founder');
  const [signatorySignature, setSignatorySignature] = useState('');
  const [sigResetSignal, setSigResetSignal] = useState(0);

  const [previewHTML, setPreviewHTML] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}smartmenu-logo.jpg`;

  /* Derived values */
  const startParsed = parseISO(startDate);
  const endParsed = parseISO(endDate);
  const tenure = tenureLabel(startParsed, isPresent ? null : endParsed);
  const dateError =
    startParsed && endParsed && endParsed < startParsed
      ? 'Ang end date ay dapat mas huli kaysa sa start date.'
      : '';
  const isReady = Boolean(
    name.trim() && position.trim() && startDate && issueDate && (isPresent || endDate) && !dateError,
  );

  const touch = () => setIsDirty(true);

  /* Keep the A4 preview scaled to the container width */
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const measure = () => setPreviewScale(Math.min(1, el.clientWidth / A4_WIDTH_PX));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewHTML]);

  const handleGenerate = () => {
    if (!isReady) return;

    const issued = parseISO(issueDate) ?? new Date();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ref = `COE-${toISODate(issued).replace(/-/g, '')}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    const data: CertificateData = {
      employeeName: name.trim(),
      position: position.trim(),
      employmentStatus,
      startDate,
      endDate: isPresent ? '' : endDate,
      purpose: purpose.trim(),
      place: place.trim(),
      issueDate,
      signatoryName: signatoryName.trim() || 'John Angelo David',
      signatoryRole: signatoryRole.trim() || 'Owner / Founder',
      pronoun,
      referenceNo: ref,
      signatorySignature,
    };

    setReferenceNo(ref);
    setPreviewHTML(buildCertificateHTML(data, logoUrl));
    setIsDirty(false);
  };

  const handleReset = () => {
    setName('');
    setPosition('');
    setPronoun('he');
    setStartDate('');
    setEndDate('');
    setIsPresent(false);
    setEmploymentStatus('');
    setPurpose('');
    setPlace('');
    setIssueDate(toISODate(new Date()));
    setSignatoryName('John Angelo David');
    setSignatoryRole('Owner / Founder');
    setSignatorySignature('');
    setSigResetSignal((n) => n + 1);
    setPreviewHTML('');
    setReferenceNo('');
    setIsDirty(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-[#E8191A]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-black">Certificate of Employment</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Buuin ang opisyal na COE at i-export bilang A4 PDF
          </p>
        </div>
      </div>

      {/* form */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 sm:p-6 shadow-sm space-y-5">

        {/* ── Employee ── */}
        <section className="space-y-4">
          <div className={sectionTitleCls}>
            <User className="w-3.5 h-3.5" />
            Employee
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); touch(); }}
                placeholder="Juan Dela Cruz"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Position / Role *</label>
              <input
                type="text"
                value={position}
                onChange={(e) => { setPosition(e.target.value); touch(); }}
                placeholder="Sales Consultant"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Pronoun</span>
            {PRONOUN_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => { setPronoun(option); touch(); }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                  pronoun === option
                    ? 'bg-black text-white'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
            <span className="text-[11px] text-zinc-400">Ginagamit sa loob ng certificate</span>
          </div>
        </section>

        <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

        {/* ── Employment period ── */}
        <section className="space-y-4">
          <div className={sectionTitleCls}>
            <Briefcase className="w-3.5 h-3.5" />
            Employment Period
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date {isPresent ? '' : '*'}</label>
              <input
                type="date"
                value={isPresent ? '' : endDate}
                onChange={(e) => { setEndDate(e.target.value); touch(); }}
                disabled={isPresent}
                className={`${inputCls} disabled:bg-zinc-50 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed`}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-bold text-zinc-500 dark:text-zinc-300 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isPresent}
              onChange={(e) => { setIsPresent(e.target.checked); setEndDate(''); touch(); }}
              className="w-4 h-4 rounded accent-[#E8191A] cursor-pointer"
            />
            Kasalukuyang empleyado — “Present” ang ilalagay
          </label>

          {tenure && !dateError && (
            <p className="text-[11px] text-zinc-400">
              Length of service: <span className="font-bold text-zinc-600 dark:text-zinc-300">{tenure}</span>
            </p>
          )}
          {dateError && (
            <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{dateError}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Employment Status</label>
              <div className="relative">
                <select
                  value={employmentStatus}
                  onChange={(e) => { setEmploymentStatus(e.target.value); touch(); }}
                  className={`${inputCls} appearance-none pr-9 cursor-pointer`}
                >
                  <option value="">Not stated</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

        {/* ── Issuance ── */}
        <section className="space-y-4">
          <div className={sectionTitleCls}>
            <PenLine className="w-3.5 h-3.5" />
            Issuance Details
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Purpose <span className="text-zinc-400 font-normal normal-case">(opsyonal)</span></label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => { setPurpose(e.target.value); touch(); }}
                placeholder="visa application, loan, employment"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Place Issued <span className="text-zinc-400 font-normal normal-case">(opsyonal)</span></label>
              <input
                type="text"
                value={place}
                onChange={(e) => { setPlace(e.target.value); touch(); }}
                placeholder="Quezon City"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Date Issued *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); touch(); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Signatory</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => { setSignatoryName(e.target.value); touch(); }}
                placeholder="John Angelo David"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Signatory Title</label>
              <input
                type="text"
                value={signatoryRole}
                onChange={(e) => { setSignatoryRole(e.target.value); touch(); }}
                placeholder="Owner / Founder"
                className={inputCls}
              />
            </div>
          </div>

          <SignaturePad
            label="Signatory E-Signature (Opsyonal)"
            value={signatorySignature}
            onChange={(url) => { setSignatorySignature(url); touch(); }}
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
          {previewHTML ? 'I-generate muli' : 'Generate Certificate'}
        </motion.button>

        <p className="text-xs text-zinc-400 text-center">
          Kailangan ang Name, Position, Start Date, at Date Issued. Kung walang End Date, i-tick ang “kasalukuyang empleyado”.
        </p>
      </div>

      {/* preview */}
      {previewHTML && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <p className="text-sm font-black text-zinc-900 dark:text-white">Preview · A4 Portrait</p>
              <p className="text-[11px] text-zinc-400">
                Ref. No. {referenceNo}
                {isDirty && (
                  <span className="ml-2 font-bold text-amber-600">· may binago, i-generate muli</span>
                )}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => printToPDF(previewHTML)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E8191A] hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-200 dark:shadow-red-900/30 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              I-download bilang PDF
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

          <div
            ref={previewWrapRef}
            className={`rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xl bg-white transition-opacity ${
              isDirty ? 'opacity-60' : 'opacity-100'
            }`}
            style={{ height: Math.round(A4_HEIGHT_PX * previewScale) }}
          >
            <iframe
              srcDoc={previewHTML}
              title="Certificate Preview"
              scrolling="no"
              style={{
                width: A4_WIDTH_PX,
                height: A4_HEIGHT_PX,
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
              <span className="font-bold">Sa print dialog:</span> Destination → “Save as PDF”, Paper → A4,
              Margins → None, at i-check ang “Background graphics” para lumabas ang pulang/amber na border,
              logo, at footer.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
