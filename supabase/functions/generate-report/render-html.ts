/**
 * Server-side HTML report renderer for the generate-report edge function.
 * Generates a self-contained HTML document from assembled report data
 * using template literals (no React dependency).
 *
 * Output is A4-optimized and ready for PDF conversion.
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import { escapeHtml, getDimensionColor } from './_lib.ts';

// ─── Brand Colors ────────────────────────────────────────────────────────────

/**
 * Brand colors — mirrored from @compass/tokens.
 * Edge functions can't import workspace packages, so values are duplicated here.
 * Keep in sync with packages/tokens/src/index.ts.
 */
const BRAND = {
  core: '#0A3B4F',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
  white: '#FFFFFF',
  lightGrey: '#F5F5F5',
  midGrey: '#9E9E9E',
  darkGrey: '#424242',
  textPrimary: '#212121',
  textSecondary: '#616161',
  border: '#E5E4E0',
};

// ─── Dimension Display Names ─────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
  culture: 'Culture',
  communication: 'Communication',
  community: 'Community',
};

// ─── Severity Colors ─────────────────────────────────────────────────────────

/**
 * Severity colors — mirrored from @compass/tokens.
 * Keep in sync with packages/tokens/src/index.ts.
 */
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#B71C1C',
  high: '#E65100',
  medium: '#F9A825',
  healthy: '#2E7D32',
  low: '#2E7D32',
};

// ─── Main ────────────────────────────────────────────────────────────────────

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

// ─── Styles ──────────────────────────────────────────────────────────────────

function getStyles(): string {
  return `
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: ${BRAND.textPrimary};
      background: ${BRAND.white};
    }

    .page-break {
      page-break-before: always;
    }

    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 257mm;
      text-align: center;
      padding: 40mm 20mm;
    }

    .cover-logo {
      font-size: 14pt;
      font-weight: 600;
      color: ${BRAND.core};
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 60px;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      color: ${BRAND.core};
      margin-bottom: 16px;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 16pt;
      color: ${BRAND.textSecondary};
      margin-bottom: 40px;
    }

    .cover-meta {
      font-size: 10pt;
      color: ${BRAND.midGrey};
    }

    .cover-divider {
      width: 80px;
      height: 3px;
      background: ${BRAND.clarity};
      margin: 30px auto;
    }

    section {
      padding: 0 0 24px 0;
    }

    h2 {
      font-size: 20pt;
      font-weight: 700;
      color: ${BRAND.core};
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${BRAND.border};
    }

    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: ${BRAND.darkGrey};
      margin: 20px 0 8px;
    }

    p {
      margin-bottom: 10px;
    }

    .card {
      background: ${BRAND.white};
      border: 1px solid ${BRAND.border};
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 16px;
    }

    .card-bordered {
      border-left-width: 4px;
    }

    .score-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 16px 0;
    }

    .score-card {
      background: ${BRAND.lightGrey};
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .score-value {
      font-size: 28pt;
      font-weight: 700;
      color: ${BRAND.core};
    }

    .score-label {
      font-size: 9pt;
      color: ${BRAND.textSecondary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    .bar-container {
      background: ${BRAND.lightGrey};
      border-radius: 4px;
      height: 12px;
      width: 100%;
      margin: 6px 0 4px;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .dimension-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid ${BRAND.lightGrey};
    }

    .dimension-label {
      width: 140px;
      font-weight: 600;
      font-size: 10pt;
    }

    .dimension-bar {
      flex: 1;
    }

    .dimension-score {
      width: 60px;
      text-align: right;
      font-weight: 600;
      font-size: 10pt;
    }

    .rec-card {
      border-left-width: 4px;
      border-left-style: solid;
      margin-bottom: 12px;
    }

    .rec-title {
      font-weight: 600;
      font-size: 12pt;
      margin-bottom: 4px;
    }

    .rec-severity {
      display: inline-block;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .rec-actions {
      margin-top: 8px;
      padding-left: 20px;
    }

    .rec-actions li {
      margin-bottom: 4px;
      font-size: 10pt;
    }

    .segment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin: 16px 0;
    }

    .segment-table th {
      background: ${BRAND.core};
      color: ${BRAND.white};
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
    }

    .segment-table td {
      padding: 8px 12px;
      border-bottom: 1px solid ${BRAND.border};
    }

    .segment-table tr:nth-child(even) td {
      background: ${BRAND.lightGrey};
    }

    .footer {
      text-align: center;
      font-size: 8pt;
      color: ${BRAND.midGrey};
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid ${BRAND.border};
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
  `;
}

