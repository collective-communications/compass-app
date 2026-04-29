/**
 * Layout engine for the pdf-lib report renderer.
 *
 * Contains A4 geometry constants, the DrawContext interface that section
 * builders program against, colour conversion, and text wrapping. No esm.sh
 * imports — everything here is pure TypeScript so pdf-sections.ts stays
 * testable under bun without pulling in pdf-lib.
 */

// ─── A4 Page Geometry (points, 1 pt = 1/72″) ──────────────────────────────

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN_TOP = 72;
export const MARGIN_BOTTOM = 86;
export const MARGIN_LEFT = 72;
export const MARGIN_RIGHT = 72;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
export const FOOTER_Y = 28;
export const FOOTER_DIVIDER_Y = 48;

// ─── Colour Conversion ────────────────────────────────────────────────────

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// ─── Text Wrapping ─────────────────────────────────────────────────────────

export type MeasureFn = (text: string, fontSize: number) => number;

export function wrapText(
  text: string,
  measure: MeasureFn,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (maxWidth <= 0) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current.length > 0) lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  if (lines.length === 0) lines.push('');

  return lines;
}

// ─── Drawing Option Types ──────────────────────────────────────────────────

export interface TextOpts {
  size: number;
  color: string;
  font?: 'regular' | 'bold';
  x?: number;
  align?: 'left' | 'center' | 'right';
}

export interface RectOpts {
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
}

export interface LineOpts {
  color: string;
  width?: number;
}

// ─── DrawContext Interface ──────────────────────────────────────────────────

export interface DrawContext {
  y: number;
  readonly contentWidth: number;
  readonly marginLeft: number;
  readonly pageHeight: number;

  addPage(): void;
  ensureSpace(pts: number): void;
  moveDown(pts: number): void;

  drawText(text: string, opts: TextOpts): void;
  drawTextWrapped(
    text: string,
    opts: TextOpts & { maxWidth: number; lineHeight?: number },
  ): number;
  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: RectOpts,
  ): void;
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: LineOpts,
  ): void;
  textWidth(text: string, fontSize: number, bold?: boolean): number;
}
