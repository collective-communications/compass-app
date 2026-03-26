/**
 * Server-side PPTX report renderer for the generate-report edge function.
 * Generates a branded PowerPoint presentation from assembled report data
 * using PptxGenJS.
 *
 * Output is a 16:9 deck optimized for client presentations.
 */

import PptxGenJS from 'https://esm.sh/pptxgenjs@3.12?bundle';
import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import type { Renderer, RendererOutput } from './renderer.ts';
import { BRAND } from './tokens.ts';
import {
  addCoverSlide,
  addExecutiveSummarySlide,
  addCompassOverviewSlide,
  addDimensionDeepDiveSlides,
  addSegmentAnalysisSlides,
  addRecommendationSlides,
} from './pptx-sections.ts';

/** Strip '#' prefix from hex color for PptxGenJS. */
function hex(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

/** PPTX renderer implementing the Renderer interface. */
export class PptxRenderer implements Renderer {
  async render(payload: ReportPayload, report: ReportRow): Promise<RendererOutput> {
    const pres = new PptxGenJS();

    // ─── Presentation Setup ──────────────────────────────────────────────
    pres.layout = 'LAYOUT_16x9'; // 10" x 5.625"
    pres.author = 'COLLECTIVE culture + communication';
    pres.company = 'COLLECTIVE culture + communication';
    pres.subject = report.title;
    pres.title = report.title;

    // ─── Slide Master ────────────────────────────────────────────────────
    // White background with brand footer: divider line, brand text left,
    // "Confidential" right.
    pres.defineSlideMaster({
      title: 'COMPASS_MASTER',
      background: { fill: 'FFFFFF' },
      objects: [
        // Bottom divider line
        {
          line: {
            x: 0.5,
            y: 5.1,
            w: 9,
            h: 0,
            line: { color: hex(BRAND.border), width: 0.75 },
          },
        },
        // Brand text — bottom left
        {
          text: {
            text: 'COLLECTIVE culture + communication',
            options: {
              x: 0.5,
              y: 5.2,
              w: 5,
              h: 0.3,
              fontSize: 8,
              color: hex(BRAND.midGrey),
              fontFace: 'Arial',
            },
          },
        },
        // Confidential — bottom right
        {
          text: {
            text: 'Confidential',
            options: {
              x: 5.5,
              y: 5.2,
              w: 4,
              h: 0.3,
              fontSize: 8,
              color: hex(BRAND.midGrey),
              fontFace: 'Arial',
              align: 'right',
            },
          },
        },
      ],
    });

    // ─── Build Slides ────────────────────────────────────────────────────
    addCoverSlide(pres, payload, report);
    addExecutiveSummarySlide(pres, payload);
    addCompassOverviewSlide(pres, payload);
    addDimensionDeepDiveSlides(pres, payload);
    addSegmentAnalysisSlides(pres, payload);
    addRecommendationSlides(pres, payload);

    // ─── Write to Buffer ─────────────────────────────────────────────────
    const result = await pres.write({ outputType: 'arraybuffer' });
    const buffer = new Uint8Array(result as ArrayBuffer);

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: '.pptx',
    };
  }
}
