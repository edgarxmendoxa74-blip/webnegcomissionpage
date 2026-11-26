import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, User, RefreshCw } from 'lucide-react';

const OWNER_NAME  = 'John Angelo David';
const OWNER_TITLE = 'Founder & Owner';
const COMPANY     = 'SmartMenu';

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
<title>Certificate of Employment – ${employeeName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=EB+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  html, body {
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    background: #fff;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* ── Corner ornaments ── */
  .corner {
    position: absolute;
    width: 22mm;
    height: 22mm;
    z-index: 2;
  }
  .corner svg { width: 100%; height: 100%; }
  .corner.tl { top: 6mm; left: 6mm; }
  .corner.tr { top: 6mm; right: 6mm; transform: scaleX(-1); }
  .corner.bl { bottom: 6mm; left: 6mm; transform: scaleY(-1); }
  .corner.br { bottom: 6mm; right: 6mm; transform: scale(-1); }

  /* ── Outer border ── */
  .outer-border {
    position: absolute;
    top: 5mm; left: 5mm; right: 5mm; bottom: 5mm;
    border: 2.5px solid #E8191A;
    z-index: 1;
  }

  /* ── Inner border ── */
  .inner-border {
    position: absolute;
    top: 7.5mm; left: 7.5mm; right: 7.5mm; bottom: 7.5mm;
    border: 0.8px solid #F5A623;
    z-index: 1;
  }

  /* ── Top band ── */
  .top-band {
    width: 100%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 14mm;
    padding-bottom: 5mm;
    position: relative;
    z-index: 3;
  }

  .logo-wrap {
    width: 28mm;
    height: 28mm;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #F5A623;
    box-shadow: 0 0 0 4px rgba(232,25,26,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 3.5mm;
  }

  .logo {
    width: 24mm;
    height: 24mm;
    object-fit: contain;
  }

  .brand-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 15pt;
    font-weight: 700;
    color: #E8191A;
    letter-spacing: 3px;
    line-height: 1;
    margin-bottom: 1mm;
  }
  .brand-name span { color: #1a1a1a; }

  .tagline {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 500;
    letter-spacing: 3px;
    color: #F5A623;
    text-transform: uppercase;
  }

  /* ── Gold divider ── */
  .gold-divider {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3mm;
    padding: 0 20mm;
    margin-bottom: 5mm;
    flex-shrink: 0;
    position: relative;
    z-index: 3;
  }
  .gold-divider .line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, #F5A623, #E8191A, #F5A623, transparent); }
  .gold-divider .diamond {
    width: 3mm; height: 3mm;
    background: #E8191A;
    transform: rotate(45deg);
    flex-shrink: 0;
  }

  /* ── Body ── */
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 22mm 6mm;
    text-align: center;
    position: relative;
    z-index: 3;
  }

  .doc-label {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 600;
    letter-spacing: 5px;
    color: #bbb;
    text-transform: uppercase;
    margin-bottom: 2mm;
  }

  .cert-title {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 22pt;
    font-weight: 900;
    color: #1a1a1a;
    line-height: 1.1;
    margin-bottom: 2mm;
    letter-spacing: 1px;
  }

  .cert-title-sub {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 9pt;
    font-weight: 400;
    color: #E8191A;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-bottom: 7mm;
  }

  .certify-text {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 11pt;
    font-style: italic;
    color: #777;
    margin-bottom: 3mm;
  }

  .employee-name {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 29pt;
    font-weight: 600;
    font-style: italic;
    color: #1a1a1a;
    line-height: 1.1;
    margin-bottom: 2mm;
  }

  .name-rule {
    width: 80mm;
    height: 1.5px;
    background: linear-gradient(to right, transparent, #E8191A, transparent);
    margin: 0 auto 7mm;
  }

  .body-para {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 11pt;
    font-weight: 400;
    color: #555;
    line-height: 2;
    max-width: 148mm;
    margin-bottom: 7mm;
  }

  .body-para strong { color: #1a1a1a; font-weight: 600; }

  .issued-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1mm;
    margin-bottom: 8mm;
  }

  .issued-label {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 600;
    color: #ccc;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .issued-date {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 10.5pt;
    font-style: italic;
    color: #555;
  }

  /* ── Signature ── */
  .sig-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sig-line {
    width: 55mm;
    height: 1px;
    background: linear-gradient(to right, transparent, #333, transparent);
    margin-bottom: 2.5mm;
  }

  .sig-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1mm;
    letter-spacing: 1px;
  }

  .sig-title {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 7pt;
    font-weight: 600;
    color: #E8191A;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 0.5mm;
  }

  .sig-co {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 6.5pt;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  /* ── Bottom band ── */
  .bottom-band {
    width: 100%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 14mm;
    position: relative;
    z-index: 3;
  }

  .bottom-stripe {
    width: 100%;
    padding: 2.5mm 0;
    background: #E8191A;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2.5mm;
  }

  .bottom-logo {
    width: 6mm; height: 6mm;
    object-fit: contain;
    filter: brightness(0) invert(1);
    opacity: 0.85;
  }

  .bottom-text {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 600;
    color: rgba(255,255,255,0.80);
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }

  .amber-bottom { width:100%; height:2.5px; background:#F5A623; }

  /* ── Watermark ── */
  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-family: 'Cinzel', Georgia, serif;
    font-size: 60pt;
    font-weight: 900;
    color: rgba(232,25,26,0.04);
    letter-spacing: 8px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 0;
    user-select: none;
  }

  @page { size: A4 portrait; margin: 0; }
  @media print { html, body { width: 210mm; height: 297mm; } }
</style>
</head>
<body>
<div class="page">

  <!-- decorative borders -->
  <div class="outer-border"></div>
  <div class="inner-border"></div>

  <!-- watermark -->
  <div class="watermark">SmartMenu</div>

  <!-- corner ornaments -->
  <div class="corner tl">
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 L4 56" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M4 4 L56 4" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 4 Q10 10 4 10" stroke="#F5A623" stroke-width="1.2" fill="none"/>
      <circle cx="4" cy="4" r="2.5" fill="#E8191A"/>
      <path d="M4 18 L18 4" stroke="#F5A623" stroke-width="0.8" stroke-dasharray="2 2"/>
    </svg>
  </div>
  <div class="corner tr">
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 L4 56" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M4 4 L56 4" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 4 Q10 10 4 10" stroke="#F5A623" stroke-width="1.2" fill="none"/>
      <circle cx="4" cy="4" r="2.5" fill="#E8191A"/>
      <path d="M4 18 L18 4" stroke="#F5A623" stroke-width="0.8" stroke-dasharray="2 2"/>
    </svg>
  </div>
  <div class="corner bl">
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 L4 56" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M4 4 L56 4" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 4 Q10 10 4 10" stroke="#F5A623" stroke-width="1.2" fill="none"/>
      <circle cx="4" cy="4" r="2.5" fill="#E8191A"/>
      <path d="M4 18 L18 4" stroke="#F5A623" stroke-width="0.8" stroke-dasharray="2 2"/>
    </svg>
  </div>
  <div class="corner br">
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 L4 56" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M4 4 L56 4" stroke="#E8191A" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 4 Q10 10 4 10" stroke="#F5A623" stroke-width="1.2" fill="none"/>
      <circle cx="4" cy="4" r="2.5" fill="#E8191A"/>
      <path d="M4 18 L18 4" stroke="#F5A623" stroke-width="0.8" stroke-dasharray="2 2"/>
    </svg>
  </div>

  <!-- top branding band -->
  <div class="top-band">
    <div class="logo-wrap">
      <img src="${logoUrl}" alt="SmartMenu" class="logo"/>
    </div>
    <div class="brand-name"><span>Smart</span>Menu</div>
    <div class="tagline">Growing Restaurants. Together.</div>
  </div>

  <!-- decorative gold divider -->
  <div class="gold-divider">
    <div class="line"></div>
    <div class="diamond"></div>
    <div class="line"></div>
  </div>

  <!-- main content -->
  <div class="body">
    <div class="doc-label">Official Document</div>
    <div class="cert-title">Certificate of Employment</div>
    <div class="cert-title-sub">Sales Consultant</div>

    <div class="certify-text">This is to certify that</div>
    <div class="employee-name">${employeeName}</div>
    <div class="name-rule"></div>

    <p class="body-para">
      is a <strong>bonafide and active employee</strong> of <strong>SmartMenu</strong>.<br/>
      This certificate is issued upon the request of the above-named person
      for whatever legal purpose it may serve.
    </p>

    <div class="issued-wrap">
      <span class="issued-label">Date Issued</span>
      <span class="issued-date">${date}</span>
    </div>

    <div class="sig-wrap">
      <div class="sig-line"></div>
      <div class="sig-name">${OWNER_NAME}</div>
      <div class="sig-title">${OWNER_TITLE}</div>
      <div class="sig-co">${COMPANY}</div>
    </div>
  </div>

  <!-- bottom band -->
  <div class="bottom-band">
    <div class="amber-bottom"></div>
    <div class="bottom-stripe">
      <img src="${logoUrl}" alt="" class="bottom-logo"/>
      <span class="bottom-text">SmartMenu &nbsp;·&nbsp; Growing Restaurants. Together.</span>
    </div>
  </div>

</div>
</body>
</html>`;
}

/* ─── Print via iframe ───────────────────────────────────────────────────── */
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
  const [name, setName]               = useState('');
  const [previewing, setPreviewing]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');

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
          I-type ang buong pangalan, tapos pindutin ang Generate para makita ang preview.
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
              style={{ height: '600px', border: 'none', background: '#fff' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
