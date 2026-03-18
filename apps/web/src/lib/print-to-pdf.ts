/**
 * Client-side HTML-to-PDF via the browser's built-in print engine.
 * Loads HTML into a hidden iframe and triggers window.print(),
 * which presents the system "Save as PDF" dialog.
 */

/** Open the browser print dialog for the given HTML string. */
export function printHtmlToPdf(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to access iframe document for printing.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  function cleanup(): void {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }

  // Clean up after print dialog closes, with a 5s fallback if afterprint never fires
  const fallbackTimeout = setTimeout(cleanup, 5000);
  iframe.contentWindow?.addEventListener('afterprint', () => {
    clearTimeout(fallbackTimeout);
    cleanup();
  });

  // Give the iframe time to render, then trigger print
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 300);
}

/** Fetch HTML from a URL and open the print dialog. */
export async function fetchAndPrint(url: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  printHtmlToPdf(html);
}
