/**
 * DOCX section builders for the report generator.
 * Each function returns an ISectionOptions object for inclusion in the Document.
 *
 * Section builders receive the full payload but only render their own content.
 * The render-docx.ts orchestrator handles section filtering via payload.sections.
 */

import {
  type ISectionOptions,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  BorderStyle,
  ShadingType,
  Footer,
  convertInchesToTwip,
  VerticalAlign,
  TableLayoutType,
} from 'https://esm.sh/docx@9';
import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';
import { BRAND, DIMENSION_LABELS, SEVERITY_COLORS } from './tokens.ts';
import { getDimensionColor } from './_lib.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Strip the leading '#' from a hex color string. docx expects bare hex. */
function hex(color: string): string {
  return color.replace(/^#/, '');
}

/** Create a standard footer for all pages. */
function buildFooter(generatedDate: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: `Culture Compass Report \u2014 Generated ${generatedDate}`,
            font: 'Segoe UI',
            size: 16, // 8pt
            color: hex(BRAND.midGrey),
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 0 },
        children: [
          new TextRun({
            text: 'COLLECTIVE culture + communication \u2014 Confidential',
            font: 'Segoe UI',
            size: 16, // 8pt
            color: hex(BRAND.midGrey),
          }),
        ],
      }),
    ],
  });
}

/** Shared page properties (A4 margins). */
function pageProperties(): Partial<ISectionOptions['properties']> {
  return {
    page: {
      margin: {
        top: convertInchesToTwip(1),
        right: convertInchesToTwip(1),
        bottom: convertInchesToTwip(1.2),
        left: convertInchesToTwip(1),
      },
    },
  };
}

/** No-border cell borders (transparent). */
const NONE_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const;

// ── Cover Page ──────────────────────────────────────────────────────────────

export function buildCoverSection(
  payload: ReportPayload,
  report: ReportRow,
  generatedDate: string,
): ISectionOptions {
  return {
    properties: {
      ...pageProperties(),
    },
    footers: { default: buildFooter(generatedDate) },
    children: [
      // Spacer
      new Paragraph({ spacing: { before: 4000 }, children: [] }),

      // Brand mark
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [
          new TextRun({
            text: 'COLLECTIVE culture + communication',
            font: 'Segoe UI',
            size: 28, // 14pt
            bold: true,
            color: hex(BRAND.core),
          }),
        ],
      }),

      // Report title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: report.title,
            font: 'Segoe UI',
            size: 56, // 28pt
            bold: true,
            color: hex(BRAND.core),
          }),
        ],
      }),

      // Organization name
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: payload.survey.organizationName,
            font: 'Segoe UI',
            size: 32, // 16pt
            color: hex(BRAND.textSecondary),
          }),
        ],
      }),

      // Divider line (simulated with a thin bordered paragraph)
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: hex(BRAND.clarity),
            space: 1,
          },
        },
        children: [],
      }),

      // Survey title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: payload.survey.title,
            font: 'Segoe UI',
            size: 20, // 10pt
            color: hex(BRAND.midGrey),
          }),
        ],
      }),

      // Response count
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${payload.survey.responseCount} responses`,
            font: 'Segoe UI',
            size: 20, // 10pt
            color: hex(BRAND.midGrey),
          }),
        ],
      }),

      // Generated date
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Generated ${generatedDate}`,
            font: 'Segoe UI',
            size: 20, // 10pt
            color: hex(BRAND.midGrey),
          }),
        ],
      }),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),
    ],
  };
}

// ── Executive Summary ───────────────────────────────────────────────────────

