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

/* ─── Build the HTML that becomes the PDF ───────────────────────────────── */
function buildCertificateHTML(employeeName: string, logoUrl: string): string {
  const date = todayFormatted();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate of Employment – ${employeeName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lato:wght@300;400;700&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    width:297mm; height:210mm;
    font-family:'Lato', Arial, sans-serif;
    background:#fff;
    display:flex; align-items:stretch;
    overflow:hidden;
  }

  /* ── left accent bar ── */
  .accent-bar {
    width:16px; min-height:100%;
    background: linear-gradient(to bottom, #E8191A 60%, #F5A623 100%);
    flex-shrink:0;
  }

  /* ── main content ── */
  .page {
    flex:1;
    padding: 18mm 20mm 14mm 18mm;
    display:flex; flex-direction:column;
    border:3px solid #E8191A;
    border-left:none;
    position:relative;
  }

  /* outer amber line */
  .page::before {
    content:'';
    position:absolute;
    inset:6px;
    border:1.5px solid #F5A623;
    pointer-events:none;
  }

  /* ── header row ── */
  .header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:10px;
    border-bottom:2px solid #E8191A;
    margin-bottom:12px;
  }

  .logo { width:88px; height:88px; object-fit:contain; }

  .header-text { text-align:center; flex:1; padding:0 16px; }

  .cert-label {
    font-family:'Lato', sans-serif;
    font-size:10pt; font-weight:700; letter-spacing:5px;
    color:#F5A623; text-transform:uppercase;
    margin-bottom:4px;
  }

  .cert-title {
    font-family:'Playfair Display', Georgia, serif;
    font-size:24pt; font-weight:900; color:#E8191A;
    line-height:1.1;
    text-transform:uppercase; letter-spacing:2px;
  }

  .cert-of {
    font-family:'Playfair Display', Georgia, serif;
    font-size:13pt; font-weight:400; color:#555;
    letter-spacing:3px; text-transform:uppercase;
  }

  /* ── body ── */
  .body { flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center; }

  .to-whom {
    font-family:'Lato', sans-serif;
    font-size:9.5pt; font-style:italic; color:#888;
    margin-bottom:10px;
  }

  .certify-line {
    font-family:'Playfair Display', Georgia, serif;
    font-size:12pt; font-style:italic; color:#444;
    margin-bottom:8px;
  }

  .employee-name {
    font-family:'Playfair Display', Georgia, serif;
    font-size:30pt; font-weight:900; color:#E8191A;
    line-height:1.1; margin:4px 0 2px;
    text-transform:uppercase;
  }

  .name-rule {
    display:block; height:2px;
    background:linear-gradient(to right, transparent, #F5A623, transparent);
    margin:0 auto 14px; width:70%;
  }

  .body-text {
    font-family:'Lato', sans-serif;
    font-size:11pt; color:#333; line-height:1.75;
    max-width:420px; margin:0 auto;
  }

  .body-text strong { color:#E8191A; }

  .issued-date {
    font-family:'Lato', sans-serif;
    font-size:9pt; font-style:italic; color:#999;
    margin-top:14px;
  }

  /* ── footer / signature ── */
  .footer {
    padding-top:12px;
    border-top:1.5px solid #eee;
    display:flex; align-items:flex-end; justify-content:space-between;
  }

  .sig-block { text-align:center; }

  .sig-name {
    font-family:'Playfair Display', Georgia, serif;
    font-size:13pt; font-weight:700; color:#1a1a1a;
    border-bottom:1.5px solid #333;
    padding-bottom:4px; margin-bottom:4px;
    min-width:200px; display:inline-block;
  }

  .sig-title {
    font-family:'Lato', sans-serif;
    font-size:9pt; color:#555; font-weight:700;
    text-transform:uppercase; letter-spacing:1px;
  }

  .sig-company {
    font-family:'Lato', sans-serif;
    font-size:8.5pt; color:#E8191A; font-weight:700;
  }

  .footer-brand {
    text-align:right;
    display:flex; flex-direction:column; align-items:flex-end; gap:4px;
  }

  .footer-logo { width:52px; height:52px; object-fit:contain; }

  .footer-tagline {
    font-family:'Lato', sans-serif;
    font-size:7.5pt; font-weight:700; color:#F5A623;
    letter-spacing:2px; text-transform:uppercase;
  }

  /* ── print settings ── */
  @page {
    size: A4 landscape;
    margin: 0;
  }
  @media print {
    html, body { width:297mm; height:210mm; }
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <img src="${logoUrl}" alt="SmartMenu Logo" class="logo"/>

      <div class="header-text">
        <div class="cert-label">${COMPANY} &nbsp;·&nbsp; Official Document</div>
        <div class="cert-title">Certificate</div>
        <div class="cert-of">of Employment</div>
      </div>

      <img src="${logoUrl}" alt="SmartMenu Logo" class="logo" style="opacity:0.18;"/>
    </div>

    <!-- BODY -->
    <div class="body">
      <div class="to-whom">To Whom It May Concern:</div>

      <div class="certify-line">This is to certify that</div>

      <div class="employee-name">${employeeName}</div>
      <span class="name-rule"></span>

      <p class="body-text">
        is a <strong>bonafide employee</strong> of <strong>${COMPANY}</strong>.<br/>
        This certificate is issued upon the request of the above-named employee
        for whatever legal purpose it may serve.
      </p>

      <div class="issued-date">Issued on: ${date}</div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="sig-block">
        <span class="sig-name">${OWNER_NAME}</span><br/>
        <span class="sig-title">${OWNER_TITLE}</span><br/>
        <span class="sig-company">${COMPANY}</span>
      </div>

      <div class="footer-brand">
        <img src="${logoUrl}" alt="SmartMenu" class="footer-logo"/>
        <div class="footer-tagline">${TAGLINE}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/* ─── Print-to-PDF via hidden iframe ────────────────────────────────────── */
function printToPDF(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images to load, then print
  iframe.contentWindow?.addEventListener('load', () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 500);
  });
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export function CertificateGenerator() {
  const [name, setName]           = useState('');
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

      {/* ── page header ── */}
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

      {/* ── input card ── */}
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

      {/* ── preview + actions ── */}
      {previewing && previewHTML && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* action bar */}
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
              Kapag pinindot ang "I-download bilang PDF", mag-aappear ang print dialog — piliin ang "Save as PDF"
            </span>
          </div>

          {/* iframe preview — shows the actual certificate HTML */}
          <div className="rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-xl bg-white">
            <iframe
              srcDoc={previewHTML}
              title="Certificate Preview"
              className="w-full block"
              style={{ height: '520px', border: 'none' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