// ─── Section Renderers ───────────────────────────────────────────────────────

function renderCoverPage(payload: ReportPayload, report: ReportRow, date: string): string {
  return `
  <div class="cover">
    <div class="cover-logo">COLLECTIVE culture + communication</div>
    <h1 class="cover-title">${escapeHtml(report.title)}</h1>
    <div class="cover-subtitle">${escapeHtml(payload.survey.organizationName)}</div>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <p>${escapeHtml(payload.survey.title)}</p>
      <p>${payload.survey.responseCount} responses</p>
      <p>Generated ${date}</p>
    </div>
  </div>`;
}

function renderExecutiveSummary(payload: ReportPayload): string {
  const overall = payload.scores.overall;
  const overallPct = ((overall / 4) * 100).toFixed(0);
  const dimEntries = Object.entries(payload.scores.dimensions);

  const highest = dimEntries.length > 0
    ? dimEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;
  const lowest = dimEntries.length > 0
    ? dimEntries.reduce((a, b) => (a[1] < b[1] ? a : b))
    : null;

  return `
  <section class="page-break">
    <h2>Executive Summary</h2>
    <div class="card">
      <p>The ${escapeHtml(payload.survey.organizationName)} culture assessment received
        <strong>${payload.survey.responseCount}</strong> responses.
        The overall culture health score is <strong>${overall.toFixed(2)} / 4.00</strong>
        (${overallPct}%).</p>
      <p>The organization's culture archetype is <strong>${escapeHtml(payload.compass.archetype)}</strong>.</p>
      ${payload.compass.archetypeDescription ? `<p>${escapeHtml(payload.compass.archetypeDescription)}</p>` : ''}
    </div>
    <div class="score-grid">
      <div class="score-card">
        <div class="score-value">${overall.toFixed(2)}</div>
        <div class="score-label">Overall Score</div>
      </div>
      ${highest ? `
      <div class="score-card">
        <div class="score-value">${highest[1].toFixed(2)}</div>
        <div class="score-label">Strongest: ${escapeHtml(DIMENSION_LABELS[highest[0]] ?? highest[0])}</div>
      </div>` : ''}
      ${lowest ? `
      <div class="score-card">
        <div class="score-value">${lowest[1].toFixed(2)}</div>
        <div class="score-label">Needs Focus: ${escapeHtml(DIMENSION_LABELS[lowest[0]] ?? lowest[0])}</div>
      </div>` : ''}
    </div>
  </section>`;
}

