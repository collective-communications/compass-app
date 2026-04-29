/**
 * Section builders for the pdf-lib report renderer.
 *
 * Pure TypeScript — no esm.sh imports. Every function draws into a
 * DrawContext, which is implemented in render-pdf.ts on top of pdf-lib.
 * This separation keeps section logic testable under bun without
 * pulling in the Deno-only pdf-lib import.
 */

import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import type { DrawContext } from './pdf-layout.ts';
import {
  CONTENT_WIDTH,
  MARGIN_LEFT,
  PAGE_HEIGHT,
  MARGIN_TOP,
} from './pdf-layout.ts';
import { BRAND, DIMENSION_LABELS, SEVERITY_COLORS } from './tokens.ts';
import { getDimensionColor } from './_lib.ts';

// ─── Helpers ───────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'healthy'];

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical Priority',
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
  healthy: 'Healthy',
};

function sectionHeading(ctx: DrawContext, text: string, color: string): void {
  ctx.drawText(text, { size: 18, font: 'bold', color });
  ctx.moveDown(4);
  ctx.drawLine(
    MARGIN_LEFT,
    ctx.y,
    MARGIN_LEFT + CONTENT_WIDTH,
    ctx.y,
    { color: BRAND.border, width: 1 },
  );
  ctx.moveDown(16);
}

function subHeading(ctx: DrawContext, text: string, color: string = BRAND.darkGrey): void {
  ctx.drawText(text, { size: 14, font: 'bold', color });
  ctx.moveDown(12);
}

function computeOverallPct(payload: ReportPayload): number {
  const dimPcts = Object.values(payload.compass.dimensionPercentages);
  if (dimPcts.length === 0) return 0;
  return dimPcts.reduce((a, b) => a + b, 0) / dimPcts.length;
}

function drawBar(
  ctx: DrawContext,
  x: number,
  y: number,
  trackWidth: number,
  fillFraction: number,
  height: number,
  fillColor: string,
): void {
  const clamped = Math.max(0, Math.min(1, fillFraction));
  ctx.drawRect(x, y, trackWidth, height, {
    fillColor: BRAND.lightGrey,
    radius: 4,
  });
  if (clamped > 0) {
    const fillWidth = Math.max(8, trackWidth * clamped);
    ctx.drawRect(x, y, fillWidth, height, {
      fillColor,
      radius: 4,
    });
  }
}

function drawBulletItem(ctx: DrawContext, text: string, indent: number): void {
  const bulletX = MARGIN_LEFT + indent;
  ctx.drawText('•', { size: 10, color: BRAND.textPrimary, x: bulletX });
  const lines = ctx.drawTextWrapped(text, {
    size: 10,
    color: BRAND.textPrimary,
    x: bulletX + 10,
    maxWidth: CONTENT_WIDTH - indent - 10,
    lineHeight: 1.3,
  });
  if (lines <= 1) ctx.moveDown(14);
}

// ─── Section 1: Cover Page ─────────────────────────────────────────────────

export function buildCoverSection(
  ctx: DrawContext,
  payload: ReportPayload,
  report: ReportRow,
  generatedDate: string,
): void {
  ctx.addPage();

  const centerX = MARGIN_LEFT + CONTENT_WIDTH / 2;
  const startY = PAGE_HEIGHT - MARGIN_TOP - 200;

  // Brand wordmark
  ctx.y = startY;
  ctx.drawText('COLLECTIVE culture + communication', {
    size: 14,
    font: 'bold',
    color: BRAND.core,
    align: 'center',
  });
  ctx.moveDown(40);

  // Report title
  ctx.drawText(report.title || payload.survey.title, {
    size: 28,
    font: 'bold',
    color: BRAND.core,
    align: 'center',
  });
  ctx.moveDown(24);

  // Organization name
  ctx.drawText(payload.survey.organizationName, {
    size: 16,
    color: BRAND.textSecondary,
    align: 'center',
  });
  ctx.moveDown(28);

  // Orange divider bar
  const barWidth = 80;
  ctx.drawRect(
    centerX - barWidth / 2,
    ctx.y,
    barWidth,
    3,
    { fillColor: BRAND.clarity },
  );
  ctx.moveDown(28);

  // Survey title
  ctx.drawText(payload.survey.title, {
    size: 10,
    color: BRAND.midGrey,
    align: 'center',
  });
  ctx.moveDown(16);

  // Response count
  ctx.drawText(`${payload.survey.responseCount} responses`, {
    size: 10,
    color: BRAND.midGrey,
    align: 'center',
  });
  ctx.moveDown(16);

  // Generated date
  ctx.drawText(`Generated ${generatedDate}`, {
    size: 10,
    color: BRAND.midGrey,
    align: 'center',
  });
}

