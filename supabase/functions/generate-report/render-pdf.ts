/**
 * Native PDF report renderer for the generate-report edge function.
 * Generates a real PDF from assembled report data using pdf-lib.
 *
 * Implements the Renderer interface defined in renderer.ts. Section
 * drawing logic lives in pdf-sections.ts (pure TS, no esm.sh) — this
 * file owns the pdf-lib import, DrawContext implementation, and
 * orchestration.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'https://esm.sh/pdf-lib@1.17.1';
import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import type { Renderer, RendererOutput } from './renderer.ts';
import {
  hexToRgb,
  wrapText,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_TOP,
  MARGIN_BOTTOM,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  FOOTER_Y,
  FOOTER_DIVIDER_Y,
  type DrawContext,
  type TextOpts,
  type RectOpts,
  type LineOpts,
} from './pdf-layout.ts';
import {
  buildCoverSection,
  buildExecutiveSummarySection,
  buildCompassOverviewSection,
  buildDimensionDeepDivesSection,
  buildSegmentAnalysisSection,
  buildRecommendationsSection,
} from './pdf-sections.ts';
import { BRAND } from './tokens.ts';

// ─── Default sections when payload.sections is not provided ────────────────

const DEFAULT_SECTIONS: ReportPayload['sections'] = [
  { id: 'cover', label: 'Cover Page', included: true },
  { id: 'executive_summary', label: 'Executive Summary', included: true },
  { id: 'compass_overview', label: 'Compass Overview', included: true },
  { id: 'dimension_deep_dives', label: 'Dimension Deep Dives', included: true },
  { id: 'segment_analysis', label: 'Segment Analysis', included: true },
  { id: 'recommendations', label: 'Recommendations', included: true },
];

// ─── Section builder registry ──────────────────────────────────────────────

type SectionBuilder = (
  ctx: DrawContext,
  payload: ReportPayload,
  report: ReportRow,
  generatedDate: string,
) => void;

const SECTION_BUILDERS: Record<string, SectionBuilder> = {
  cover: buildCoverSection,
  executive_summary: buildExecutiveSummarySection,
  compass_overview: buildCompassOverviewSection,
  dimension_deep_dives: buildDimensionDeepDivesSection,
  segment_analysis: buildSegmentAnalysisSection,
  recommendations: buildRecommendationsSection,
};

// ─── DrawContext Factory ───────────────────────────────────────────────────

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

export function createDrawContext(
  doc: PDFDocument,
  fonts: Fonts,
  generatedDate: string,
): DrawContext {
  let currentPage: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  function drawFooter(page: PDFPage): void {
    const { r: lr, g: lg, b: lb } = hexToRgb(BRAND.border);
    page.drawLine({
      start: { x: MARGIN_LEFT, y: FOOTER_DIVIDER_Y },
      end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: FOOTER_DIVIDER_Y },
      thickness: 0.5,
      color: rgb(lr, lg, lb),
    });

    const { r: mr, g: mg, b: mb } = hexToRgb(BRAND.midGrey);
    const line1 = `Culture Compass Report — Generated ${generatedDate}`;
    const line2 = 'COLLECTIVE culture + communication — Confidential';

    const line1Width = fonts.regular.widthOfTextAtSize(line1, 8);
    const line2Width = fonts.regular.widthOfTextAtSize(line2, 8);
    const centerX = MARGIN_LEFT + CONTENT_WIDTH / 2;

    page.drawText(line1, {
      x: centerX - line1Width / 2,
      y: FOOTER_Y + 10,
      size: 8,
      font: fonts.regular,
      color: rgb(mr, mg, mb),
    });
    page.drawText(line2, {
      x: centerX - line2Width / 2,
      y: FOOTER_Y,
      size: 8,
      font: fonts.regular,
      color: rgb(mr, mg, mb),
    });
  }

  drawFooter(currentPage);

  function resolveFont(fontOpt?: 'regular' | 'bold'): PDFFont {
    return fontOpt === 'bold' ? fonts.bold : fonts.regular;
  }

  function resolveX(opts: TextOpts, text: string): number {
    if (opts.x !== undefined && opts.align !== 'center' && opts.align !== 'right') {
      return opts.x;
    }

    const font = resolveFont(opts.font);
    const textW = font.widthOfTextAtSize(text, opts.size);
    const baseX = opts.x ?? MARGIN_LEFT;

    if (opts.align === 'center') {
      const regionWidth = opts.x !== undefined ? CONTENT_WIDTH : CONTENT_WIDTH;
      const regionCenter = (opts.x ?? MARGIN_LEFT) + regionWidth / 2;
      return regionCenter - textW / 2;
    }
    if (opts.align === 'right') {
      return MARGIN_LEFT + CONTENT_WIDTH - textW;
    }
    return baseX;
  }

  const ctx: DrawContext = {
    get y() {
      return y;
    },
    set y(val: number) {
      y = val;
    },
    get contentWidth() {
      return CONTENT_WIDTH;
    },
    get marginLeft() {
      return MARGIN_LEFT;
    },
    get pageHeight() {
      return PAGE_HEIGHT;
    },

    addPage(): void {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
      drawFooter(currentPage);
    },

    ensureSpace(pts: number): void {
      if (y - pts < MARGIN_BOTTOM) {
        ctx.addPage();
      }
    },

    moveDown(pts: number): void {
      y -= pts;
    },

    drawText(text: string, opts: TextOpts): void {
      const font = resolveFont(opts.font);
      const { r, g, b } = hexToRgb(opts.color);
      const drawX = resolveX(opts, text);

      currentPage.drawText(text, {
        x: drawX,
        y,
        size: opts.size,
        font,
        color: rgb(r, g, b),
      });
    },

    drawTextWrapped(
      text: string,
      opts: TextOpts & { maxWidth: number; lineHeight?: number },
    ): number {
      const font = resolveFont(opts.font);
      const measure = (t: string, s: number): number =>
        font.widthOfTextAtSize(t, s);
      const lines = wrapText(text, measure, opts.size, opts.maxWidth);
      const leading = opts.size * (opts.lineHeight ?? 1.4);

      for (const line of lines) {
        ctx.ensureSpace(leading);
        ctx.drawText(line, opts);
        y -= leading;
      }

      return lines.length;
    },

    drawRect(
      x: number,
      ry: number,
      w: number,
      h: number,
      opts: RectOpts,
    ): void {
      const drawOpts: Record<string, unknown> = {
        x,
        y: ry - h,
        width: w,
        height: h,
      };

      if (opts.fillColor) {
        const { r, g, b } = hexToRgb(opts.fillColor);
        drawOpts.color = rgb(r, g, b);
      }
      if (opts.borderColor) {
        const { r, g, b } = hexToRgb(opts.borderColor);
        drawOpts.borderColor = rgb(r, g, b);
        drawOpts.borderWidth = opts.borderWidth ?? 1;
      }
      if (opts.radius) {
        drawOpts.borderRadius = opts.radius;
      }

      currentPage.drawRectangle(drawOpts as Parameters<PDFPage['drawRectangle']>[0]);
    },

    drawLine(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      opts: LineOpts,
    ): void {
      const { r, g, b } = hexToRgb(opts.color);
      currentPage.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: opts.width ?? 1,
        color: rgb(r, g, b),
      });
    },

    textWidth(text: string, fontSize: number, bold?: boolean): number {
      const font = bold ? fonts.bold : fonts.regular;
      return font.widthOfTextAtSize(text, fontSize);
    },
  };

  return ctx;
}

// ─── Renderer ──────────────────────────────────────────────────────────────

export class PdfRenderer implements Renderer {
  async render(payload: ReportPayload, report: ReportRow): Promise<RendererOutput> {
    const doc = await PDFDocument.create();

    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const generatedDate = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const ctx = createDrawContext(doc, { regular, bold }, generatedDate);

    // The first page was created by createDrawContext — remove it so section
    // builders control their own page creation via ctx.addPage().
    const pages = doc.getPages();
    if (pages.length > 0) {
      doc.removePage(0);
    }

    const sections = payload.sections ?? DEFAULT_SECTIONS;
    for (const section of sections) {
      if (!section.included) continue;
      const builder = SECTION_BUILDERS[section.id];
      if (builder) {
        builder(ctx, payload, report, generatedDate);
      }
    }

    const buffer = await doc.save();

    return {
      buffer: new Uint8Array(buffer),
      contentType: 'application/pdf',
      extension: '.pdf',
    };
  }
}
