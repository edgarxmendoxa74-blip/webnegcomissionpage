import { toJpeg } from 'html-to-image';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PDF_PIXEL_RATIO = 2;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(null), ms);
    task.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Builds a valid multi-page A4 PDF from JPEG page buffers using DCTDecode.
 */
function buildPdfFromJpegs(pages: Uint8Array[], imgWidth: number, imgHeight: number): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    cursor += b.length;
  };
  const pushStr = (s: string) => pushBytes(enc.encode(s));

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const pageIds: number[] = [];
  // Object 1 = Catalog, Object 2 = Pages, then 3 objects per page (Page, Contents, Image)
  for (let i = 0; i < pages.length; i++) {
    pageIds.push(3 + i * 3);
  }

  // 1: Catalog
  offsets[1] = cursor;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets[2] = cursor;
  pushStr(
    `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
  );

  // Page objects
  pages.forEach((jpegBytes, i) => {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;

    const contentStream = `q\n${A4_WIDTH_PT} 0 0 ${A4_HEIGHT_PT} 0 0 cm\n/Im0 Do\nQ\n`;

    offsets[pageId] = cursor;
    pushStr(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    offsets[contentId] = cursor;
    pushStr(
      `${contentId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`,
    );

    offsets[imageId] = cursor;
    pushStr(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    );
    pushBytes(jpegBytes);
    pushStr('\nendstream\nendobj\n');
  });

  const totalObjects = 2 + pages.length * 3;
  const xrefOffset = cursor;
  pushStr(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= totalObjects; id++) {
    pushStr(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blobParts = chunks.map((c) => c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength) as ArrayBuffer);
  return new Blob(blobParts, { type: 'application/pdf' });
}

/**
 * Renders an HTML document's `.page` elements into a real downloadable multi-page A4 PDF.
 * Uses Web Share API on mobile/Capacitor when supported, otherwise triggers a direct Blob download.
 */
export async function exportHtmlToPdf(html: string, fileName: string): Promise<void> {
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

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

    const parsedAt = Date.now();
    while (frameDocument.readyState !== 'complete' && Date.now() - parsedAt < 6000) {
      await wait(50);
    }

    const images = Array.from(frameDocument.images);
    await withTimeout(
      Promise.all(
        images.map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
              }),
        ),
      ),
      6000,
    );

    if (frameDocument.fonts?.ready) {
      await withTimeout(frameDocument.fonts.ready, 5000);
    }

    const pageNodes = Array.from(frameDocument.querySelectorAll<HTMLElement>('.page'));
    if (pageNodes.length === 0) {
      throw new Error('Walang page na nakita para sa PDF.');
    }

    const jpegPages: Uint8Array[] = [];
    for (const page of pageNodes) {
      const dataUrl = await toJpeg(page, {
        cacheBust: true,
        pixelRatio: PDF_PIXEL_RATIO,
        quality: 0.94,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        style: {
          margin: '0',
          transform: 'none',
          borderRadius: '0',
          boxShadow: 'none',
        },
      });
      jpegPages.push(dataUrlToBytes(dataUrl));
    }

    const pdfBlob = buildPdfFromJpegs(
      jpegPages,
      A4_WIDTH_PX * PDF_PIXEL_RATIO,
      A4_HEIGHT_PX * PDF_PIXEL_RATIO,
    );

    const isMobileOrApp =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

    if (isMobileOrApp && typeof navigator.share === 'function') {
      try {
        const pdfFile = new File([pdfBlob], safeName, { type: 'application/pdf' });
        if (!navigator.canShare || navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: safeName,
          });
          return;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // Fall through to standard download if share fails
      }
    }

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  } finally {
    frame.remove();
  }
}
