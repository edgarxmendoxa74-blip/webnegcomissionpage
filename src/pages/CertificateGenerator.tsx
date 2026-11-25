import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, User, RefreshCw } from 'lucide-react';

const OWNER_NAME = 'John Angelo David';
const OWNER_TITLE = 'Founder & Owner';
const COMPANY = 'SmartMenu';
const TAGLINE = 'Growing Restaurants. Together.';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function today(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ─── Certificate canvas renderer ────────────────────────────────────── */
async function drawCertificate(
  canvas: HTMLCanvasElement,
  employeeName: string,
  logoSrc: string,
) {
  const W = 1122, H = 794; // A4 landscape px @96dpi
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  /* background */
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  /* outer border – thick red */
  ctx.strokeStyle = '#E8191A';
  ctx.lineWidth = 14;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  /* inner border – thin amber */
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  /* amber corner squares */
  const corners = [[44, 44], [W - 60, 44], [44, H - 60], [W - 60, H - 60]] as [number, number][];
  corners.forEach(([x, y]) => {
    ctx.fillStyle = '#F5A623';
    ctx.fillRect(x, y, 16, 16);
  });

  /* red top header band */
  ctx.fillStyle = '#E8191A';
  ctx.fillRect(44, 44, W - 88, 72);

  /* "CERTIFICATE OF EMPLOYMENT" text in header */
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF EMPLOYMENT', W / 2, 92);

  /* amber sub-stripe */
  ctx.fillStyle = '#F5A623';
  ctx.fillRect(44, 116, W - 88, 6);

  /* load + draw logo */
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const lw = 110, lh = 110;
      ctx.drawImage(img, W / 2 - lw / 2, 136, lw, lh);
      resolve();
    };
    img.onerror = () => resolve(); // skip if fails
    img.src = logoSrc;
  });

  /* "To Whom It May Concern" */
  ctx.fillStyle = '#555555';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('To Whom It May Concern:', W / 2, 268);

  /* body text */
  ctx.fillStyle = '#222222';
  ctx.font = '18px Georgia, serif';
  ctx.textAlign = 'center';
  const line1 = 'This is to certify that';
  ctx.fillText(line1, W / 2, 304);

  /* employee name – big, red */
  ctx.font = 'bold 42px Georgia, serif';
  ctx.fillStyle = '#E8191A';
  ctx.fillText(employeeName.toUpperCase(), W / 2, 364);

  /* underline below name */
  const nameW = ctx.measureText(employeeName.toUpperCase()).width;
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameW / 2 - 10, 374);
  ctx.lineTo(W / 2 + nameW / 2 + 10, 374);
  ctx.stroke();

  /* body paragraph */
  ctx.fillStyle = '#333333';
  ctx.font = '17px Georgia, serif';
  ctx.textAlign = 'center';
  const bodyLines = [
    `is a bonafide employee of ${COMPANY}.`,
    'This certificate is issued upon the request of the above-named employee',
    'for whatever legal purpose it may serve.',
  ];
  bodyLines.forEach((line, i) => ctx.fillText(line, W / 2, 406 + i * 28));

  /* issue date */
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillStyle = '#777777';
  ctx.fillText(`Issued on: ${today()}`, W / 2, 500);

  /* amber horizontal rule */
  ctx.strokeStyle = '#F5A623';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 530);
  ctx.lineTo(W - 100, 530);
  ctx.stroke();

  /* signature block – left side */
  const sigX = W / 2 - 160;
  ctx.fillStyle = '#222222';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(OWNER_NAME, sigX, 582);

  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sigX - 110, 590);
  ctx.lineTo(sigX + 110, 590);
  ctx.stroke();

  ctx.fillStyle = '#555555';
  ctx.font = '14px Georgia, serif';
  ctx.fillText(OWNER_TITLE, sigX, 610);
  ctx.fillText(COMPANY, sigX, 628);

  /* small logo on right of signature block */
  await new Promise<void>((resolve) => {
    const img2 = new Image();
    img2.crossOrigin = 'anonymous';
    img2.onload = () => {
      ctx.drawImage(img2, W / 2 + 60, 548, 80, 80);
      resolve();
    };
    img2.onerror = () => resolve();
    img2.src = logoSrc;
  });

  /* footer tagline */
  ctx.fillStyle = '#F5A623';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${COMPANY}  ·  ${TAGLINE}`, W / 2, 696);

  /* red bottom stripe */
  ctx.fillStyle = '#E8191A';
  ctx.fillRect(44, 706, W - 88, 10);
}

/* ─── Component ────────────────────────────────────────────────────────── */
export function CertificateGenerator() {
  const [name, setName] = useState('');
  const [generated, setGenerated] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // logo path relative to the deployed origin
  const logoSrc = `${window.location.origin}/smartmenu-logo.jpg`;

  const handleGenerate = async () => {
    if (!name.trim() || !canvasRef.current) return;
    setIsDrawing(true);
    await drawCertificate(canvasRef.current, name.trim(), logoSrc);
    setGenerated(true);
    setIsDrawing(false);
  };

  const handleDownload = () => {
    if (!canvasRef.current || !generated) return;
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `SmartMenu-Certificate-${name.trim().replace(/\s+/g, '-')}.png`;
    link.click();
  };

  const handleReset = () => {
    setName('');
    setGenerated(false);
    // clear canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">I-generate ang official certificate para sa empleyado</p>
        </div>
      </div>

      {/* input card */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm">
        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">
          Full Name ng Empleyado *
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setGenerated(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Juan Dela Cruz"
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] transition-colors text-sm font-medium"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={!name.trim() || isDrawing}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shrink-0 ${
              !name.trim() || isDrawing
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-[#E8191A] hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isDrawing ? 'Generating...' : 'Generate'}
          </motion.button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          Ilagay ang buong pangalan ng empleyado, tapos pindutin ang Generate.
        </p>
      </div>

      {/* certificate preview + actions */}
      {generated && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm transition-all shadow"
            >
              <Download className="w-4 h-4" />
              I-download ang Certificate (PNG)
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
              Preview ng certificate — ang PNG ay high-resolution (1122 × 794 px)
            </span>
          </div>

          {/* canvas preview */}
          <div className="rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-xl bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              style={{ maxWidth: '100%' }}
            />
          </div>
        </motion.div>
      )}

      {/* empty canvas (hidden until generated) */}
      {!generated && (
        <canvas ref={canvasRef} className="hidden" />
      )}
    </div>
  );
}
