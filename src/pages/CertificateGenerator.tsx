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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

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
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  /* ─ red top stripe ─ */
  .top-stripe {
    width: 100%;
    height: 10mm;
    background: #E8191A;
    flex-shrink: 0;
  }

  /* ─ amber line ─ */
  .amber-line {
    width: 100%;
    height: 3px;
    background: #F5A623;
    flex-shrink: 0;
  }

  /* ─ main body ─ */
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10mm 22mm 8mm;
    text-align: center;
  }

  .logo {
    width: 30mm;
    height: 30mm;
    object-fit: contain;
    margin-bottom: 4mm;
  }

  .company-name {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 10.5pt;
    font-weight: 700;
    letter-spacing: 4px;
    color: #E8191A;
    text-transform: uppercase;
    margin-bottom: 1mm;
  }

  .tagline {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 7pt;
    font-weight: 400;
    letter-spacing: 2px;
    color: #F5A623;
    text-transform: uppercase;
    margin-bottom: 7mm;
  }

  .divider-line {
    width: 50mm;
    height: 1px;
    background: #e8e8e8;
    margin: 0 auto 7mm;
  }

  .doc-label {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: 5px;
    color: #bbb;
    text-transform: uppercase;
    margin-bottom: 2mm;
  }

  .cert-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 25pt;
    font-weight: 900;
    color: #1a1a1a;
    line-height: 1;
    margin-bottom: 9mm;
  }

  .certify-text {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 9.5pt;
    color: #888;
    margin-bottom: 4mm;
  }

  .employee-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26pt;
    font-weight: 700;
    font-style: italic;
    color: #1a1a1a;
    line-height: 1.1;
    margin-bottom: 3mm;
  }

  .name-rule {
    width: 70mm;
    height: 2px;
    background: #E8191A;
    margin: 0 auto 7mm;
  }

  .body-para {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 9.5pt;
    font-weight: 400;
    color: #555;
    line-height: 1.85;
    max-width: 148mm;
    margin-bottom: 9mm;
  }

  .body-para strong { color: #1a1a1a; font-weight: 600; }

  .issued {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 8pt;
    color: #bbb;
    letter-spacing: 0.5px;
    margin-bottom: 10mm;
  }

  /* ─ signature ─ */
  .sig-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sig-line {
    width: 52mm;
    height: 1px;
    background: #333;
    margin-bottom: 2.5mm;
  }

  .sig-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1mm;
  }

  .sig-title {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 7pt;
    font-weight: 600;
    color: #E8191A;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 0.5mm;
  }

  .sig-co {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 7pt;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  /* ─ bottom ─ */
  .bottom-amber { width:100%; height:3px; background:#F5A623; flex-shrink:0; }

  .bottom-stripe {
    width: 100%;
    height: 10mm;
    background: #E8191A;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2.5mm;
  }

  .bottom-logo {
    width: 7mm; height: 7mm;
    object-fit: contain;
    filter: brightness(0) invert(1);
    opacity: 0.85;
  }

  .bottom-text {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 7pt;
    font-weight: 600;
    color: rgba(255,255,255,0.75);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  @page { size: A4 portrait; margin: 0; }
  @media print { html, body { width: 210mm; height: 297mm; } }
</style>
</head>
<body>
<div class="page">

  <div class="top-stripe"></div>
  <div class="amber-line"></div>

  <div class="body">
    <img src="${logoUrl}" alt="SmartMenu" class="logo"/>
    <div class="company-name">SmartMenu</div>
    <div class="tagline">Growing Restaurants. Together.</div>

    <div class="divider-line"></div>

    <div class="doc-label">Official Document</div>
    <div class="cert-title">Certificate of Employment</div>

    <div class="certify-text">This is to certify that</div>
    <div class="employee-name">${employeeName}</div>
    <div class="name-rule"></div>

    <p class="body-para">
      is a <strong>bonafide and active employee</strong> of <strong>SmartMenu</strong>.<br/>
      This certificate is issued upon the request of the above-named person
      for whatever legal purpose it may serve.
    </p>

    <div class="issued">Date Issued: ${date}</div>

    <div class="sig-wrap">
      <div class="sig-line"></div>
      <div class="sig-name">${OWNER_NAME}</div>
      <div class="sig-title">${OWNER_TITLE}</div>
      <div class="sig-co">${COMPANY}</div>
    </div>
  </div>

  <div class="bottom-amber"></div>
  <div class="bottom-stripe">
    <img src="${logoUrl}" alt="" class="bottom-logo"/>
    <span class="bottom-text">SmartMenu &nbsp;·&nbsp; Growing Restaurants. Together.</span>
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
