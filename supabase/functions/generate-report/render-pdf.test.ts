/**
 * Tests for the PDF renderer and section builders.
 *
 * Section builders in pdf-sections.ts are pure TypeScript with no esm.sh
 * imports, so they can be tested directly against a mock DrawContext.
 * Integration tests use the real pdf-lib library (installed as a
 * devDependency) to verify valid PDF output.
 */

import { describe, test, expect } from 'bun:test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { DrawContext, TextOpts, RectOpts, LineOpts } from './pdf-layout';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  MARGIN_TOP,
  MARGIN_BOTTOM,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  hexToRgb,
  wrapText,
} from './pdf-layout';
import {
  buildCoverSection,
  buildExecutiveSummarySection,
  buildCompassOverviewSection,
  buildDimensionDeepDivesSection,
  buildSegmentAnalysisSection,
  buildRecommendationsSection,
} from './pdf-sections';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const MOCK_REPORT = {
  id: 'rpt-001',
  survey_id: 'srv-001',
  organization_id: 'org-001',
  title: 'Q4 2025 Culture Assessment',
  format: 'pdf',
  status: 'queued',
  storage_path: null,
  sections: null,
  client_visible: false,
  triggered_by: 'usr-001',
  created_at: '2025-12-01T00:00:00Z',
  updated_at: '2025-12-01T00:00:00Z',
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildMockPayload(overrides?: {
  sections?: Array<{ id: string; label: string; included: boolean }>;
  dimensions?: Record<string, number>;
  segments?: Record<string, Record<string, number>>;
  recommendations?: Array<{
    dimension: string;
    severity: string;
    title: string;
    description: string;
    actions: string[];
  }>;
}) {
  return {
    survey: {
      id: 'srv-001',
      title: 'Culture Pulse Q4',
      organizationName: 'Acme Corp',
      closesAt: '2025-12-31',
      responseCount: 142,
    },
    scores: {
      overall: 3.25,
      dimensions: overrides?.dimensions ?? {
        clarity: 3.5,
        connection: 3.1,
        collaboration: 2.9,
        culture: 3.4,
        communication: 3.2,
        community: 3.0,
      },
      segments: overrides?.segments ?? {
        'department:Engineering': { clarity: 3.6, connection: 3.2, collaboration: 3.0 },
        'department:Marketing': { clarity: 3.3, connection: 3.5, collaboration: 2.8 },
      },
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription:
        'Organizations with this archetype excel at building bridges between teams.',
      dimensionPercentages: {
        clarity: 87.5,
        connection: 77.5,
        collaboration: 72.5,
        culture: 85.0,
        communication: 80.0,
        community: 75.0,
      },
    },
    recommendations: overrides?.recommendations ?? [
      {
        dimension: 'collaboration',
        severity: 'high',
        title: 'Improve cross-team collaboration rituals',
        description: 'Teams report siloed decision-making processes.',
        actions: ['Establish weekly cross-functional standups', 'Create shared Slack channels'],
      },
      {
        dimension: 'community',
        severity: 'medium',
        title: 'Strengthen community engagement',
        description: 'Community scores lag behind other dimensions.',
        actions: ['Launch monthly town halls', 'Create mentorship program'],
      },
      {
        dimension: 'connection',
        severity: 'healthy',
        title: 'Maintain strong connection practices',
        description: 'Connection is performing well — sustain current initiatives.',
        actions: [],
      },
    ],
    branding: {
      orgLogoUrl: null,
      cccLogoUrl: null,
      colors: {},
    },
    sections: overrides?.sections,
  };
}

// ─── Mock DrawContext ──────────────────────────────────────────────────────

interface DrawCall {
  type: 'text' | 'textWrapped' | 'rect' | 'line' | 'addPage';
  args: unknown[];
}

function createMockDrawContext(): DrawContext & { calls: DrawCall[]; pageCount: number } {
  const calls: DrawCall[] = [];
  let y = PAGE_HEIGHT - MARGIN_TOP;
  let pageCount = 0;

  const ctx: DrawContext & { calls: DrawCall[]; pageCount: number } = {
    calls,
    get pageCount() {
      return pageCount;
    },

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
      pageCount++;
      y = PAGE_HEIGHT - MARGIN_TOP;
      calls.push({ type: 'addPage', args: [] });
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
      calls.push({ type: 'text', args: [text, opts] });
    },

    drawTextWrapped(
      text: string,
      opts: TextOpts & { maxWidth: number; lineHeight?: number },
    ): number {
      calls.push({ type: 'textWrapped', args: [text, opts] });
      const avgCharWidth = opts.size * 0.5;
      const charsPerLine = Math.max(1, Math.floor(opts.maxWidth / avgCharWidth));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      const leading = opts.size * (opts.lineHeight ?? 1.4);
      y -= lines * leading;
      return lines;
    },

    drawRect(x: number, ry: number, w: number, h: number, opts: RectOpts): void {
      calls.push({ type: 'rect', args: [x, ry, w, h, opts] });
    },

    drawLine(x1: number, y1: number, x2: number, y2: number, opts: LineOpts): void {
      calls.push({ type: 'line', args: [x1, y1, x2, y2, opts] });
    },

    textWidth(text: string, fontSize: number, _bold?: boolean): number {
      return text.length * fontSize * 0.5;
    },
  };

  return ctx;
}

