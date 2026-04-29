/**
 * Server-side HTML report renderer for the generate-report edge function.
 * Generates a self-contained HTML document from assembled report data
 * using template literals (no React dependency).
 *
 * Output is A4-optimized and ready for PDF conversion.
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import type { Renderer, RendererOutput } from './renderer.ts';
import { escapeHtml } from './_lib.ts';
import { getStyles } from './styles.ts';
import {
  renderCoverPage,
  renderExecutiveSummary,
  renderCompassOverview,
  renderDimensionDeepDives,
  renderSegmentAnalysis,
  renderRecommendations,
  renderFooter,
} from './sections.ts';

type HtmlSection = {
  id: string;
  render: () => string;
};

function isSectionIncluded(payload: ReportPayload, sectionId: string): boolean {
  if (!payload.sections || payload.sections.length === 0) return true;

  const section = payload.sections.find((entry) => entry.id === sectionId);
  return section ? section.included : false;
}

/**
 * Render a complete HTML document from the report payload.
 * Includes inline CSS for A4 layout, branding, and print styles.
 */
export function renderReportHtml(payload: ReportPayload, report: ReportRow): string {
  const generatedDate = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sections: HtmlSection[] = [
    {
      id: 'cover',
      render: () => renderCoverPage(payload, report, generatedDate),
    },
    {
      id: 'executive_summary',
      render: () => renderExecutiveSummary(payload),
    },
    {
      id: 'compass_overview',
      render: () => renderCompassOverview(payload),
    },
    {
      id: 'dimension_deep_dives',
      render: () => renderDimensionDeepDives(payload),
    },
    {
      id: 'segment_analysis',
      render: () => renderSegmentAnalysis(payload),
    },
    {
      id: 'recommendations',
      render: () => renderRecommendations(payload),
    },
  ];

  const renderedSections = sections
    .filter((section) => isSectionIncluded(payload, section.id))
    .map((section) => section.render())
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)} — Culture Compass Report</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  ${renderedSections}
  ${renderFooter(generatedDate)}
</body>
</html>`;
}

/** HTML renderer implementing the Renderer interface. */
export class HtmlRenderer implements Renderer {
  async render(payload: ReportPayload, report: ReportRow): Promise<RendererOutput> {
    const html = renderReportHtml(payload, report);
    const encoder = new TextEncoder();
    return {
      buffer: encoder.encode(html),
      contentType: 'text/html',
      extension: '.html',
    };
  }
}