// ─── Section 2: Executive Summary ──────────────────────────────────────────

export function buildExecutiveSummarySection(
  ctx: DrawContext,
  payload: ReportPayload,
  _report: ReportRow,
  _generatedDate: string,
): void {
  ctx.addPage();
  sectionHeading(ctx, 'Executive Summary', BRAND.core);

  // Prose — overall score
  const overallPct = computeOverallPct(payload);
  const overallLine = `${payload.survey.organizationName} received ${payload.survey.responseCount} responses. The overall culture health score is ${payload.scores.overall.toFixed(2)} / 4.00 (${overallPct.toFixed(0)}%).`;
  ctx.drawTextWrapped(overallLine, {
    size: 11,
    color: BRAND.textPrimary,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 1.5,
  });
  ctx.moveDown(8);

  // Archetype
  if (payload.compass.archetype) {
    ctx.drawText(`Culture Archetype: ${payload.compass.archetype}`, {
      size: 11,
      font: 'bold',
      color: BRAND.textPrimary,
    });
    ctx.moveDown(6);
    if (payload.compass.archetypeDescription) {
      ctx.drawTextWrapped(payload.compass.archetypeDescription, {
        size: 10,
        color: BRAND.textSecondary,
        maxWidth: CONTENT_WIDTH,
        lineHeight: 1.4,
      });
    }
    ctx.moveDown(20);
  }

  // Score grid — up to 3 columns
  const dims = Object.entries(payload.scores.dimensions);
  const columns: Array<{ value: string; label: string }> = [
    { value: `${overallPct.toFixed(0)}%`, label: 'Overall Score' },
  ];

  if (dims.length > 0) {
    const sorted = [...dims].sort((a, b) => b[1] - a[1]);
    const [bestCode] = sorted[0];
    const [worstCode] = sorted[sorted.length - 1];
    const bestPct = payload.compass.dimensionPercentages[bestCode] ?? 0;
    const worstPct = payload.compass.dimensionPercentages[worstCode] ?? 0;
    columns.push({
      value: `${bestPct.toFixed(0)}%`,
      label: `Strongest: ${DIMENSION_LABELS[bestCode] ?? bestCode}`,
    });
    columns.push({
      value: `${worstPct.toFixed(0)}%`,
      label: `Needs Focus: ${DIMENSION_LABELS[worstCode] ?? worstCode}`,
    });
  }

  const colWidth = CONTENT_WIDTH / columns.length;
  const cardHeight = 72;
  const cardPadding = 8;

  ctx.ensureSpace(cardHeight + 16);

  const cardY = ctx.y;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const colX = MARGIN_LEFT + i * colWidth + cardPadding / 2;
    const innerWidth = colWidth - cardPadding;

    ctx.drawRect(colX, cardY, innerWidth, cardHeight, {
      fillColor: BRAND.lightGrey,
      radius: 4,
    });

    // Large value
    ctx.y = cardY - 18;
    ctx.drawText(col.value, {
      size: 24,
      font: 'bold',
      color: BRAND.core,
      x: colX,
      align: 'center',
    });

    // Label
    ctx.y = cardY - 50;
    ctx.drawText(col.label, {
      size: 9,
      color: BRAND.textSecondary,
      x: colX,
      align: 'center',
    });
  }

  ctx.y = cardY - cardHeight;
  ctx.moveDown(16);
}

// ─── Section 3: Compass Overview ───────────────────────────────────────────

