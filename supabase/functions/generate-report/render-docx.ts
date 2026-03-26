/**
 * DOCX report renderer for the generate-report edge function.
 * Generates a branded .docx document from assembled report data
 * using the docx library via esm.sh (Deno-compatible).
 *
 * Implements the Renderer interface defined in renderer.ts.
 */

import {
  Document,
  Packer,
  type IStylesOptions,
  type ISectionOptions,
  BorderStyle,
} from 'https://esm.sh/docx@9';
import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import type { Renderer, RendererOutput } from './renderer.ts';
import { BRAND } from './tokens.ts';
import {
  buildCoverSection,
  buildExecutiveSummarySection,
  buildCompassOverviewSection,
  buildDimensionDeepDivesSection,
  buildSegmentAnalysisSection,
  buildRecommendationsSection,
} from './docx-sections.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Strip the leading '#' from a hex color string. docx expects bare hex. */
function hex(color: string): string {
  return color.replace(/^#/, '');
}

// ── Default sections when payload.sections is not provided ──────────────────

const DEFAULT_SECTIONS: ReportPayload['sections'] = [
  { id: 'cover', label: 'Cover Page', included: true },
  { id: 'executive_summary', label: 'Executive Summary', included: true },
  { id: 'compass_overview', label: 'Compass Overview', included: true },
  { id: 'dimension_deep_dives', label: 'Dimension Deep Dives', included: true },
  { id: 'segment_analysis', label: 'Segment Analysis', included: true },
  { id: 'recommendations', label: 'Recommendations', included: true },
];

// ── Section builder registry ────────────────────────────────────────────────

type SectionBuilder = (
  payload: ReportPayload,
  report: ReportRow,
  generatedDate: string,
) => ISectionOptions;

const SECTION_BUILDERS: Record<string, SectionBuilder> = {
  cover: buildCoverSection,
  executive_summary: buildExecutiveSummarySection,
  compass_overview: buildCompassOverviewSection,
  dimension_deep_dives: buildDimensionDeepDivesSection,
  segment_analysis: buildSegmentAnalysisSection,
  recommendations: buildRecommendationsSection,
};

// ── Document styles ─────────────────────────────────────────────────────────

function getDocumentStyles(): IStylesOptions {
  return {
    default: {
      document: {
        run: {
          font: 'Segoe UI',
          size: 22, // 11pt
          color: hex(BRAND.darkGrey),
        },
        paragraph: {
          spacing: { after: 120 },
        },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        run: {
          font: 'Segoe UI',
          size: 40, // 20pt
          color: hex(BRAND.core),
          bold: true,
        },
        paragraph: {
          spacing: { before: 240, after: 120 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: hex(BRAND.border),
              space: 4,
            },
          },
        },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: {
          font: 'Segoe UI',
          size: 28, // 14pt
          color: hex(BRAND.darkGrey),
          bold: true,
        },
        paragraph: {
          spacing: { before: 200, after: 80 },
        },
      },
    ],
  };
}

// ── Renderer ────────────────────────────────────────────────────────────────

/** DOCX renderer implementing the Renderer interface. */
export class DocxRenderer implements Renderer {
  async render(payload: ReportPayload, report: ReportRow): Promise<RendererOutput> {
    const generatedDate = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const sections = payload.sections ?? DEFAULT_SECTIONS;
    const includedSections: ISectionOptions[] = [];

    for (const section of sections) {
      if (!section.included) continue;

      const builder = SECTION_BUILDERS[section.id];
      if (!builder) continue;

      includedSections.push(builder(payload, report, generatedDate));
    }

    const doc = new Document({
      styles: getDocumentStyles(),
      sections: includedSections,
    });

    const blob = await Packer.toBlob(doc);
    const buffer = new Uint8Array(await blob.arrayBuffer());

    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: '.docx',
    };
  }
}