export function buildExecutiveSummarySection(
  payload: ReportPayload,
  _report: ReportRow,
  generatedDate: string,
): ISectionOptions {
  const overall = payload.scores.overall;
  const overallPct = ((overall / 4) * 100).toFixed(0);
  const dimEntries = Object.entries(payload.scores.dimensions);

  const highest =
    dimEntries.length > 0
      ? dimEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
      : null;
  const lowest =
    dimEntries.length > 0
      ? dimEntries.reduce((a, b) => (a[1] < b[1] ? a : b))
      : null;

  const children: Paragraph[] = [
    // Heading
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Executive Summary' })],
    }),

    // Summary body
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `The ${payload.survey.organizationName} culture assessment received `,
        }),
        new TextRun({
          text: `${payload.survey.responseCount}`,
          bold: true,
        }),
        new TextRun({ text: ' responses. The overall culture health score is ' }),
        new TextRun({
          text: `${overall.toFixed(2)} / 4.00`,
          bold: true,
        }),
        new TextRun({ text: ` (${overallPct}%).` }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "The organization's culture archetype is " }),
        new TextRun({
          text: payload.compass.archetype,
          bold: true,
        }),
        new TextRun({ text: '.' }),
      ],
    }),
  ];

  if (payload.compass.archetypeDescription) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: payload.compass.archetypeDescription }),
        ],
      }),
    );
  }

  // Score metrics as 3-column table
  const scoreColumns: Array<{ value: string; label: string }> = [
    { value: overall.toFixed(2), label: 'Overall Score' },
  ];

  if (highest) {
    scoreColumns.push({
      value: highest[1].toFixed(2),
      label: `Strongest: ${DIMENSION_LABELS[highest[0]] ?? highest[0]}`,
    });
  }
  if (lowest) {
    scoreColumns.push({
      value: lowest[1].toFixed(2),
      label: `Needs Focus: ${DIMENSION_LABELS[lowest[0]] ?? lowest[0]}`,
    });
  }

  const scoreTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: scoreColumns.map(
          (col) =>
            new TableCell({
              width: { size: Math.floor(100 / scoreColumns.length), type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: hex(BRAND.lightGrey) },
              borders: NONE_BORDERS,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120, after: 40 },
                  children: [
                    new TextRun({
                      text: col.value,
                      font: 'Segoe UI',
                      size: 48, // 24pt
                      bold: true,
                      color: hex(BRAND.core),
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 120 },
                  children: [
                    new TextRun({
                      text: col.label,
                      font: 'Segoe UI',
                      size: 18, // 9pt
                      color: hex(BRAND.textSecondary),
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
    ],
  });

  return {
    properties: { ...pageProperties() },
    footers: { default: buildFooter(generatedDate) },
    children: [...children, scoreTable],
  };
}

// ── Compass Overview ────────────────────────────────────────────────────────

export function buildCompassOverviewSection(
  payload: ReportPayload,
  _report: ReportRow,
  generatedDate: string,
): ISectionOptions {
  const dims = Object.entries(payload.compass.dimensionPercentages);

  const children: Paragraph[] = [
    // Heading
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Compass Overview' })],
    }),

    // Archetype description card (bordered paragraph)
    new Paragraph({
      spacing: { before: 120, after: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
        left: { style: BorderStyle.SINGLE, size: 8, color: hex(BRAND.core), space: 8 },
        right: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
      },
      children: [
        new TextRun({
          text: `Culture Archetype: ${payload.compass.archetype}`,
          bold: true,
          size: 28,
          color: hex(BRAND.core),
        }),
      ],
    }),
  ];

  if (payload.compass.archetypeDescription) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: payload.compass.archetypeDescription }),
        ],
      }),
    );
  }

  // Subheading
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Dimension Scores' })],
    }),
  );

  // Dimension score bars as table rows
  for (const [code, pct] of dims) {
    const score = payload.scores.dimensions[code] ?? 0;
    const dimColor = getDimensionColor(code);
    const fillWidth = Math.max(1, Math.round(pct));
    const emptyWidth = Math.max(1, 100 - fillWidth);

    const barRow = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            // Label cell
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: NONE_BORDERS,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: DIMENSION_LABELS[code] ?? code,
                      bold: true,
                      size: 20, // 10pt
                    }),
                  ],
                }),
              ],
            }),
            // Bar cell — nested 2-cell table for proportional fill
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: NONE_BORDERS,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  layout: TableLayoutType.FIXED,
                  rows: [
                    new TableRow({
                      height: { value: 200, rule: 'exact' as const },
                      children: [
                        // Filled portion
                        new TableCell({
                          width: { size: fillWidth, type: WidthType.PERCENTAGE },
                          shading: {
                            type: ShadingType.CLEAR,
                            fill: hex(dimColor),
                          },
                          borders: NONE_BORDERS,
                          children: [new Paragraph({ children: [] })],
                        }),
                        // Empty portion
                        new TableCell({
                          width: { size: emptyWidth, type: WidthType.PERCENTAGE },
                          shading: {
                            type: ShadingType.CLEAR,
                            fill: hex(BRAND.lightGrey),
                          },
                          borders: NONE_BORDERS,
                          children: [new Paragraph({ children: [] })],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            // Score value cell
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: NONE_BORDERS,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: `${score.toFixed(2)} / 4`,
                      bold: true,
                      size: 20, // 10pt
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }));
    // Tables cannot be pushed as Paragraph — use a section-level approach
    // We'll collect tables separately and interleave
    (children as unknown as Array<Paragraph | Table>).push(barRow);
  }

  return {
    properties: { ...pageProperties() },
    footers: { default: buildFooter(generatedDate) },
    children: children as unknown as ISectionOptions['children'],
  };
}

// ── Dimension Deep Dives ────────────────────────────────────────────────────

export function buildDimensionDeepDivesSection(
  payload: ReportPayload,
  _report: ReportRow,
  generatedDate: string,
): ISectionOptions {
  const dims = Object.entries(payload.scores.dimensions);
  const children: Array<Paragraph | Table> = [];

  if (dims.length === 0) {
    return {
      properties: { ...pageProperties() },
      footers: { default: buildFooter(generatedDate) },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Dimension Deep Dives' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'No dimension data available.' })],
        }),
      ],
    };
  }

  // Section heading on first page
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Dimension Deep Dives' })],
    }),
  );

  for (let i = 0; i < dims.length; i++) {
    const [code, score] = dims[i];
    const pct = ((score / 4) * 100).toFixed(0);
    const dimColor = getDimensionColor(code);
    const recs = payload.recommendations.filter((r) => r.dimension === code);

    // Page break before each dimension (except the first, which follows the heading)
    if (i > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Dimension heading with colored text
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: hex(dimColor),
            space: 4,
          },
        },
        children: [
          new TextRun({
            text: DIMENSION_LABELS[code] ?? code,
            font: 'Segoe UI',
            size: 36, // 18pt
            bold: true,
            color: hex(dimColor),
          }),
        ],
      }),
    );

    // Score display
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: 'Score: ' }),
          new TextRun({
            text: `${score.toFixed(2)} / 4.00`,
            bold: true,
          }),
          new TextRun({ text: ` (${pct}%)` }),
        ],
      }),
    );

    // Recommendations for this dimension
    if (recs.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: 'Key Recommendations' })],
        }),
      );

      for (const rec of recs) {
        const sevColor = SEVERITY_COLORS[rec.severity] ?? BRAND.midGrey;

        // Severity card with colored left border
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            border: {
              left: {
                style: BorderStyle.SINGLE,
                size: 12,
                color: hex(sevColor),
                space: 8,
              },
            },
            children: [
              new TextRun({
                text: `[${rec.severity.toUpperCase()}] `,
                bold: true,
                color: hex(sevColor),
                size: 18, // 9pt
              }),
              new TextRun({
                text: rec.title,
                bold: true,
                size: 22, // 11pt
              }),
            ],
          }),
        );

        if (rec.description) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              indent: { left: convertInchesToTwip(0.3) },
              children: [new TextRun({ text: rec.description, size: 20 })],
            }),
          );
        }

        // Action items as bulleted paragraphs
        for (const action of rec.actions) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              indent: { left: convertInchesToTwip(0.5) },
              bullet: { level: 0 },
              children: [new TextRun({ text: action, size: 20 })],
            }),
          );
        }
      }
    }
  }

  return {
    properties: { ...pageProperties() },
    footers: { default: buildFooter(generatedDate) },
    children: children as ISectionOptions['children'],
  };
}