function renderCompassOverview(payload: ReportPayload): string {
  const dims = Object.entries(payload.compass.dimensionPercentages);

  return `
  <section class="page-break">
    <h2>Compass Overview</h2>
    <div class="card">
      <h3>Culture Archetype: ${escapeHtml(payload.compass.archetype)}</h3>
      ${payload.compass.archetypeDescription ? `<p>${escapeHtml(payload.compass.archetypeDescription)}</p>` : ''}
    </div>
    <h3>Dimension Scores</h3>
    <div class="card">
      ${dims.map(([code, pct]) => {
        const score = payload.scores.dimensions[code] ?? 0;
        const color = getDimensionColor(code);
        return `
        <div class="dimension-row">
          <span class="dimension-label">${escapeHtml(DIMENSION_LABELS[code] ?? code)}</span>
          <div class="dimension-bar">
            <div class="bar-container">
              <div class="bar-fill" style="width: ${pct.toFixed(0)}%; background: ${color};"></div>
            </div>
          </div>
          <span class="dimension-score">${score.toFixed(2)} / 4</span>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function renderDimensionDeepDives(payload: ReportPayload): string {
  const dims = Object.entries(payload.scores.dimensions);
  if (dims.length === 0) return '';

  return `
  <section class="page-break">
    <h2>Dimension Deep Dives</h2>
    ${dims.map(([code, score]) => {
      const pct = ((score / 4) * 100).toFixed(0);
      const color = getDimensionColor(code);
      const recs = payload.recommendations.filter((r) => r.dimension === code);
      return `
      <div class="card card-bordered" style="border-left-color: ${color};">
        <h3>${escapeHtml(DIMENSION_LABELS[code] ?? code)}</h3>
        <p>Score: <strong>${score.toFixed(2)} / 4.00</strong> (${pct}%)</p>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${pct}%; background: ${color};"></div>
        </div>
        ${recs.length > 0 ? `
          <h3 style="font-size: 11pt; margin-top: 12px;">Key Recommendations</h3>
          <ul style="padding-left: 20px; font-size: 10pt;">
            ${recs.map((r) => `<li>${escapeHtml(r.title)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>`;
    }).join('')}
  </section>`;
}

function renderSegmentAnalysis(payload: ReportPayload): string {
  const segmentEntries = Object.entries(payload.scores.segments);
  if (segmentEntries.length === 0) {
    return `
    <section class="page-break">
      <h2>Segment Analysis</h2>
      <div class="card">
        <p>No segment data available. Segments are only displayed when the response
          count meets the anonymity threshold.</p>
      </div>
    </section>`;
  }

  // Group by segment type
  const grouped: Record<string, Array<{ value: string; scores: Record<string, number> }>> = {};
  for (const [key, scores] of segmentEntries) {
    const [type, value] = key.split(':');
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ value, scores });
  }

  const dimCodes = Object.keys(payload.scores.dimensions);

  return `
  <section class="page-break">
    <h2>Segment Analysis</h2>
    ${Object.entries(grouped).map(([type, segments]) => `
      <h3>${escapeHtml(type)}</h3>
      <table class="segment-table">
        <thead>
          <tr>
            <th>${escapeHtml(type)}</th>
            ${dimCodes.map((c) => `<th>${escapeHtml(DIMENSION_LABELS[c] ?? c)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${segments.map((seg) => `
            <tr>
              <td>${escapeHtml(seg.value)}</td>
              ${dimCodes.map((c) => `<td>${seg.scores[c]?.toFixed(2) ?? '—'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')}
  </section>`;
}

function renderRecommendations(payload: ReportPayload): string {
  if (payload.recommendations.length === 0) {
    return `
    <section class="page-break">
      <h2>Recommendations</h2>
      <div class="card"><p>No recommendations have been generated for this survey.</p></div>
    </section>`;
  }

  return `
  <section class="page-break">
    <h2>Recommendations</h2>
    ${payload.recommendations.map((rec) => {
      const severityColor = SEVERITY_COLORS[rec.severity] ?? BRAND.midGrey;
      return `
      <div class="card rec-card" style="border-left-color: ${severityColor};">
        <span class="rec-severity" style="background: ${severityColor}20; color: ${severityColor};">
          ${escapeHtml(rec.severity)}
        </span>
        <div class="rec-title">${escapeHtml(rec.title)}</div>
        <p style="font-size: 10pt; color: ${BRAND.textSecondary};">
          Dimension: ${escapeHtml(DIMENSION_LABELS[rec.dimension] ?? rec.dimension)}
        </p>
        <p>${escapeHtml(rec.description)}</p>
        ${rec.actions.length > 0 ? `
          <ul class="rec-actions">
            ${rec.actions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>`;
    }).join('')}
  </section>`;
}

function renderFooter(date: string): string {
  return `
  <div class="footer">
    <p>Culture Compass Report &mdash; Generated ${date}</p>
    <p>COLLECTIVE culture + communication &mdash; Confidential</p>
  </div>`;
}

