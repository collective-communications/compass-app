/**
 * HTML section renderers for the report generator.
 * Each function renders one section of the self-contained HTML report.
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import { escapeHtml, getDimensionColor } from './_lib.ts';
import { BRAND, DIMENSION_LABELS, SEVERITY_COLORS } from './tokens.ts';

export function renderCoverPage(payload: ReportPayload, report: ReportRow, date: string): string {
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

export function renderExecutiveSummary(payload: ReportPayload): string {
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

export function renderCompassOverview(payload: ReportPayload): string {
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

export function renderDimensionDeepDives(payload: ReportPayload): string {
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

export function renderSegmentAnalysis(payload: ReportPayload): string {
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

export function renderRecommendations(payload: ReportPayload): string {
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

export function renderFooter(date: string): string {
  return `
  <div class="footer">
    <p>Culture Compass Report &mdash; Generated ${date}</p>
    <p>COLLECTIVE culture + communication &mdash; Confidential</p>
  </div>`;
}