// ── Segment Analysis ────────────────────────────────────────────────────────

export function buildSegmentAnalysisSection(
  payload: ReportPayload,
  _report: ReportRow,
  generatedDate: string,
): ISectionOptions {
  const segmentEntries = Object.entries(payload.scores.segments);
  const dimCodes = Object.keys(payload.scores.dimensions);

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Segment Analysis' })],
    }),
  ];

  if (segmentEntries.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
          left: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 8 },
          right: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
        },
        children: [
          new TextRun({
            text: 'No segment data available. Segments are only displayed when the response count meets the anonymity threshold.',
          }),
        ],
      }),
    );

    return {
      properties: { ...pageProperties() },
      footers: { default: buildFooter(generatedDate) },
      children: children as ISectionOptions['children'],
    };
  }

  // Group by segment type
  const grouped: Record<string, Array<{ value: string; scores: Record<string, number> }>> = {};
  for (const [key, scores] of segmentEntries) {
    const separatorIndex = key.indexOf(':');
    const type = separatorIndex >= 0 ? key.slice(0, separatorIndex) : key;
    const value = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ value, scores });
  }

  for (const [type, segments] of Object.entries(grouped)) {
    // Segment type subheading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: type })],
      }),
    );

    // Column count: segment value + one per dimension
    const colCount = 1 + dimCodes.length;
    const colWidth = Math.floor(100 / colCount);

    // Header row
    const headerCells = [
      new TableCell({
        width: { size: colWidth, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: hex(BRAND.core) },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: type,
                bold: true,
                color: 'FFFFFF',
                size: 20,
              }),
            ],
          }),
        ],
      }),
      ...dimCodes.map(
        (c) =>
          new TableCell({
            width: { size: colWidth, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: hex(BRAND.core) },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: DIMENSION_LABELS[c] ?? c,
                    bold: true,
                    color: 'FFFFFF',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
      ),
    ];

    // Data rows with alternating shading
    const dataRows = segments.map(
      (seg, rowIdx) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading:
                rowIdx % 2 === 1
                  ? { type: ShadingType.CLEAR, fill: hex(BRAND.lightGrey) }
                  : undefined,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: seg.value,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            ...dimCodes.map(
              (c) =>
                new TableCell({
                  width: { size: colWidth, type: WidthType.PERCENTAGE },
                  shading:
                    rowIdx % 2 === 1
                      ? { type: ShadingType.CLEAR, fill: hex(BRAND.lightGrey) }
                      : undefined,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text:
                            seg.scores[c] != null
                              ? seg.scores[c].toFixed(2)
                              : '\u2014',
                          size: 20,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          ],
        }),
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: headerCells }), ...dataRows],
    });

    children.push(table);

    // Spacing after table
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  return {
    properties: { ...pageProperties() },
    footers: { default: buildFooter(generatedDate) },
    children: children as ISectionOptions['children'],
  };
}