export function buildCompassOverviewSection(
  ctx: DrawContext,
  payload: ReportPayload,
  _report: ReportRow,
  _generatedDate: string,
): void {
  ctx.addPage();
  sectionHeading(ctx, 'Compass Overview', BRAND.core);

  // Archetype card
  const archName = payload.compass.archetype || 'Unclassified';
  const archDesc = payload.compass.archetypeDescription || '';
  const descLines = archDesc
    ? Math.ceil(ctx.textWidth(archDesc, 10) / (CONTENT_WIDTH - 24))
    : 0;
  const cardHeight = 32 + descLines * 14;

  ctx.ensureSpace(cardHeight + 8);
  const cardY = ctx.y;

  ctx.drawRect(MARGIN_LEFT, cardY, CONTENT_WIDTH, cardHeight, {
    fillColor: BRAND.lightGrey,
    radius: 4,
  });
  ctx.drawRect(MARGIN_LEFT, cardY, 4, cardHeight, {
    fillColor: BRAND.core,
  });

  ctx.y = cardY - 14;
  ctx.drawText(`Culture Archetype: ${archName}`, {
    size: 14,
    font: 'bold',
    color: BRAND.core,
    x: MARGIN_LEFT + 14,
  });

  if (archDesc) {
    ctx.moveDown(4);
    ctx.drawTextWrapped(archDesc, {
      size: 10,
      color: BRAND.textSecondary,
      x: MARGIN_LEFT + 14,
      maxWidth: CONTENT_WIDTH - 24,
      lineHeight: 1.4,
    });
  }

  ctx.y = cardY - cardHeight;
  ctx.moveDown(24);

  // Dimension Scores
  subHeading(ctx, 'Dimension Scores');

  const dims = Object.entries(payload.compass.dimensionPercentages);
  const labelWidth = 140;
  const scoreWidth = 60;
  const barTrackWidth = CONTENT_WIDTH - labelWidth - scoreWidth - 16;
  const barX = MARGIN_LEFT + labelWidth + 8;
  const scoreX = MARGIN_LEFT + CONTENT_WIDTH - scoreWidth;
  const rowHeight = 28;

  for (const [code, pct] of dims) {
    ctx.ensureSpace(rowHeight);

    const rawScore = payload.scores.dimensions[code];
    const label = DIMENSION_LABELS[code] ?? code;
    const dimColor = getDimensionColor(code);
    const rowY = ctx.y;

    ctx.drawText(label, {
      size: 10,
      font: 'bold',
      color: BRAND.textPrimary,
      x: MARGIN_LEFT,
    });

    drawBar(ctx, barX, rowY - 4, barTrackWidth, pct / 100, 12, dimColor);

    const scoreStr = rawScore !== undefined ? `${rawScore.toFixed(2)} / 4` : `${pct.toFixed(0)}%`;
    ctx.y = rowY;
    ctx.drawText(scoreStr, {
      size: 10,
      font: 'bold',
      color: BRAND.textPrimary,
      x: scoreX,
    });

    ctx.y = rowY;
    ctx.moveDown(rowHeight);
  }
}

// ─── Section 4: Dimension Deep Dives ───────────────────────────────────────

export function buildDimensionDeepDivesSection(
  ctx: DrawContext,
  payload: ReportPayload,
  _report: ReportRow,
  _generatedDate: string,
): void {
  const dims = Object.entries(payload.scores.dimensions);
  if (dims.length === 0) {
    ctx.addPage();
    sectionHeading(ctx, 'Dimension Deep Dives', BRAND.core);
    ctx.drawText('No dimension data available.', {
      size: 11,
      color: BRAND.textSecondary,
    });
    return;
  }

  for (let i = 0; i < dims.length; i++) {
    const [code, rawScore] = dims[i];
    const pct = payload.compass.dimensionPercentages[code] ?? 0;
    const label = DIMENSION_LABELS[code] ?? code;
    const dimColor = getDimensionColor(code);

    ctx.addPage();

    // Dimension heading with colored underline
    ctx.drawText(label, { size: 20, font: 'bold', color: dimColor });
    ctx.moveDown(4);
    ctx.drawLine(
      MARGIN_LEFT,
      ctx.y,
      MARGIN_LEFT + CONTENT_WIDTH,
      ctx.y,
      { color: dimColor, width: 2 },
    );
    ctx.moveDown(16);

    // Score line
    ctx.drawText(`Score: ${rawScore.toFixed(2)} / 4.00 (${pct.toFixed(0)}%)`, {
      size: 11,
      color: BRAND.textPrimary,
    });
    ctx.moveDown(12);

    // Progress bar
    drawBar(ctx, MARGIN_LEFT, ctx.y, CONTENT_WIDTH * 0.65, pct / 100, 12, dimColor);
    ctx.moveDown(28);

    // Key Recommendations for this dimension
    const dimRecs = payload.recommendations.filter(
      (r) => r.dimension === code,
    );
    if (dimRecs.length === 0) continue;

    subHeading(ctx, 'Key Recommendations');

    for (const rec of dimRecs) {
      drawRecommendationCard(ctx, rec);
    }
  }
}

