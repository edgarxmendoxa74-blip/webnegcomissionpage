import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, User, RefreshCw } from 'lucide-react';

function todayFormatted() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function todayParts() {
  const d = new Date();
  return {
    day:   d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'long' }),
    year:  d.getFullYear(),
  };
}

/* ─── Certificate HTML — matches the official SmartMenu template ─────────── */
function buildCertificateHTML(
  employeeName: string,
  position: string,
  startDate: string,
  endDate: string,
  purpose: string,
  logoUrl: string,
): string {
  const { day, month, year } = todayParts();
  const issueDate = todayFormatted();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate of Employment – ${employeeName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  html, body {
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  /* ── header stripes (matches template: red top, amber below) ── */
  .stripe-red-top  { width:100%; height:9px;  background:#E8191A; flex-shrink:0; }
  .stripe-amber    { width:100%; height:4px;  background:#F5A623; flex-shrink:0; }

  /* ── content area ── */
  .content {
    flex: 1;
    padding: 14mm 20mm 10mm;
    display: flex;
    flex-direction: column;
  }

  /* ── logo block ── */
  .logo-block {
    text-align: center;
    margin-bottom: 8mm;
  }

  .logo-img {
    width: 36mm;
    height: 36mm;
    object-fit: contain;
  }

  /* ── amber divider (below logo, above CERTIFICATE title) ── */
  .amber-rule {
    width: 100%;
    height: 2px;
    background: #F5A623;
    margin-bottom: 7mm;
  }

  /* ── CERTIFICATE OF EMPLOYMENT title ── */
  .cert-title {
    text-align: center;
    font-size: 20pt;
    font-weight: 700;
    color: #111;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 2mm;
    line-height: 1.1;
  }

  /* red underline under title (matches template) */
  .cert-title-rule {
    width: 55mm;
    height: 3px;
    background: #E8191A;
    margin: 0 auto 10mm;
  }

  /* ── body text ── */
  .body-text {
    font-size: 10.5pt;
    color: #111;
    line-height: 1.8;
    flex: 1;
  }

  .body-text p { margin-bottom: 5mm; }

  /* inline blank lines */
  .blank {
    display: inline-block;
    min-width: 55mm;
    border-bottom: 1px solid #111;
    vertical-align: bottom;
    margin: 0 1mm;
  }

  .blank-short  { min-width: 30mm; }
  .blank-medium { min-width: 45mm; }
  .blank-long   { min-width: 65mm; }

  /* bold SmartMenu brand inside body */
  .brand { font-weight: 700; }

  /* ── signature block ── */
  .sig-area {
    margin-top: 10mm;
  }

  .sig-line {
    width: 65mm;
    height: 1px;
    background: #111;
    margin-bottom: 2.5mm;
  }

  .sig-name {
    font-size: 11pt;
    font-weight: 700;
    color: #111;
    margin-bottom: 0.5mm;
  }

  .sig-role {
    font-size: 10pt;
    color: #333;
    margin-bottom: 0.5mm;
  }

  .sig-company {
    font-size: 10.5pt;
    font-weight: 700;
    color: #E8191A;
  }

  /* ── footer ── */
  .footer {
    text-align: center;
    font-size: 9pt;
    font-style: italic;
    color: #555;
    padding: 4mm 0 3mm;
    letter-spacing: 1px;
  }

  .stripe-amber-bot { width:100%; height:4px;  background:#F5A623; flex-shrink:0; }
  .stripe-red-bot   { width:100%; height:9px;  background:#E8191A; flex-shrink:0; }

  @page { size: A4 portrait; margin: 0; }
  @media print { html, body { width: 210mm; height: 297mm; } }
</style>
</head>
<body>
<div class="page">

  <div class="stripe-red-top"></div>
  <div class="stripe-amber"></div>

  <div class="content">

    <!-- LOGO -->
    <div class="logo-block">
      <img src="${logoUrl}" alt="SmartMenu" class="logo-img"/>
    </div>

    <!-- divider -->
    <div class="amber-rule"></div>

    <!-- title -->
    <div class="cert-title">Certificate of Employment</div>
    <div class="cert-title-rule"></div>

    <!-- body -->
    <div class="body-text">

      <p>Date: <span class="blank blank-medium">${issueDate}</span></p>

      <p><strong>TO WHOM IT MAY CONCERN:</strong></p>

      <p>
        This is to certify that
        <span class="blank blank-long">${employeeName}</span>
        has been employed with
        <span class="brand">SmartMenu</span> as
        <span class="blank blank-long">${position}</span>
        from
        <span class="blank blank-medium">${startDate}</span>
        to
        <span class="blank blank-medium">${endDate}</span>.
      </p>

      <p>
        During the period of employment, he/she has rendered services with diligence,
        professionalism, and dedication, and has performed his/her duties and responsibilities
        satisfactorily.
      </p>

      <p>
        Monthly compensation (optional): <strong>PHP</strong>
        <span class="blank blank-medium"></span>
      </p>

      <p>
        This certification is being issued upon the request of the above-named person for
        <span class="blank blank-long">${purpose}</span>
        purposes, and for whatever legal purpose it may serve.
      </p>

      <p>
        Issued this
        <span class="blank blank-short">${day}</span>
        day of
        <span class="blank blank-medium">${month}</span>,
        <strong>20</strong><span class="blank blank-short">${String(year).slice(2)}</span>,
        at
        <span class="blank blank-long"></span>, Philippines.
      </p>

    </div>

    <!-- SIGNATURE -->
    <div class="sig-area">
      <div class="sig-line"></div>
      <div class="sig-name">John Angelo David</div>
      <div class="sig-role">Owner / Founder</div>
      <div class="sig-company">SmartMenu</div>
    </div>

    <!-- FOOTER TAGLINE -->
    <div class="footer">GROWING RESTAURANTS. TOGETHER.</div>

  </div>

  <div class="stripe-amber-bot"></div>
  <div class="stripe-red-bot"></div>

</div>
</body>
</html>`;
}

/* ─── Print via iframe → Save as PDF ─────────────────────────────────────── */
function printToPDF(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:0;visibility:hidden;';
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
  const [name,      setName]      = useState('');
  const [position,  setPosition]  = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [purpose,   setPurpose]   = useState('');
  const [previewing, setPreviewing]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHTML, setPreviewHTML]   = useState('');

  const logoUrl = `${window.location.origin}/smartmenu-logo.jpg`;

  const isReady = name.trim() && position.trim() && startDate.trim() && endDate.trim();

  const handleGenerate = () => {
    if (!isReady) return;
    setIsGenerating(true);
    const html = buildCertificateHTML(
      name.trim(),
      position.trim(),
      startDate.trim(),
      endDate.trim(),
      purpose.trim() || 'general',
      logoUrl,
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
    setName(''); setPosition(''); setStartDate('');
    setEndDate(''); setPurpose('');
    setPreviewing(false); setPreviewHTML('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-[#E8191A]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Certificate of Employment</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            I-generate ang official PDF certificate para sa empleyado
          </p>
        </div>
      </div>

      {/* form */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm space-y-4">

        {/* Row 1: Name + Position */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-widest">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text" value={name}
                onChange={(e) => { setName(e.target.value); setPreviewing(false); }}
                placeholder="Juan Dela Cruz"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-widest">
              Position / Role *
            </label>
            <input
              type="text" value={position}
              onChange={(e) => { setPosition(e.target.value); setPreviewing(false); }}
              placeholder="Sales Consultant"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm"
            />
          </div>
        </div>

        {/* Row 2: Start Date + End Date */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-widest">
              Start Date *
            </label>
            <input
              type="text" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPreviewing(false); }}
              placeholder="January 1, 2024"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-widest">
              End Date *
            </label>
            <input
              type="text" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPreviewing(false); }}
              placeholder="Present  or  December 31, 2024"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm"
            />
          </div>
        </div>

        {/* Row 3: Purpose (optional) */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-widest">
            Purpose <span className="text-zinc-400 font-normal normal-case">(opsyonal)</span>
          </label>
          <input
            type="text" value={purpose}
            onChange={(e) => { setPurpose(e.target.value); setPreviewing(false); }}
            placeholder="visa application, loan, etc."
            className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm"
          />
        </div>

        {/* Generate button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={!isReady || isGenerating}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            !isReady || isGenerating
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-[#E8191A] hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 cursor-pointer'
          }`}
        >
          <FileText className="w-4 h-4" />
          {isGenerating ? 'Generating...' : 'Generate Certificate'}
        </motion.button>

        <p className="text-xs text-zinc-400 text-center">
          Kumpletuhin ang Name, Position, at Dates para ma-enable ang Generate.
        </p>
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E8191A] hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-200 dark:shadow-red-900/30"
            >
              <Download className="w-4 h-4" />
              I-download bilang PDF
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Bago Muli
            </motion.button>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto hidden sm:block">
              Sa print dialog → Destination → "Save as PDF"
            </span>
          </div>

          <div className="rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-xl">
            <iframe
              srcDoc={previewHTML}
              title="Certificate Preview"
              className="w-full block"
              style={{ height: '640px', border: 'none', background: '#fff' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
