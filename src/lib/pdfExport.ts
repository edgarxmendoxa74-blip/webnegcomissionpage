/**
 * Mobile-compatible PDF export using jsPDF + html2canvas.
 *
 * Flow:
 *  1. Render each .page element to a canvas image using html2canvas
 *  2. Build a real multi-page A4 PDF using jsPDF
 *  3. On Capacitor (mobile app):
 *     - Save PDF to device cache via @capacitor/filesystem
 *     - Open native share sheet via @capacitor/share
 *  4. On desktop browser:
 *     - Direct blob download
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_PX = 794;   // 210mm at 96dpi
const A4_HEIGHT_PX = 1123;  // 297mm at 96dpi
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Detect if running inside Capacitor native app */
function isCapacitorNative(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** Detect mobile browser (not necessarily Capacitor) */
function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Renders an HTML document's `.page` elements into a real downloadable multi-page A4 PDF.
 *
 * - On Capacitor native: saves to cache dir and opens native share sheet with real PDF file.
 * - On mobile browser: uses Web Share API if available, else blob download.
 * - On desktop: triggers direct download.
 */
export async function exportHtmlToPdf(html: string, fileName: string): Promise<void> {
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // ── 1. Create off-screen iframe to render HTML ──
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;height:${A4_HEIGHT_PX}px;border:0;background:#fff;`;
  document.body.appendChild(frame);

  try {
    const frameWindow = frame.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      throw new Error('Hindi ma-load ang PDF renderer.');
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    // Wait for document to be ready
    const parsedAt = Date.now();
    while (frameDocument.readyState !== 'complete' && Date.now() - parsedAt < 6000) {
      await wait(50);
    }

    // Wait for images to load
    const images = Array.from(frameDocument.images);
    await Promise.race([
      Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
        ),
      ),
      wait(6000),
    ]);

    // Wait for fonts
    if (frameDocument.fonts?.ready) {
      await Promise.race([frameDocument.fonts.ready, wait(3000)]);
    }

    // Small delay for final rendering
    await wait(300);

    // ── 2. Capture each .page as canvas ──
    const pageNodes = Array.from(frameDocument.querySelectorAll<HTMLElement>('.page'));
    if (pageNodes.length === 0) {
      throw new Error('Walang page na nakita para sa PDF.');
    }

    const canvases: HTMLCanvasElement[] = [];
    for (const pageNode of pageNodes) {
      const canvas = await html2canvas(pageNode, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
        logging: false,
      });
      canvases.push(canvas);
    }

    // ── 3. Build PDF with jsPDF ──
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < canvases.length; i++) {
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      const imgData = canvases[i].toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
    }

    // ── 4. Deliver the PDF ──
    if (isCapacitorNative()) {
      // Capacitor native: save to cache + share
      await deliverPdfCapacitor(pdf, safeName);
    } else if (isMobile() && typeof navigator.share === 'function') {
      // Mobile browser with Web Share API
      await deliverPdfWebShare(pdf, safeName);
    } else {
      // Desktop: direct download
      pdf.save(safeName);
    }
  } finally {
    frame.remove();
  }
}

/**
 * Save PDF to Capacitor cache directory and open native share sheet.
 */
async function deliverPdfCapacitor(pdf: jsPDF, fileName: string): Promise<void> {
  try {
    // Dynamic import so these don't break on web-only builds
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    // Convert PDF to base64
    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    // Write to cache directory
    const result = await Filesystem.writeFile({
      path: fileName,
      data: pdfBase64,
      directory: Directory.Cache,
    });

    // Share the file
    await Share.share({
      title: fileName,
      url: result.uri,
      dialogTitle: 'I-share ang PDF',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return; // User cancelled
    }
    // Fallback: try jsPDF's built-in save
    console.warn('Capacitor share failed, falling back to jsPDF save:', err);
    pdf.save(fileName);
  }
}

/**
 * Use Web Share API to share the PDF file on mobile browsers.
 */
async function deliverPdfWebShare(pdf: jsPDF, fileName: string): Promise<void> {
  try {
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && !navigator.canShare({ files: [pdfFile] })) {
      // Browser doesn't support sharing files, fall back to download
      pdf.save(fileName);
      return;
    }

    await navigator.share({
      files: [pdfFile],
      title: fileName,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return; // User cancelled share sheet
    }
    // Fallback to direct download
    pdf.save(fileName);
  }
}