function drawRecommendationCard(
  ctx: DrawContext,
  rec: ReportPayload['recommendations'][number],
): void {
  const sevColor = SEVERITY_COLORS[rec.severity] ?? BRAND.midGrey;
  const sevLabel = rec.severity.toUpperCase();

  // Estimate card height
  const titleWidth = ctx.textWidth(`[${sevLabel}]  ${rec.title}`, 11);
  const titleLines = Math.max(1, Math.ceil(titleWidth / (CONTENT_WIDTH - 20)));
  const descLines = rec.description
    ? Math.max(1, Math.ceil(ctx.textWidth(rec.description, 10) / (CONTENT_WIDTH - 30)))
    : 0;
  const actionLines = rec.actions.length;
  const cardHeight = titleLines * 16 + descLines * 14 + actionLines * 14 + 16;

  ctx.ensureSpace(cardHeight + 12);
  const cardTop = ctx.y;

  // Left accent border
  ctx.drawRect(MARGIN_LEFT, cardTop, 4, cardHeight, {
    fillColor: sevColor,
  });

  // Severity badge + title
  ctx.y = cardTop;
  const badgeText = `[${sevLabel}]`;
  const badgeWidth = ctx.textWidth(badgeText, 9);
  ctx.drawText(badgeText, {
    size: 9,
    font: 'bold',
    color: sevColor,
    x: MARGIN_LEFT + 12,
  });
  ctx.drawText(rec.title, {
    size: 11,
    font: 'bold',
    color: BRAND.textPrimary,
    x: MARGIN_LEFT + 12 + badgeWidth + 6,
  });
  ctx.moveDown(18);

  // Description
  if (rec.description) {
    ctx.drawTextWrapped(rec.description, {
      size: 10,
      color: BRAND.textSecondary,
      x: MARGIN_LEFT + 12,
      maxWidth: CONTENT_WIDTH - 20,
      lineHeight: 1.4,
    });
    ctx.moveDown(6);
  }

  // Actions
  for (const action of rec.actions) {
    drawBulletItem(ctx, action, 20);
  }

  ctx.moveDown(12);
}

// ─── Section 5: Segment Analysis ───────────────────────────────────────────

