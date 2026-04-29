/**
 * Tests for the DOCX report renderer.
 *
 * These tests run under bun:test and import docx from npm (installed as a
 * devDependency) rather than the esm.sh URL used by the Deno edge function.
 *
 * Because docx-sections.ts imports from esm.sh (unlike pptx-sections.ts
 * which avoids library imports), these tests validate DOCX generation
 * independently by constructing Documents using the same patterns as the
 * section builders. The section builders themselves are exercised in the
 * Deno runtime when the edge function runs.
 */

import { describe, test, expect } from 'bun:test';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Footer,
} from 'docx';

// ─── Brand Tokens (mirrored from tokens.ts) ────────────────────────────────

const BRAND = {
  core: '0C3D50',
  lightGrey: 'F5F5F5',
  darkGrey: '424242',
  textPrimary: '212121',
  border: 'E5E4E0',
};

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const MOCK_REPORT = {
  id: 'rpt-001',
  survey_id: 'srv-001',
  organization_id: 'org-001',
  title: 'Q4 2025 Culture Assessment',
  format: 'docx',
  status: 'queued',
  storage_path: null,
  sections: null,
  client_visible: false,
  triggered_by: 'usr-001',
  created_at: '2025-12-01T00:00:00Z',
  updated_at: '2025-12-01T00:00:00Z',
};

function buildMockPayload(overrides?: {
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
      },
      segments: overrides?.segments ?? {
        'department:Engineering': { clarity: 3.6, connection: 3.2 },
        'department:Marketing': { clarity: 3.3, connection: 3.5 },
      },
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: 'An archetype that excels at building bridges.',
      dimensionPercentages: { clarity: 87.5, connection: 77.5, collaboration: 72.5 },
    },
    recommendations: overrides?.recommendations ?? [
      {
        dimension: 'collaboration',
        severity: 'high',
        title: 'Improve cross-team rituals',
        description: 'Teams report siloed processes.',
        actions: ['Weekly standups', 'Shared channels'],
      },
    ],
    branding: { orgLogoUrl: null, cccLogoUrl: null, colors: {} },
  };
}

// ─── Section Builder Helpers (mirror patterns from docx-sections.ts) ────────

function buildCoverSection(title: string, orgName: string): { properties: object; children: Paragraph[] } {
  return {
    properties: { page: { size: { width: 11906, height: 16838 } } },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: 'COLLECTIVE culture + communication', size: 20, color: BRAND.core }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: title, size: 56, bold: true, color: BRAND.core }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: orgName, size: 28, color: BRAND.darkGrey }),
        ],
      }),
    ],
  };
}

function buildScoreTable(dimensions: Record<string, number>): Table {
  const entries = Object.entries(dimensions);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: entries.map(
      ([dim, score]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: dim, size: 22 })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: BRAND.lightGrey },
              children: [new Paragraph('')],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: score.toFixed(2), size: 22, bold: true })],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

function buildRecommendationParagraphs(
  recs: Array<{ title: string; description: string; actions: string[] }>,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const rec of recs) {
    paragraphs.push(
      new Paragraph({
        border: { left: { style: BorderStyle.SINGLE, size: 6, color: 'E65100' } },
        children: [
          new TextRun({ text: rec.title, bold: true, size: 24 }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: rec.description, size: 22 })],
      }),
    );
    for (const action of rec.actions) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: action, size: 22 })],
        }),
      );
    }
  }
  return paragraphs;
}