const GENERATED_DATE = 'December 1, 2025';

// ─── Layout utilities ─────────────────────────────────────────────────────

describe('pdf-layout utilities', () => {
  test('hexToRgb converts 6-digit hex to 0–1 float', () => {
    const { r, g, b } = hexToRgb('#FF7F50');
    expect(r).toBeCloseTo(1.0, 2);
    expect(g).toBeCloseTo(0.498, 2);
    expect(b).toBeCloseTo(0.314, 2);
  });

  test('hexToRgb handles missing # prefix', () => {
    const { r, g, b } = hexToRgb('0C3D50');
    expect(r).toBeCloseTo(0.047, 2);
    expect(g).toBeCloseTo(0.239, 2);
    expect(b).toBeCloseTo(0.314, 2);
  });

  test('wrapText splits on word boundaries', () => {
    const measure = (text: string, _size: number): number => text.length * 6;
    const lines = wrapText('one two three four five six', measure, 12, 90);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('one two three four five six');
  });

  test('wrapText returns single line when text fits', () => {
    const measure = (text: string, _size: number): number => text.length * 6;
    const lines = wrapText('short', measure, 12, 500);
    expect(lines).toEqual(['short']);
  });

  test('wrapText returns empty string for empty input', () => {
    const measure = (text: string, _size: number): number => text.length * 6;
    const lines = wrapText('', measure, 12, 200);
    expect(lines).toEqual(['']);
  });
});

// ─── Section Builder Tests ────────────────────────────────────────────────

