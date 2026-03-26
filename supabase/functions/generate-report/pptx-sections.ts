/**
 * PPTX slide builders for the generate-report edge function.
 * Each function adds one or more slides to a PptxGenJS presentation.
 *
 * Respects payload.sections — only builds sections where included === true.
 * When payload.sections is absent, all sections are included by default.
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import { getDimensionColor } from './_lib.ts';
import { BRAND, DIMENSION_LABELS, SEVERITY_COLORS } from './tokens.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pres = any;

// ─── Layout Constants (inches) ──────────────────────────────────────────────

const MARGIN = 0.5;
const CONTENT_W = 9; // 10 - 2 * MARGIN
const TITLE_Y = 0.4;
const CONTENT_Y = 1.2;
const SLIDE_H = 5.625;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip '#' prefix from hex color for PptxGenJS. */
function hex(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

/** Check whether a section is included in the report. */
function isSectionIncluded(
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
  sectionId: string,
): boolean {
  if (!payload.sections || payload.sections.length === 0) return true;
  const section = payload.sections.find((s) => s.id === sectionId);
  return section ? section.included : true;
}

// ─── Section Builders ───────────────────────────────────────────────────────

/**
 * Cover slide — standalone layout, no master template.
 * Large centered title, org name, survey title, archetype badge, date, response count.
 */
export function addCoverSlide(
  pres: Pres,
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
  report: ReportRow,
): void {
  if (!isSectionIncluded(payload, 'cover')) return;

  const slide = pres.addSlide();

  const generatedDate = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Title
  slide.addText(report.title || 'Culture Compass Report', {
    x: MARGIN,
    y: 1.2,
    w: CONTENT_W,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: hex(BRAND.core),
    align: 'center',
    fontFace: 'Arial',
  });

  // Organization name
  slide.addText(payload.survey.organizationName, {
    x: MARGIN,
    y: 2.1,
    w: CONTENT_W,
    h: 0.5,
    fontSize: 20,
    color: hex(BRAND.darkGrey),
    align: 'center',
    fontFace: 'Arial',
  });

  // Survey title
  slide.addText(payload.survey.title, {
    x: MARGIN,
    y: 2.6,
    w: CONTENT_W,
    h: 0.4,
    fontSize: 14,
    color: '757575',
    align: 'center',
    fontFace: 'Arial',
  });

  // Archetype badge
  const archetypeText = payload.compass.archetype;
  const badgeW = Math.max(archetypeText.length * 0.12 + 0.6, 2.5);
  const badgeX = (10 - badgeW) / 2;
  slide.addShape(pres.ShapeType.roundRect, {
    x: badgeX,
    y: 3.2,
    w: badgeW,
    h: 0.45,
    fill: { color: hex(BRAND.lightGrey) },
    rectRadius: 0.1,
  });
  slide.addText(archetypeText, {
    x: badgeX,
    y: 3.2,
    w: badgeW,
    h: 0.45,
    fontSize: 12,
    color: hex(BRAND.core),
    align: 'center',
    fontFace: 'Arial',
  });

  // Date and response count
  slide.addText(`${generatedDate}  |  ${payload.survey.responseCount} responses`, {
    x: MARGIN,
    y: 4.2,
    w: CONTENT_W,
    h: 0.35,
    fontSize: 11,
    color: hex(BRAND.midGrey),
    align: 'center',
    fontFace: 'Arial',
  });

  // Brand mark at bottom
  slide.addText('COLLECTIVE culture + communication', {
    x: MARGIN,
    y: 5.0,
    w: CONTENT_W,
    h: 0.3,
    fontSize: 9,
    color: hex(BRAND.midGrey),
    align: 'center',
    fontFace: 'Arial',
  });
}

/**
 * Executive Summary — one slide with three metric boxes and archetype description.
 */
export function addExecutiveSummarySlide(
  pres: Pres,
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
): void {
  if (!isSectionIncluded(payload, 'executive_summary')) return;

  const slide = pres.addSlide({ masterName: 'COMPASS_MASTER' });

  // Title
  slide.addText('Executive Summary', {
    x: MARGIN,
    y: TITLE_Y,
    w: CONTENT_W,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: hex(BRAND.core),
    fontFace: 'Arial',
  });

  // Metric boxes
  const dimEntries = Object.entries(payload.scores.dimensions);
  const overall = payload.scores.overall;
  const overallPct = ((overall / 4) * 100).toFixed(0);

  const highest = dimEntries.length > 0
    ? dimEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;
  const lowest = dimEntries.length > 0
    ? dimEntries.reduce((a, b) => (a[1] < b[1] ? a : b))
    : null;

  const boxW = 2.8;
  const boxH = 1.2;
  const boxY = 1.5;
  const gap = (CONTENT_W - 3 * boxW) / 2;

  const metrics = [
    { label: 'Overall Score', value: `${overall.toFixed(2)}`, sub: `${overallPct}%` },
    highest
      ? { label: 'Strongest', value: highest[1].toFixed(2), sub: DIMENSION_LABELS[highest[0]] ?? highest[0] }
      : null,
    lowest
      ? { label: 'Needs Focus', value: lowest[1].toFixed(2), sub: DIMENSION_LABELS[lowest[0]] ?? lowest[0] }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; sub: string }>;

  metrics.forEach((metric, i) => {
    const boxX = MARGIN + i * (boxW + gap);

    // Box background
    slide.addShape(pres.ShapeType.roundRect, {
      x: boxX,
      y: boxY,
      w: boxW,
      h: boxH,
      fill: { color: hex(BRAND.lightGrey) },
      rectRadius: 0.08,
    });

    // Value
    slide.addText(metric.value, {
      x: boxX,
      y: boxY + 0.1,
      w: boxW,
      h: 0.55,
      fontSize: 28,
      bold: true,
      color: hex(BRAND.core),
      align: 'center',
      fontFace: 'Arial',
    });

    // Sub-label
    slide.addText(metric.sub, {
      x: boxX,
      y: boxY + 0.55,
      w: boxW,
      h: 0.3,
      fontSize: 11,
      color: hex(BRAND.textSecondary),
      align: 'center',
      fontFace: 'Arial',
    });

    // Label
    slide.addText(metric.label, {
      x: boxX,
      y: boxY + 0.85,
      w: boxW,
      h: 0.25,
      fontSize: 9,
      color: hex(BRAND.midGrey),
      align: 'center',
      fontFace: 'Arial',
    });
  });

  // Archetype description
  if (payload.compass.archetypeDescription) {
    slide.addText(
      `Archetype: ${payload.compass.archetype} — ${payload.compass.archetypeDescription}`,
      {
        x: MARGIN,
        y: 3.1,
        w: CONTENT_W,
        h: 1.5,
        fontSize: 11,
        color: hex(BRAND.textSecondary),
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      },
    );
  }
}

/**
 * Compass Overview — dimension score bars with archetype card.
 */
export function addCompassOverviewSlide(
  pres: Pres,
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
): void {
  if (!isSectionIncluded(payload, 'compass_overview')) return;

  const slide = pres.addSlide({ masterName: 'COMPASS_MASTER' });

  // Title
  slide.addText('Compass Overview', {
    x: MARGIN,
    y: TITLE_Y,
    w: CONTENT_W,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: hex(BRAND.core),
    fontFace: 'Arial',
  });

  const dims = Object.entries(payload.compass.dimensionPercentages);
  const barMaxW = 6;
  const barH = 0.32;
  const barSpacing = 0.5;
  const labelW = 1.6;
  const scoreW = 0.8;
  const barX = MARGIN + labelW + 0.1;

  dims.forEach(([code, pct], i) => {
    const y = CONTENT_Y + i * barSpacing;
    const score = payload.scores.dimensions[code] ?? 0;
    const color = getDimensionColor(code);
    const fillW = Math.max((pct / 100) * barMaxW, 0.05);

    // Label
    slide.addText(DIMENSION_LABELS[code] ?? code, {
      x: MARGIN,
      y,
      w: labelW,
      h: barH,
      fontSize: 10,
      color: hex(BRAND.textPrimary),
      align: 'right',
      fontFace: 'Arial',
      valign: 'middle',
    });

    // Background bar
    slide.addShape(pres.ShapeType.roundRect, {
      x: barX,
      y: y + 0.02,
      w: barMaxW,
      h: barH - 0.04,
      fill: { color: hex(BRAND.lightGrey) },
      rectRadius: 0.04,
    });

    // Filled bar
    slide.addShape(pres.ShapeType.roundRect, {
      x: barX,
      y: y + 0.02,
      w: fillW,
      h: barH - 0.04,
      fill: { color: hex(color) },
      rectRadius: 0.04,
    });

    // Score text
    slide.addText(`${score.toFixed(2)}`, {
      x: barX + barMaxW + 0.1,
      y,
      w: scoreW,
      h: barH,
      fontSize: 10,
      color: hex(BRAND.textSecondary),
      fontFace: 'Arial',
      valign: 'middle',
    });
  });

  // Archetype card below bars
  const cardY = CONTENT_Y + dims.length * barSpacing + 0.3;
  slide.addShape(pres.ShapeType.roundRect, {
    x: MARGIN,
    y: cardY,
    w: CONTENT_W,
    h: 0.7,
    fill: { color: hex(BRAND.lightGrey) },
    rectRadius: 0.08,
  });
  slide.addText(
    `Culture Archetype: ${payload.compass.archetype}`,
    {
      x: MARGIN + 0.2,
      y: cardY + 0.05,
      w: CONTENT_W - 0.4,
      h: 0.6,
      fontSize: 13,
      bold: true,
      color: hex(BRAND.core),
      fontFace: 'Arial',
      valign: 'middle',
    },
  );
}

/**
 * Dimension Deep Dives — one slide per dimension.
 * Colored dot, large score, bar, and dimension-specific recommendations.
 */
export function addDimensionDeepDiveSlides(
  pres: Pres,
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
): void {
  if (!isSectionIncluded(payload, 'dimension_deep_dives')) return;

  const dims = Object.entries(payload.scores.dimensions);
  if (dims.length === 0) return;

  for (const [code, score] of dims) {
    const slide = pres.addSlide({ masterName: 'COMPASS_MASTER' });
    const color = getDimensionColor(code);
    const pct = ((score / 4) * 100).toFixed(0);
    const label = DIMENSION_LABELS[code] ?? code;

    // Colored dot
    slide.addShape(pres.ShapeType.ellipse, {
      x: MARGIN,
      y: TITLE_Y + 0.08,
      w: 0.3,
      h: 0.3,
      fill: { color: hex(color) },
    });

    // Dimension title
    slide.addText(label, {
      x: MARGIN + 0.4,
      y: TITLE_Y,
      w: CONTENT_W - 0.4,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: hex(BRAND.core),
      fontFace: 'Arial',
    });

    // Large score
    slide.addText(`${score.toFixed(2)} / 4.00`, {
      x: MARGIN,
      y: CONTENT_Y,
      w: 3,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: hex(BRAND.textPrimary),
      fontFace: 'Arial',
    });

    // Percentage
    slide.addText(`${pct}%`, {
      x: MARGIN + 3.1,
      y: CONTENT_Y,
      w: 1.2,
      h: 0.6,
      fontSize: 20,
      color: hex(BRAND.midGrey),
      fontFace: 'Arial',
    });

    // Score bar
    const barY = CONTENT_Y + 0.7;
    const barW = 6;
    const barH = 0.25;
    const fillW = Math.max((Number(pct) / 100) * barW, 0.05);

    slide.addShape(pres.ShapeType.roundRect, {
      x: MARGIN,
      y: barY,
      w: barW,
      h: barH,
      fill: { color: hex(BRAND.lightGrey) },
      rectRadius: 0.04,
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: MARGIN,
      y: barY,
      w: fillW,
      h: barH,
      fill: { color: hex(color) },
      rectRadius: 0.04,
    });

    // Recommendations for this dimension
    const recs = payload.recommendations.filter((r) => r.dimension === code);
    if (recs.length > 0) {
      slide.addText('Recommendations', {
        x: MARGIN,
        y: barY + 0.5,
        w: CONTENT_W,
        h: 0.35,
        fontSize: 14,
        bold: true,
        color: hex(BRAND.textPrimary),
        fontFace: 'Arial',
      });

      const recTexts = recs.map((r) => ({
        text: `\u2022  ${r.title}`,
        options: {
          fontSize: 10,
          color: hex(BRAND.textSecondary),
          fontFace: 'Arial',
          breakLine: true,
          paraSpaceAfter: 4,
        },
      }));

      slide.addText(recTexts, {
        x: MARGIN + 0.2,
        y: barY + 0.85,
        w: CONTENT_W - 0.4,
        h: SLIDE_H - barY - 1.4,
        valign: 'top',
        wrap: true,
      });
    }
  }
}

/**
 * Segment Analysis — table slides with header row and alternating fills.
 * Splits to continuation slides if rows exceed available space.
 */
export function addSegmentAnalysisSlides(
  pres: Pres,
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
): void {
  if (!isSectionIncluded(payload, 'segment_analysis')) return;

  const segmentEntries = Object.entries(payload.scores.segments);
  if (segmentEntries.length === 0) return;

  // Group by segment type
  const grouped: Record<string, Array<{ value: string; scores: Record<string, number> }>> = {};
  for (const [key, scores] of segmentEntries) {
    const colonIdx = key.indexOf(':');
    const type = key.substring(0, colonIdx);
    const value = key.substring(colonIdx + 1);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ value, scores });
  }

  const dimCodes = Object.keys(payload.scores.dimensions);
  const maxRowsPerSlide = 8;

  for (const [type, segments] of Object.entries(grouped)) {
    // Build header
    const headerRow = [
      { text: type, options: { bold: true, color: 'FFFFFF', fill: { color: hex(BRAND.core) }, fontSize: 10, fontFace: 'Arial' } },
      ...dimCodes.map((c) => ({
        text: DIMENSION_LABELS[c] ?? c,
        options: { bold: true, color: 'FFFFFF', fill: { color: hex(BRAND.core) }, fontSize: 10, fontFace: 'Arial', align: 'center' as const },
      })),
    ];

    // Build data rows
    const dataRows = segments.map((seg, rowIdx) => [
      {
        text: seg.value,
        options: {
          fontSize: 10,
          fontFace: 'Arial',
          fill: { color: rowIdx % 2 === 0 ? hex(BRAND.lightGrey) : 'FFFFFF' },
        },
      },
      ...dimCodes.map((c) => ({
        text: seg.scores[c] != null ? seg.scores[c].toFixed(2) : '\u2014',
        options: {
          fontSize: 10,
          fontFace: 'Arial',
          align: 'center' as const,
          fill: { color: rowIdx % 2 === 0 ? hex(BRAND.lightGrey) : 'FFFFFF' },
        },
      })),
    ]);

    // Paginate data rows across slides
    let rowOffset = 0;
    let isFirstSlide = true;

    while (rowOffset < dataRows.length) {
      const slide = pres.addSlide({ masterName: 'COMPASS_MASTER' });
      const chunk = dataRows.slice(rowOffset, rowOffset + maxRowsPerSlide);
      const tableRows = [headerRow, ...chunk];

      const titleText = isFirstSlide
        ? 'Segment Analysis'
        : 'Segment Analysis (continued)';

      slide.addText(titleText, {
        x: MARGIN,
        y: TITLE_Y,
        w: CONTENT_W,
        h: 0.5,
        fontSize: 24,
        bold: true,
        color: hex(BRAND.core),
        fontFace: 'Arial',
      });

      // Compute column widths: first column wider, rest equally split
      const firstColW = 2.2;
      const remainingW = (CONTENT_W - firstColW) / Math.max(dimCodes.length, 1);
      const colW = [firstColW, ...Array(dimCodes.length).fill(remainingW)] as number[];

      slide.addTable(tableRows, {
        x: MARGIN,
        y: CONTENT_Y,
        w: CONTENT_W,
        colW,
        border: { pt: 0.5, color: hex(BRAND.border) },
        rowH: 0.35,
        margin: [4, 6, 4, 6],
      });

      rowOffset += maxRowsPerSlide;
      isFirstSlide = false;
    }
  }
}

