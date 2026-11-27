import { toPng } from 'html-to-image';

/** A4 at 96 dpi — the certificate documents are laid out at this exact size. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Resolves when `task` finishes, or when `ms` elapses — whichever comes first.
 * Keeps a slow external resource (font CDN, logo) from freezing the export.
 */
function withTimeout<T>(task: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      console.warn(`certificate:png — ${label} timed out, continuing without it`);
      resolve(null);
    }, ms);
    task.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Rasterises a standalone A4 certificate document to a PNG data URL.
 *
 * The HTML is loaded into an off-screen same-origin iframe so its stylesheet
 * cannot leak into the app, then html-to-image inlines the computed styles,
 * logo and webfonts before the frame is thrown away.
 */
export async function certificateHtmlToPng(html: string, pixelRatio = 2): Promise<string> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;height:${A4_HEIGHT_PX}px;border:0;background:#fff;`;

  document.body.appendChild(frame);

  try {
    const frameWindow = frame.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      throw new Error('Hindi ma-load ang certificate frame.');
    }

    // `load` does not reliably re-fire after document.write(), so poll readyState instead.
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const parsedAt = Date.now();
    while (frameDocument.readyState !== 'complete' && Date.now() - parsedAt < 6000) {
      await wait(50);
    }

    // The logo must be decoded before it is cloned, otherwise it rasterises blank.
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
      'mga larawan',
    );

    // Webfonts (Cinzel / EB Garamond / Montserrat) must be ready or the text falls back.
    await withTimeout(frameDocument.fonts.ready, 8000, 'fonts');

    const page = frameDocument.querySelector<HTMLElement>('.page');
    if (!page) {
      throw new Error('Walang certificate page sa loob ng frame.');
    }

    let timer = 0;
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('Time out sa paggawa ng PNG.')), 30000);
    });

    try {
      return await Promise.race([
        toPng(page, {
          cacheBust: true,
          pixelRatio,
          backgroundColor: '#ffffff',
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          style: { margin: '0', transform: 'none', borderRadius: '0', boxShadow: 'none' },
        }),
        timeout,
      ]);
    } finally {
      window.clearTimeout(timer);
    }
  } finally {
    frame.remove();
  }
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