describe('PDF section builders', () => {
  describe('buildCoverSection', () => {
    test('does not throw', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      expect(() => buildCoverSection(ctx, payload, MOCK_REPORT, GENERATED_DATE)).not.toThrow();
    });

    test('creates exactly one page', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      buildCoverSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
      expect(ctx.pageCount).toBe(1);
    });

    test('renders wordmark, title, and org name', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      buildCoverSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);

      const textCalls = ctx.calls
        .filter((c) => c.type === 'text')
        .map((c) => c.args[0] as string);

      expect(textCalls).toContain('COLLECTIVE culture + communication');
      expect(textCalls).toContain(MOCK_REPORT.title);
      expect(textCalls).toContain(payload.survey.organizationName);
    });
  });

  describe('buildExecutiveSummarySection', () => {
    test('does not throw', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      expect(() =>
        buildExecutiveSummarySection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('handles empty dimensions', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload({ dimensions: {} });
      expect(() =>
        buildExecutiveSummarySection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('draws score grid rects', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      buildExecutiveSummarySection(ctx, payload, MOCK_REPORT, GENERATED_DATE);

      const rectCalls = ctx.calls.filter((c) => c.type === 'rect');
      // 3 score cards (overall + strongest + needs focus) = at least 3 rects
      expect(rectCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('buildCompassOverviewSection', () => {
    test('does not throw', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      expect(() =>
        buildCompassOverviewSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('draws dimension score bars', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      buildCompassOverviewSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);

      const rectCalls = ctx.calls.filter((c) => c.type === 'rect');
      // Each dimension: track rect + fill rect = 2 rects
      // 6 dimensions = 12 bar rects + archetype card rects
      expect(rectCalls.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('buildDimensionDeepDivesSection', () => {
    test('does not throw', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      expect(() =>
        buildDimensionDeepDivesSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('handles empty dimensions', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload({ dimensions: {} });
      expect(() =>
        buildDimensionDeepDivesSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('creates one page per dimension', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      buildDimensionDeepDivesSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
      expect(ctx.pageCount).toBe(6);
    });
  });

  describe('buildSegmentAnalysisSection', () => {
    test('does not throw', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      expect(() =>
        buildSegmentAnalysisSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('handles empty segments', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload({ segments: {} });
      expect(() =>
        buildSegmentAnalysisSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('paginates many segments', () => {
      const manySegments: Record<string, Record<string, number>> = {};
      for (let i = 0; i < 30; i++) {
        manySegments[`department:Team ${i}`] = { clarity: 3.0 + (i % 10) * 0.1 };
      }
      const ctx = createMockDrawContext();
      const payload = buildMockPayload({ segments: manySegments });
      expect(() =>
        buildSegmentAnalysisSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });
  });

  describe('buildRecommendationsSection', () => {
    test('does not throw', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload();
      expect(() =>
        buildRecommendationsSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('handles empty recommendations', () => {
      const ctx = createMockDrawContext();
      const payload = buildMockPayload({ recommendations: [] });
      expect(() =>
        buildRecommendationsSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });

    test('handles many recommendations across severities', () => {
      const manyRecs = Array.from({ length: 15 }, (_, i) => ({
        dimension: 'clarity',
        severity: ['critical', 'high', 'medium', 'healthy'][i % 4],
        title: `Recommendation ${i + 1}`,
        description: `Description for recommendation ${i + 1}.`,
        actions: [`Action A for ${i + 1}`, `Action B for ${i + 1}`],
      }));

      const ctx = createMockDrawContext();
      const payload = buildMockPayload({ recommendations: manyRecs });
      expect(() =>
        buildRecommendationsSection(ctx, payload, MOCK_REPORT, GENERATED_DATE),
      ).not.toThrow();
    });
  });
});

// ─── Integration Tests (real pdf-lib) ─────────────────────────────────────

describe('PDF integration', () => {
  test('PDFDocument.create produces valid PDF bytes', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Test', { x: 50, y: 750, size: 12, font });

    const buffer = await doc.save();
    const bytes = new Uint8Array(buffer);

    expect(bytes.byteLength).toBeGreaterThan(0);
    // PDF magic bytes: %PDF-
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F
    expect(bytes[4]).toBe(0x2d); // -
  });

  test('full pipeline produces a valid PDF with all sections', async () => {
    const { rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fonts = { regular, bold };

    // Build a real DrawContext inline (render-pdf.ts can't be imported under
    // bun because it uses esm.sh URLs). This mirrors createDrawContext().
    let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function resolveFont(fontOpt?: 'regular' | 'bold') {
      return fontOpt === 'bold' ? fonts.bold : fonts.regular;
    }

    const ctx: DrawContext = {
      get y() { return y; },
      set y(val: number) { y = val; },
      get contentWidth() { return CONTENT_WIDTH; },
      get marginLeft() { return MARGIN_LEFT; },
      get pageHeight() { return PAGE_HEIGHT; },

      addPage(): void {
        currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
      },

      ensureSpace(pts: number): void {
        if (y - pts < 86) ctx.addPage();
      },

      moveDown(pts: number): void { y -= pts; },

      drawText(text: string, opts: TextOpts): void {
        const font = resolveFont(opts.font);
        const { r, g, b } = hexToRgb(opts.color);
        let drawX = opts.x ?? MARGIN_LEFT;
        if (opts.align === 'center') {
          const tw = font.widthOfTextAtSize(text, opts.size);
          const regionCenter = (opts.x ?? MARGIN_LEFT) + CONTENT_WIDTH / 2;
          drawX = regionCenter - tw / 2;
        } else if (opts.align === 'right') {
          const tw = font.widthOfTextAtSize(text, opts.size);
          drawX = MARGIN_LEFT + CONTENT_WIDTH - tw;
        }
        currentPage.drawText(text, {
          x: drawX, y, size: opts.size, font, color: rgb(r, g, b),
        });
      },

      drawTextWrapped(
        text: string,
        opts: TextOpts & { maxWidth: number; lineHeight?: number },
      ): number {
        const font = resolveFont(opts.font);
        const measure = (t: string, s: number): number => font.widthOfTextAtSize(t, s);
        const lines = wrapText(text, measure, opts.size, opts.maxWidth);
        const leading = opts.size * (opts.lineHeight ?? 1.4);
        for (const line of lines) {
          ctx.ensureSpace(leading);
          ctx.drawText(line, opts);
          y -= leading;
        }
        return lines.length;
      },

      drawRect(x: number, ry: number, w: number, h: number, opts: RectOpts): void {
        const drawOpts: Record<string, unknown> = {
          x, y: ry - h, width: w, height: h,
        };
        if (opts.fillColor) {
          const { r: cr, g: cg, b: cb } = hexToRgb(opts.fillColor);
          drawOpts.color = rgb(cr, cg, cb);
        }
        currentPage.drawRectangle(drawOpts as Parameters<typeof currentPage.drawRectangle>[0]);
      },

      drawLine(x1: number, y1: number, x2: number, y2: number, opts: LineOpts): void {
        const { r, g, b } = hexToRgb(opts.color);
        currentPage.drawLine({
          start: { x: x1, y: y1 }, end: { x: x2, y: y2 },
          thickness: opts.width ?? 1, color: rgb(r, g, b),
        });
      },

      textWidth(text: string, fontSize: number, isBold?: boolean): number {
        const font = isBold ? fonts.bold : fonts.regular;
        return font.widthOfTextAtSize(text, fontSize);
      },
    };

    // Remove the initial page — section builders call addPage() themselves
    doc.removePage(0);

    const payload = buildMockPayload();
    buildCoverSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
    buildExecutiveSummarySection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
    buildCompassOverviewSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
    buildDimensionDeepDivesSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
    buildSegmentAnalysisSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);
    buildRecommendationsSection(ctx, payload, MOCK_REPORT, GENERATED_DATE);

    const buffer = await doc.save();
    const bytes = new Uint8Array(buffer);

    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F

    // Should have multiple pages (cover + exec + compass + 6 dimensions + segments + recs)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(10);
  });
});
