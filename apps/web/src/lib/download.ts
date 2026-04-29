/**
 * Cross-origin safe file download via fetch + Blob.
 *
 * The HTML5 `download` attribute on `<a>` tags is silently ignored for
 * cross-origin URLs (e.g. Supabase Storage signed URLs). This utility
 * fetches the file as a blob, creates a same-origin object URL, and
 * triggers the download from that — ensuring the filename is honoured
 * and the browser saves the file instead of navigating.
 */

export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(objectUrl);
}