async function generateBuffer(doc: Document): Promise<Uint8Array> {
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DocxRenderer', () => {
  describe('document generation', () => {
    test('produces a non-empty Uint8Array', async () => {
      const payload = buildMockPayload();
      const doc = new Document({
        sections: [
          buildCoverSection(MOCK_REPORT.title, payload.survey.organizationName),
          {
            children: [
              new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Executive Summary')] }),
              new Paragraph({ children: [new TextRun(`Overall score: ${payload.scores.overall.toFixed(2)}`)] }),
              buildScoreTable(payload.scores.dimensions),
            ],
          },
        ],
      });

      const buffer = await generateBuffer(doc);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('output starts with ZIP magic bytes (DOCX is a ZIP container)', async () => {
      const doc = new Document({
        sections: [buildCoverSection('Test Report', 'Test Org')],
      });

      const buffer = await generateBuffer(doc);
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });
  });

  describe('section patterns', () => {
    test('cover section with brand styling', async () => {
      const doc = new Document({
        sections: [buildCoverSection('Culture Report', 'Acme Corp')],
      });

      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('score table with dimensions', async () => {
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Compass Overview')] }),
            buildScoreTable({ clarity: 3.5, connection: 3.1, collaboration: 2.9 }),
          ],
        }],
      });

      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('recommendations with severity borders and bullet actions', async () => {
      const recs = [
        { title: 'Improve collaboration', description: 'Teams are siloed.', actions: ['Weekly standups', 'Shared channels'] },
        { title: 'Maintain clarity', description: 'Clarity is strong.', actions: ['Continue workshops'] },
      ];
      const doc = new Document({
        sections: [{ children: buildRecommendationParagraphs(recs) }],
      });

      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('segment analysis as table with header and alternating rows', async () => {
      const segments = {
        'department:Engineering': { clarity: 3.6, connection: 3.2 },
        'department:Marketing': { clarity: 3.3, connection: 3.5 },
      };
      const dims = ['clarity', 'connection'];

      const headerRow = new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: BRAND.core },
            children: [new Paragraph({ children: [new TextRun({ text: 'Segment', color: 'FFFFFF', bold: true })] })],
          }),
          ...dims.map(
            (d) =>
              new TableCell({
                shading: { type: ShadingType.SOLID, color: BRAND.core },
                children: [new Paragraph({ children: [new TextRun({ text: d, color: 'FFFFFF', bold: true })] })],
              }),
          ),
        ],
      });

      const dataRows = Object.entries(segments).map(
        ([seg, scores], i) =>
          new TableRow({
            children: [
              new TableCell({
                shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: BRAND.lightGrey } : undefined,
                children: [new Paragraph(seg)],
              }),
              ...dims.map(
                (d) =>
                  new TableCell({
                    shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: BRAND.lightGrey } : undefined,
                    children: [new Paragraph((scores[d] ?? 0).toFixed(2))],
                  }),
              ),
            ],
          }),
      );

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Segment Analysis')] }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
          ],
        }],
      });

      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('section filtering', () => {
    test('more sections produces a larger file', async () => {
      const payload = buildMockPayload();

      // Single section
      const small = new Document({
        sections: [buildCoverSection(MOCK_REPORT.title, payload.survey.organizationName)],
      });
      const smallBuffer = await generateBuffer(small);

      // Multiple sections
      const large = new Document({
        sections: [
          buildCoverSection(MOCK_REPORT.title, payload.survey.organizationName),
          { children: [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Executive Summary')] }), buildScoreTable(payload.scores.dimensions)] },
          { children: buildRecommendationParagraphs(payload.recommendations) },
        ],
      });
      const largeBuffer = await generateBuffer(large);

      expect(largeBuffer.byteLength).toBeGreaterThan(smallBuffer.byteLength);
    });

    test('empty document with no sections still produces valid DOCX', async () => {
      const doc = new Document({ sections: [{ children: [] }] });
      const buffer = await generateBuffer(doc);

      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('handles empty dimensions', async () => {
      const dims = {};
      const entries = Object.entries(dims);
      const children = entries.length > 0
        ? [buildScoreTable(dims)]
        : [new Paragraph({ children: [new TextRun({ text: 'No dimension data available.', italics: true })] })];

      const doc = new Document({ sections: [{ children }] });
      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('handles empty recommendations', async () => {
      const doc = new Document({
        sections: [{ children: buildRecommendationParagraphs([]) }],
      });
      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('footer text renders in section', async () => {
      const doc = new Document({
        sections: [{
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Culture Compass Report', size: 16, color: BRAND.darkGrey }),
                  ],
                }),
              ],
            }),
          },
          children: [new Paragraph('Content')],
        }],
      });
      const buffer = await generateBuffer(doc);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });
});
