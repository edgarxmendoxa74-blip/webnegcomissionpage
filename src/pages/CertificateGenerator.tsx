import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, User, RefreshCw, Briefcase, Calendar, MapPin, Target } from 'lucide-react';

const OWNER_NAME  = 'John Angelo David';
const OWNER_TITLE = 'Owner / Founder';
const COMPANY     = 'SmartMenu';

function todayParts() {
  const d = new Date();
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('en-US', { month: 'long' }),
    year: d.getFullYear().toString().slice(-2),
    full: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

/* ─── Certificate HTML — exact match of uploaded PDF template ─────────────── */
function buildCertificateHTML(
  employeeName: string,
  logoUrl: string,
  position: string,
  dateFrom: string,
  dateTo: string,
  purpose: string,
  issuedCity: string,
  issuedDay: string,
  issuedMonth: string,
  issuedYear: string,
): string {
  const { day, month, year } = todayParts();
  const issDay   = issuedDay   || day;
  const issMon   = issuedMonth || month;
  const issYear  = issuedYear  || year;
  const issCity  = issuedCity  || 'Cebu City';
  const pos      = position    || '______________________________';
  const dFrom    = dateFrom    || '____________________';
  const dTo      = dateTo      || '____________________';
  const purp     = purpose     || '______________________________';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate of Employment – ${employeeName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  html, body {
    width: 612pt;
    height: 792pt;
    overflow: hidden;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
  }

  .page {
    width: 612pt;
    height: 792pt;
    background: #fff;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* ── Top red bar (height ~14pt at top) ── */
  .top-bar {
    width: 100%;
    height: 14pt;
    background: #E3063F;  /* rgb(0.890, 0.024, 0.075) */
    flex-shrink: 0;
  }

  /* ── Gold line ── */
  .gold-line-top {
    width: 100%;
    height: 4pt;
    background: #F9A800;  /* rgb(0.976, 0.659, 0) */
    flex-shrink: 0;
  }

  /* ── Logo section ── */
  .logo-section {
    display: flex;
    justify-content: center;
    padding: 14pt 0 0;
    flex-shrink: 0;
  }

  .logo {
    width: 115pt;
    height: 92pt;
    object-fit: contain;
  }

  /* ── Main body ── */
  .body {
    flex: 1;
    padding: 0 72pt 0;
  }

  /* Title */
  .cert-title {
    text-align: center;
    font-size: 22pt;
    font-weight: 900;
    color: #000;
    letter-spacing: 1px;
    margin-top: 4pt;
    margin-bottom: 2pt;
  }

  /* Red underline below title */
  .title-rule {
    width: 120pt;
    height: 2.5pt;
    background: #E3063F;
    margin: 0 auto 10pt;
  }

  /* Date line */
  .date-line {
    font-size: 11pt;
    color: #000;
    margin-bottom: 10pt;
  }

  /* TO WHOM IT MAY CONCERN */
  .to-whom {
    font-size: 11pt;
    font-weight: 700;
    color: #000;
    margin-bottom: 12pt;
  }

  /* Body paragraphs */
  .para {
    font-size: 11.5pt;
    color: #000;
    line-height: 18pt;
    margin-bottom: 14pt;
  }

  .para strong {
    font-weight: 700;
  }

  /* Compensation line */
  .comp-line {
    font-size: 11.5pt;
    color: #000;
    margin-bottom: 14pt;
    line-height: 18pt;
  }

  /* Issued line */
  .issued-line {
    font-size: 11.5pt;
    color: #000;
    line-height: 18pt;
    margin-bottom: 24pt;
  }

  /* Signature block */
  .sig-area {
    margin-top: 4pt;
  }

  .sig-line {
    width: 188pt;
    height: 0.8pt;
    background: #000;
    margin-bottom: 2.5pt;
  }

  .sig-name {
    font-size: 12pt;
    font-weight: 700;
    color: #000;
    margin-bottom: 1pt;
  }

  .sig-title {
    font-size: 11pt;
    color: #000;
    margin-bottom: 1pt;
  }

  .sig-company {
    font-size: 11pt;
    font-weight: 700;
    color: #E3063F;
  }

  /* ── Bottom gold line ── */
  .gold-line-bottom {
    width: 100%;
    height: 1.5pt;
    background: #F9A800;
    flex-shrink: 0;
    /* this is drawn as rule at y=52 in PDF — push it via flex */
    margin-top: auto;
  }

  /* ── Footer tagline ── */
  .footer-tagline {
    text-align: center;
    font-size: 9.5pt;
    font-style: italic;
    color: #555;
    padding: 4pt 0;
    flex-shrink: 0;
  }

  /* ── Bottom red bar ── */
  .bottom-bar {
    width: 100%;
    height: 10pt;
    background: #E3063F;
    flex-shrink: 0;
  }

  @page { size: letter portrait; margin: 0; }
  @media print { html, body { width: 612pt; height: 792pt; } }
</style>
</head>
<body>
<div class="page">

  <div class="top-bar"></div>
  <div class="gold-line-top"></div>

  <div class="logo-section">
    <img src="${logoUrl}" alt="SmartMenu" class="logo"/>
  </div>

  <div class="body">

    <div class="cert-title">CERTIFICATE OF EMPLOYMENT</div>
    <div class="title-rule"></div>

    <div class="date-line">Date: ____________________</div>

    <div class="to-whom">TO WHOM IT MAY CONCERN:</div>

    <p class="para">
      This is to certify that <strong>${employeeName}</strong> has been employed with
      <strong>SmartMenu</strong> as <strong>${pos}</strong> from <strong>${dFrom}</strong> to <strong>${dTo}</strong>.
    </p>

    <p class="para">
      During the period of employment, he/she has rendered services with diligence,
      professionalism, and dedication, and has performed his/her duties and responsibilities
      satisfactorily.
    </p>

    <p class="comp-line">
      Monthly compensation (optional): PHP ______________________
    </p>

    <p class="para">
      This certification is being issued upon the request of the above-named person for
      <strong>${purp}</strong> purposes, and for whatever legal purpose it may serve.
    </p>

    <p class="issued-line">
      Issued this <strong>${issDay}</strong> day of <strong>${issMon}</strong>, 20<strong>${issYear}</strong>, at
      <strong>${issCity}</strong>, Philippines.
    </p>

    <div class="sig-area">
      <div class="sig-line"></div>
      <div class="sig-name">${OWNER_NAME}</div>
      <div class="sig-title">${OWNER_TITLE}</div>
      <div class="sig-company">${COMPANY}</div>
    </div>

  </div>

  <div class="gold-line-bottom"></div>
  <div class="footer-tagline">GROWING RESTAURANTS. TOGETHER.</div>
  <div class="bottom-bar"></div>

</div>
</body>
</html>`;
}

/* ─── Print via iframe ───────────────────────────────────────────────────── */
function printToPDF(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:612pt;height:792pt;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow?.addEventListener('load', () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    }, 800);
  });
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export function CertificateGenerator() {
  const [name, setName]               = useState('');
  const [position, setPosition]       = useState('Sales Consultant');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('present');
  const [purpose, setPurpose]         = useState('reference');
  const [issuedCity, setIssuedCity]   = useState('Cebu City');
  const { day, month, year }          = todayParts();
  const [issuedDay, setIssuedDay]     = useState(day);
  const [issuedMonth, setIssuedMonth] = useState(month);
  const [issuedYear]                  = useState(year);
  const [previewing, setPreviewing]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');

  const logoUrl = `${window.location.origin}/smartmenu-logo.jpg`;

  const handleGenerate = () => {
    if (!name.trim()) return;
    setIsGenerating(true);
    const html = buildCertificateHTML(
      name.trim(), logoUrl, position, dateFrom, dateTo,
      purpose, issuedCity, issuedDay, issuedMonth, issuedYear
    );
    setPreviewHTML(html);
    setPreviewing(true);
    setIsGenerating(false);
  };

  const handleDownloadPDF = () => {
    if (!previewHTML) return;
    printToPDF(previewHTML);
  };

  const handleReset = () => {
    setName('');
    setPreviewing(false);
    setPreviewHTML('');
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border-2 border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#E3063F] transition-colors text-sm font-medium";
  const labelCls = "block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-[#E3063F]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Certificate of Employment</h1>
          <p className="text-sm text-zinc-500">I-generate ang official PDF certificate para sa empleyado</p>
        </div>
      </div>

      {/* form */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">

        {/* Row 1: Full Name */}
        <div>
          <label className={labelCls}>Full Name ng Empleyado *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text" value={name}
              onChange={(e) => { setName(e.target.value); setPreviewing(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Juan Dela Cruz"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* Row 2: Position */}
        <div>
          <label className={labelCls}>Posisyon / Job Title</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text" value={position}
              onChange={(e) => { setPosition(e.target.value); setPreviewing(false); }}
              placeholder="Sales Consultant"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* Row 3: Date From / To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPreviewing(false); }}
                placeholder="e.g. January 2025"
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPreviewing(false); }}
                placeholder="present"
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
        </div>

        {/* Row 4: Purpose */}
        <div>
          <label className={labelCls}>Layunin (Purpose)</label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text" value={purpose}
              onChange={(e) => { setPurpose(e.target.value); setPreviewing(false); }}
              placeholder="reference / loan / visa / etc."
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>

        {/* Row 5: Issuance details */}
        <div>
          <label className={labelCls}>Lugar at Petsa ng Pag-isyu</label>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text" value={issuedCity}
                  onChange={(e) => { setIssuedCity(e.target.value); setPreviewing(false); }}
                  placeholder="City"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>
            <input type="text" value={issuedDay}
              onChange={(e) => { setIssuedDay(e.target.value); setPreviewing(false); }}
              placeholder="Day"
              className={inputCls}
            />
            <input type="text" value={issuedMonth}
              onChange={(e) => { setIssuedMonth(e.target.value); setPreviewing(false); }}
              placeholder="Month"
              className={inputCls}
            />
          </div>
          <p className="text-[10px] text-zinc-400 mt-1.5">
            Year defaults to current year (20{year}). Issued this [Day] day of [Month], 20{issuedYear}, at [City], Philippines.
          </p>
        </div>

        {/* Generate button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={!name.trim() || isGenerating}
          className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            !name.trim() || isGenerating
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              : 'bg-[#E3063F] hover:bg-red-700 text-white shadow-lg shadow-red-200 cursor-pointer'
          }`}
        >
          <FileText className="w-4 h-4" />
          {isGenerating ? 'Generating...' : 'Generate Certificate Preview'}
        </motion.button>
      </div>

      {/* preview */}
      {previewing && previewHTML && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E3063F] hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-200"
            >
              <Download className="w-4 h-4" />
              I-download bilang PDF
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl font-bold text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Bago Muli
            </motion.button>
            <span className="text-xs text-zinc-400 ml-auto hidden sm:block">
              Sa print dialog → Destination → "Save as PDF"
            </span>
          </div>

          <div className="rounded-2xl overflow-hidden border-2 border-zinc-200 shadow-xl">
            <iframe
              srcDoc={previewHTML}
              title="Certificate Preview"
              className="w-full block"
              style={{ height: '750px', border: 'none', background: '#fff' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
