/**
 * Renderer abstraction for the generate-report edge function.
 * Maps report format strings to concrete renderer implementations.
 *
 * Adding a new format:
 *   1. Create render-{format}.ts implementing Renderer
 *   2. Import the class here
 *   3. Add one entry to the `renderers` map
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import { DocxRenderer } from './render-docx.ts';
import { PdfRenderer } from './render-pdf.ts';
import { PptxRenderer } from './render-pptx.ts';

// ─── Interface ──────────────────────────────────────────────────────────────

/** Output produced by a Renderer. */
export interface RendererOutput {
  /** The rendered file as raw bytes, ready for upload. */
  buffer: Uint8Array;
  /** MIME type for the storage upload. */
  contentType: string;
  /** File extension including the dot (e.g., '.html', '.docx'). */
  extension: string;
}

/** Contract that every format renderer must implement. */
export interface Renderer {
  render(payload: ReportPayload, report: ReportRow): Promise<RendererOutput>;
}

// ─── Registry ───────────────────────────────────────────────────────────────

const renderers: Record<string, Renderer> = {
  pdf: new PdfRenderer(),
  docx: new DocxRenderer(),
  pptx: new PptxRenderer(),
};

/** Look up a renderer by format string. Throws if the format is unsupported. */
export function getRenderer(format: string): Renderer {
  const renderer = renderers[format];
  if (!renderer) {
    throw new Error(
      `Unsupported report format: "${format}". Supported: ${Object.keys(renderers).join(', ')}`,
    );
  }
  return renderer;
}