/**
 * Recommendations — grouped by severity, card-like blocks with colored left borders.
 * Splits across slides (max ~3-4 recommendations per slide).
 */
export function addRecommendationSlides(
  pres: Pres,
  payload: ReportPayload & { sections?: Array<{ id: string; included: boolean }> },
): void {
  if (!isSectionIncluded(payload, 'recommendations')) return;

  const recs = payload.recommendations;
  if (recs.length === 0) return;

  // Group by severity in order: critical, high, medium, healthy/low
  const severityOrder = ['critical', 'high', 'medium', 'healthy', 'low'];
  const sorted = [...recs].sort((a, b) => {
    const ai = severityOrder.indexOf(a.severity);
    const bi = severityOrder.indexOf(b.severity);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const maxPerSlide = 3;
  let recOffset = 0;
  let isFirstSlide = true;

  while (recOffset < sorted.length) {
    const slide = pres.addSlide({ masterName: 'COMPASS_MASTER' });
    const chunk = sorted.slice(recOffset, recOffset + maxPerSlide);

    const titleText = isFirstSlide ? 'Recommendations' : 'Recommendations (continued)';

    slide.addText(titleText, {
      x: MARGIN,
      y: TITLE_Y,
      w: CONTENT_W,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: hex(BRAND.core),
      fontFace: 'Arial',
    });

    chunk.forEach((rec, i) => {
      const cardY = CONTENT_Y + i * 1.2;
      const cardH = 1.05;
      const severityColor = SEVERITY_COLORS[rec.severity] ?? BRAND.midGrey;
      const dimLabel = DIMENSION_LABELS[rec.dimension] ?? rec.dimension;

      // Severity color left border (thin tall rect)
      slide.addShape(pres.ShapeType.rect, {
        x: MARGIN,
        y: cardY,
        w: 0.06,
        h: cardH,
        fill: { color: hex(severityColor) },
      });

      // Title
      slide.addText(rec.title, {
        x: MARGIN + 0.2,
        y: cardY,
        w: CONTENT_W - 0.4,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: hex(BRAND.textPrimary),
        fontFace: 'Arial',
        valign: 'middle',
      });

      // Severity + dimension meta line
      const severityLabel = rec.severity.charAt(0).toUpperCase() + rec.severity.slice(1);
      slide.addText(`${severityLabel}  \u2022  ${dimLabel}`, {
        x: MARGIN + 0.2,
        y: cardY + 0.28,
        w: CONTENT_W - 0.4,
        h: 0.2,
        fontSize: 9,
        color: hex(severityColor),
        fontFace: 'Arial',
        valign: 'middle',
      });

      // Description
      slide.addText(rec.description, {
        x: MARGIN + 0.2,
        y: cardY + 0.48,
        w: CONTENT_W - 0.4,
        h: 0.25,
        fontSize: 10,
        color: hex(BRAND.textSecondary),
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      // Actions as bullet list
      if (rec.actions.length > 0) {
        const actionTexts = rec.actions.map((a) => ({
          text: `\u2022  ${a}`,
          options: {
            fontSize: 9,
            color: hex(BRAND.textSecondary),
            fontFace: 'Arial',
            breakLine: true,
          },
        }));

        slide.addText(actionTexts, {
          x: MARGIN + 0.35,
          y: cardY + 0.72,
          w: CONTENT_W - 0.6,
          h: cardH - 0.72,
          valign: 'top',
          wrap: true,
        });
      }
    });

    recOffset += maxPerSlide;
    isFirstSlide = false;
  }
}