// ── Recommendations ─────────────────────────────────────────────────────────

export function buildRecommendationsSection(
  payload: ReportPayload,
  _report: ReportRow,
  generatedDate: string,
): ISectionOptions {
  const children: Array<Paragraph> = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Recommendations' })],
    }),
  ];

  if (payload.recommendations.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
          left: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 8 },
          right: { style: BorderStyle.SINGLE, size: 1, color: hex(BRAND.border), space: 4 },
        },
        children: [
          new TextRun({
            text: 'No recommendations have been generated for this survey.',
          }),
        ],
      }),
    );

    return {
      properties: { ...pageProperties() },
      footers: { default: buildFooter(generatedDate) },
      children,
    };
  }

  // Group recommendations by severity
  const severityOrder = ['critical', 'high', 'medium', 'low', 'healthy'];
  const grouped: Record<string, ReportPayload['recommendations']> = {};

  for (const rec of payload.recommendations) {
    const sev = rec.severity;
    if (!grouped[sev]) grouped[sev] = [];
    grouped[sev].push(rec);
  }

  for (const severity of severityOrder) {
    const recs = grouped[severity];
    if (!recs || recs.length === 0) continue;

    const sevColor = SEVERITY_COLORS[severity] ?? BRAND.midGrey;

    // Severity group heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `${severity.charAt(0).toUpperCase()}${severity.slice(1)} Priority`,
            color: hex(sevColor),
          }),
        ],
      }),
    );

    for (const rec of recs) {
      // Recommendation card with colored left border
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: hex(sevColor),
              space: 8,
            },
          },
          children: [
            new TextRun({
              text: rec.title,
              bold: true,
              size: 24, // 12pt
            }),
          ],
        }),
      );

      // Dimension label
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: convertInchesToTwip(0.3) },
          children: [
            new TextRun({
              text: `Dimension: ${DIMENSION_LABELS[rec.dimension] ?? rec.dimension}`,
              size: 20,
              color: hex(BRAND.textSecondary),
            }),
          ],
        }),
      );

      // Description
      if (rec.description) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.3) },
            children: [new TextRun({ text: rec.description, size: 20 })],
          }),
        );
      }

      // Action items as bulleted list
      for (const action of rec.actions) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: convertInchesToTwip(0.5) },
            bullet: { level: 0 },
            children: [new TextRun({ text: action, size: 20 })],
          }),
        );
      }
    }
  }

  return {
    properties: { ...pageProperties() },
    footers: { default: buildFooter(generatedDate) },
    children,
  };
}
