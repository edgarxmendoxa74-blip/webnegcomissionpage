import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, User, RefreshCw } from 'lucide-react';

/* ─── constants ──────────────────────────────────────────────────────────── */
const OWNER_NAME  = 'John Angelo David';
const OWNER_TITLE = 'Founder & Owner';
const COMPANY     = 'SmartMenu';
const TAGLINE     = 'Growing Restaurants. Together.';

function todayFormatted() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ─── Certificate HTML ───────────────────────────────────────────────────── */
function buildCertificateHTML(employeeName: string, logoUrl: string): string {
  const date = todayFormatted();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate of Employment</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Montserrat:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  html, body {
    width: 297mm; height: 210mm;
    overflow: hidden;
    background: #0d0d0d;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ══ PAGE SHELL ══════════════════════════════════════════════════════════ */
  .page {
    width: 297mm; height: 210mm;
    position: relative;
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
  }

  /* ── deep red top band ── */
  .top-band {
    background: linear-gradient(135deg, #8B0000 0%, #C0121A 50%, #E8191A 100%);
    height: 28mm;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 20mm;
    flex-shrink: 0;
  }

  /* diagonal cut on top-band */
  .top-band::after {
    content: '';
    position: absolute;
    bottom: -8mm; left: 0; right: 0;
    height: 10mm;
    background: #fff;
    clip-path: polygon(0 100%, 100% 100%, 100% 0);
  }

  /* ── amber accent line under top-band ── */
  .amber-rule {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(to right, #F5A623, #FFD700, #F5A623);
  }

  /* ── header logo ── */
  .header-logo {
    width: 18mm; height: 18mm;
    object-fit: contain;
    filter: brightness(0) invert(1);
    position: relative; z-index: 2;
    margin-right: 5mm;
    flex-shrink: 0;
  }

  /* ── header text ── */
  .header-text { text-align: center; position: relative; z-index: 2; }

  .header-eyebrow {
    font-family: 'Montserrat', sans-serif;
    font-size: 6pt; font-weight: 700;
    letter-spacing: 5px;
    color: rgba(255,255,255,0.65);
    text-transform: uppercase;
    margin-bottom: 1.5mm;
  }

  .header-title {
    font-family: 'Cinzel', serif;
    font-size: 20pt; font-weight: 900;
    color: #fff;
    letter-spacing: 4px;
    text-transform: uppercase;
    line-height: 1;
    text-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  .header-subtitle {
    font-family: 'Cinzel', serif;
    font-size: 9pt; font-weight: 400;
    color: rgba(255,255,255,0.75);
    letter-spacing: 8px;
    text-transform: uppercase;
    margin-top: 1.5mm;
  }

  /* ══ BODY ════════════════════════════════════════════════════════════════ */
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10mm 24mm 6mm;
    position: relative;
  }

  /* ── watermark ── */
  .watermark {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 85mm; height: 85mm;
    opacity: 0.035;
    pointer-events: none;
  }
  .watermark img { width: 100%; height: 100%; object-fit: contain; }

  /* ── left border ornament ── */
  .body::before {
    content: '';
    position: absolute;
    left: 8mm; top: 8mm; bottom: 8mm;
    width: 3px;
    background: linear-gradient(to bottom, transparent, #E8191A 20%, #E8191A 80%, transparent);
  }

  /* ── right border ornament ── */
  .body::after {
    content: '';
    position: absolute;
    right: 8mm; top: 8mm; bottom: 8mm;
    width: 3px;
    background: linear-gradient(to bottom, transparent, #F5A623 20%, #F5A623 80%, transparent);
  }

  .to-whom {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 9.5pt; font-style: italic;
    color: #aaa;
    letter-spacing: 1px;
    margin-bottom: 3mm;
  }

  .certify-line {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 12pt; font-style: italic;
    color: #666;
    margin-bottom: 3mm;
  }

  /* ── employee name ── */
  .name-wrap {
    position: relative;
    text-align: center;
    margin-bottom: 4mm;
  }

  .employee-name {
    font-family: 'Cinzel', serif;
    font-size: 30pt; font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 2px;
    line-height: 1.1;
    display: block;
  }

  /* red glow under name */
  .name-glow {
    display: block;
    height: 2px;
    margin: 1.5mm auto 0;
    width: 80%;
    background: linear-gradient(to right, transparent, #E8191A 25%, #E8191A 75%, transparent);
  }

  /* ── ornamental divider ── */
  .ornament {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    margin: 0 0 4mm;
  }
  .ornament .bar { flex: 1; height: 1px; background: #ddd; }
  .ornament .gem {
    width: 6px; height: 6px;
    transform: rotate(45deg);
    flex-shrink: 0;
  }

  /* ── body paragraph ── */
  .body-text {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 11.5pt;
    color: #444;
    line-height: 1.85;
    text-align: center;
    max-width: 185mm;
  }
  .body-text .em  { color: #E8191A; font-weight: 600; }
  .body-text .em2 { color: #8B0000; font-style: italic; }

  /* ══ FOOTER ══════════════════════════════════════════════════════════════ */
  .footer-band {
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    height: 24mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16mm;
    flex-shrink: 0;
    position: relative;
  }

  /* diagonal cut on footer-band top */
  .footer-band::before {
    content: '';
    position: absolute;
    top: -8mm; left: 0; right: 0;
    height: 10mm;
    background: #fff;
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  /* amber top rule on footer */
  .footer-rule {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(to right, #F5A623, #FFD700, #F5A623);
  }

  /* left: issue date */
  .footer-left {
    display: flex;
    flex-direction: column;
    gap: 1mm;
    min-width: 55mm;
  }
  .footer-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 5.5pt; font-weight: 700;
    color: #F5A623;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .footer-date {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 9.5pt; font-style: italic;
    color: rgba(255,255,255,0.75);
  }

  /* center: signature */
  .sig-block {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1mm;
    min-width: 70mm;
  }
  .sig-line {
    width: 60mm; height: 1px;
    background: rgba(255,255,255,0.3);
    margin-bottom: 1.5mm;
  }
  .sig-name {
    font-family: 'Cinzel', serif;
    font-size: 11pt; font-weight: 700;
    color: #fff;
    letter-spacing: 1px;
  }
  .sig-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 6.5pt; font-weight: 600;
    color: #F5A623;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }
  .sig-company {
    font-family: 'Montserrat', sans-serif;
    font-size: 6pt; font-weight: 400;
    color: rgba(255,255,255,0.4);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* right: branding */
  .footer-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1.5mm;
    min-width: 55mm;
  }
  .footer-logo {
    width: 14mm; height: 14mm;
    object-fit: contain;
    filter: brightness(0) invert(1);
    opacity: 0.85;
  }
  .footer-tagline {
    font-family: 'Montserrat', sans-serif;
    font-size: 5.5pt; font-weight: 700;
    color: #F5A623;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }

  /* ══ BORDER FRAME ════════════════════════════════════════════════════════ */
  .frame {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
  }
  /* red outer ring */
  .frame::before {
    content: '';
    position: absolute;
    inset: 4mm;
    border: 2.5px solid rgba(232,25,26,0.25);
  }
  /* amber inner ring */
  .frame::after {
    content: '';
    position: absolute;
    inset: 6mm;
    border: 1px solid rgba(245,166,35,0.2);
  }

  /* ── print ── */
  @page { size: A4 landscape; margin: 0; }
  @media print {
    html, body { width:297mm; height:210mm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- absolute frame rings -->
  <div class="frame"></div>

  <!-- ═══ TOP BAND ═══ -->
  <div class="top-band">
    <div class="amber-rule"></div>
    <img src="${logoUrl}" alt="SmartMenu" class="header-logo"/>
    <div class="header-text">
      <div class="header-eyebrow">${COMPANY} &nbsp;·&nbsp; Official Human Resources Document</div>
      <div class="header-title">Certificate of Employment</div>
      <div class="header-subtitle">Republic of the Philippines</div>
    </div>
  </div>

  <!-- ═══ BODY ═══ -->
  <div class="body">

    <!-- watermark -->
    <div class="watermark"><img src="${logoUrl}" alt=""/></div>

    <div class="to-whom">To Whom It May Concern:</div>
    <div class="certify-line">This is to certify that</div>

    <div class="name-wrap">
      <span class="employee-name">${employeeName}</span>
      <span class="name-glow"></span>
    </div>

    <div class="ornament">
      <div class="bar"></div>
      <div class="gem" style="background:#F5A623"></div>
      <div class="gem" style="background:#E8191A;width:8px;height:8px"></div>
      <div class="gem" style="background:#F5A623"></div>
      <div class="bar"></div>
    </div>

    <p class="body-text">
      is a <span class="em">bonafide and active employee</span> of
      <span class="em">SmartMenu</span>,
      a company duly registered and operating under Philippine laws.<br/>
      This certificate is issued upon the
      <span class="em2">personal request</span> of the above-named employee
      for whatever legal purpose it may serve.
    </p>

  </div>

  <!-- ═══ FOOTER BAND ═══ -->
  <div class="footer-band">
    <div class="footer-rule"></div>

    <div class="footer-left">
      <div class="footer-label">Date Issued</div>
      <div class="footer-date">${date}</div>
    </div>

    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${OWNER_NAME}</div>
      <div class="sig-title">${OWNER_TITLE}</div>
      <div class="sig-company">${COMPANY}</div>
    </div>

    <div class="footer-right">
      <img src="${logoUrl}" alt="${COMPANY}" class="footer-logo"/>
      <div class="footer-tagline">${TAGLINE}</div>
    </div>

  </div>
</div>
</body>
</html>`;
}

/* ─── Print via hidden iframe → Save as PDF ─────────────────────────────── */
function printToPDF(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

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
  const [name, setName]             = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHTML, setPreviewHTML]   = useState('');

  const logoUrl = `${window.location.origin}/smartmenu-logo.jpg`;

  const handleGenerate = () => {
    if (!name.trim()) return;
    setIsGenerating(true);
    const html = buildCertificateHTML(name.trim(), logoUrl);
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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

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

      {/* input */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm">
        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-widest">
          Full Name ng Empleyado *
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setPreviewing(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Juan Dela Cruz"
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm font-medium"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={!name.trim() || isGenerating}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shrink-0 ${
              !name.trim() || isGenerating
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-[#E8191A] hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 cursor-pointer'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </motion.button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          I-type ang buong pangalan ng empleyado, tapos pindutin ang Generate para makita ang preview.
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

          <div className="rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-2xl bg-zinc-900">
            <iframe
              srcDoc={previewHTML}
              title="Certificate Preview"
              className="w-full block"
              style={{ height: '530px', border: 'none' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
