/**
 * Server-side HTML report renderer for the generate-report edge function.
 * Generates a self-contained HTML document from assembled report data
 * using template literals (no React dependency).
 *
 * Output is A4-optimized and ready for PDF conversion.
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
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
  ${renderCoverPage(payload, report, generatedDate)}
  ${renderExecutiveSummary(payload)}
  ${renderCompassOverview(payload)}
  ${renderDimensionDeepDives(payload)}
  ${renderSegmentAnalysis(payload)}
  ${renderRecommendations(payload)}
  ${renderFooter(generatedDate)}
</body>
</html>`;
}
