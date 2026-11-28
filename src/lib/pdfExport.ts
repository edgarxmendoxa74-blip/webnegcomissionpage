/**
 * Mobile-compatible PDF export.
 *
 * Strategy:
 *  1. Open the full HTML in a new browser tab/window as a Blob URL.
 *  2. Automatically trigger the browser's native print dialog (which allows
 *     "Save as PDF" on both desktop and mobile).
 *  3. On Capacitor / mobile, if the Web Share API is available and supports
 *     file sharing, offer the HTML as a shareable file so the user can save,
 *     email, or print it through their device's native sheet.
 *  4. Fallback: direct .html file download that the user can open and print.
 *
 * This approach avoids `html-to-image` which silently fails on mobile WebViews.
 */

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Opens the given HTML document in a new window and triggers print (Save as PDF).
 * Works on desktop and mobile browsers, including Capacitor WebView.
 */
export async function exportHtmlToPdf(html: string, fileName: string): Promise<void> {
  const safeName = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_\-. ]/g, '_');

  const isMobileOrApp =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.(),
    );

  // On Capacitor native apps, try Web Share API with HTML file
  if (isMobileOrApp && typeof navigator.share === 'function') {
    try {
      const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const htmlFile = new File([htmlBlob], `${safeName}.html`, { type: 'text/html' });
      if (!navigator.canShare || navigator.canShare({ files: [htmlFile] })) {
        await navigator.share({
          files: [htmlFile],
          title: safeName,
        });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // User cancelled share sheet
      }
      // Fall through to other methods
    }
  }

  // Open HTML in a new window and trigger print → "Save as PDF"
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    // Wait for content to load, then trigger print
    const tryPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // Some browsers block print() from opener; user can manually Ctrl+P
      }
    };

    printWindow.addEventListener('load', () => window.setTimeout(tryPrint, 600), { once: true });
    // Fallback timer in case load event doesn't fire reliably
    window.setTimeout(tryPrint, 3000);

    // Clean up blob URL after a delay
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return;
  }

  // Fallback: if popup was blocked, download the HTML file directly
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${safeName}.html`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  await wait(100);
}