export function buildSegmentAnalysisSection(
  ctx: DrawContext,
  payload: ReportPayload,
  _report: ReportRow,
  _generatedDate: string,
): void {
  ctx.addPage();
  sectionHeading(ctx, 'Segment Analysis', BRAND.core);

  const segments = payload.scores.segments;
  const segKeys = Object.keys(segments);

  if (segKeys.length === 0) {
    ctx.drawText(
      'Segment data is not available. Responses may be below the anonymity threshold.',
      { size: 11, color: BRAND.textSecondary },
    );
    return;
  }

  // Group by segment type
  const groups = new Map<string, Array<{ value: string; scores: Record<string, number> }>>();
  for (const key of segKeys) {
    const colonIdx = key.indexOf(':');
    const type = colonIdx > 0 ? key.slice(0, colonIdx) : key;
    const value = colonIdx > 0 ? key.slice(colonIdx + 1) : key;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push({ value, scores: segments[key] });
  }

  const dimCodes = Object.keys(payload.scores.dimensions);
  const firstColWidth = 160;
  const dataColWidth =
    dimCodes.length > 0 ? (CONTENT_WIDTH - firstColWidth) / dimCodes.length : 0;
  const rowHeight = 24;

  for (const [type, rows] of groups) {
    ctx.ensureSpace(rowHeight * 3);
    subHeading(ctx, type.charAt(0).toUpperCase() + type.slice(1));

    // Header row
    drawTableHeader(ctx, type, dimCodes, firstColWidth, dataColWidth, rowHeight);

    // Data rows
    for (let r = 0; r < rows.length; r++) {
      ctx.ensureSpace(rowHeight + 4);

      // Re-draw header if we just got a new page
      if (ctx.y >= PAGE_HEIGHT - MARGIN_TOP - rowHeight) {
        drawTableHeader(ctx, type, dimCodes, firstColWidth, dataColWidth, rowHeight);
      }

      const row = rows[r];
      const isAlt = r % 2 === 1;
      const rowY = ctx.y;

      // Row background
      if (isAlt) {
        ctx.drawRect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight, {
          fillColor: BRAND.lightGrey,
        });
      }

      // Segment value
      ctx.y = rowY - 7;
      ctx.drawText(row.value, {
        size: 10,
        color: BRAND.textPrimary,
        x: MARGIN_LEFT + 8,
      });

      // Dimension scores
      for (let d = 0; d < dimCodes.length; d++) {
        const score = row.scores[dimCodes[d]];
        const cellX = MARGIN_LEFT + firstColWidth + d * dataColWidth;
        ctx.y = rowY - 7;
        ctx.drawText(score !== undefined ? score.toFixed(2) : '—', {
          size: 10,
          color: BRAND.textPrimary,
          x: cellX,
          align: 'center',
        });
      }

      ctx.y = rowY;
      ctx.moveDown(rowHeight);
    }

    ctx.moveDown(16);
  }
}

function drawTableHeader(
  ctx: DrawContext,
  typeLabel: string,
  dimCodes: string[],
  firstColWidth: number,
  dataColWidth: number,
  rowHeight: number,
): void {
  const headerY = ctx.y;

  // Header background
  ctx.drawRect(MARGIN_LEFT, headerY, CONTENT_WIDTH, rowHeight, {
    fillColor: BRAND.core,
  });

  // Type label
  ctx.y = headerY - 7;
  ctx.drawText(typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1), {
    size: 10,
    font: 'bold',
    color: BRAND.white,
    x: MARGIN_LEFT + 8,
  });

  // Dimension labels
  for (let d = 0; d < dimCodes.length; d++) {
    const cellX = MARGIN_LEFT + firstColWidth + d * dataColWidth;
    ctx.y = headerY - 7;
    ctx.drawText(DIMENSION_LABELS[dimCodes[d]] ?? dimCodes[d], {
      size: 10,
      font: 'bold',
      color: BRAND.white,
      x: cellX,
      align: 'center',
    });
  }

  ctx.y = headerY;
  ctx.moveDown(rowHeight);
}

// ─── Section 6: Recommendations ────────────────────────────────────────────

export function buildRecommendationsSection(
  ctx: DrawContext,
  payload: ReportPayload,
  _report: ReportRow,
  _generatedDate: string,
): void {
  ctx.addPage();
  sectionHeading(ctx, 'Recommendations', BRAND.core);

  if (payload.recommendations.length === 0) {
    ctx.drawText('No recommendations available.', {
      size: 11,
      color: BRAND.textSecondary,
    });
    return;
  }

  // Group by severity
  const groups = new Map<string, ReportPayload['recommendations']>();
  for (const sev of SEVERITY_ORDER) {
    const recs = payload.recommendations.filter((r) => r.severity === sev);
    if (recs.length > 0) groups.set(sev, recs);
  }

  for (const [severity, recs] of groups) {
    const sevColor = SEVERITY_COLORS[severity] ?? BRAND.midGrey;
    const groupLabel = SEVERITY_LABELS[severity] ?? severity;

    ctx.ensureSpace(40);
    subHeading(ctx, groupLabel, sevColor);

    for (const rec of recs) {
      drawRecommendationCard(ctx, rec);
    }

    ctx.moveDown(8);
  }
}
