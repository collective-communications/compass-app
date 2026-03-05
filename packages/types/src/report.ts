/**
 * Report generation domain types.
 * Covers report configuration, generation status tracking,
 * and the assembled payload sent to the rendering service.
 */

// ─── Enums (as const objects) ────────────────────────────────────────────────

/** Supported report output formats */
export const ReportFormat = {
  PDF: 'pdf',
  PPTX: 'pptx',
} as const;

export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

/** Report generation lifecycle status */
export const ReportGenerationStatus = {
  QUEUED: 'queued',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ReportGenerationStatus =
  (typeof ReportGenerationStatus)[keyof typeof ReportGenerationStatus];

// ─── Section IDs ─────────────────────────────────────────────────────────────

/** Known report section identifiers */
export const ReportSectionId = {
  COVER: 'cover',
  EXECUTIVE_SUMMARY: 'executive_summary',
  COMPASS_OVERVIEW: 'compass_overview',
  DIMENSION_DEEP_DIVES: 'dimension_deep_dives',
  SEGMENT_ANALYSIS: 'segment_analysis',
  RECOMMENDATIONS: 'recommendations',
} as const;

export type ReportSectionId =
  (typeof ReportSectionId)[keyof typeof ReportSectionId];

// ─── Domain Interfaces ───────────────────────────────────────────────────────

/** A toggleable section within a report */
export interface ReportSection {
  id: string;
  label: string;
  included: boolean;
  /** When true, the section cannot be excluded (e.g. cover page) */
  locked?: boolean;
}

/** Configuration submitted to request a report */
export interface ReportConfig {
  surveyId: string;
  format: ReportFormat;
  sections: ReportSection[];
}

/** Tracked status of a report generation job */
export interface ReportStatus {
  id: string;
  surveyId: string;
  format: ReportFormat;
  status: ReportGenerationStatus;
  /** Generation progress percentage (0-100) */
  progress: number;
  /** Signed S3 URL with 24h expiry, available when status is 'completed' */
  fileUrl: string | null;
  fileSize: number | null;
  pageCount: number | null;
  /** IDs of sections included in this report */
  sections: string[];
  createdAt: string;
  createdBy: string;
  error: string | null;
}

/** Assembled data payload sent to the report rendering service */
export interface ReportPayload {
  survey: {
    id: string;
    title: string;
    organizationName: string;
    closesAt: string;
    responseCount: number;
  };
  scores: {
    overall: number;
    dimensions: Record<string, number>;
    segments: Record<string, Record<string, number>>;
  };
  compass: {
    archetype: string;
    archetypeDescription: string;
    dimensionPercentages: Record<string, number>;
  };
  recommendations: Array<{
    dimension: string;
    severity: string;
    title: string;
    description: string;
    actions: string[];
  }>;
  branding: {
    orgLogoUrl: string | null;
    cccLogoUrl: string | null;
    colors: Record<string, string>;
  };
  sections: ReportSection[];
}

// ─── Defaults ────────────────────────────────────────────────────────────────

/** Returns the full set of report sections with sensible defaults */
export function getDefaultReportSections(): ReportSection[] {
  return [
    { id: ReportSectionId.COVER, label: 'Cover Page', included: true, locked: true },
    { id: ReportSectionId.EXECUTIVE_SUMMARY, label: 'Executive Summary', included: true },
    { id: ReportSectionId.COMPASS_OVERVIEW, label: 'Compass Overview', included: true },
    { id: ReportSectionId.DIMENSION_DEEP_DIVES, label: 'Dimension Deep Dives', included: true },
    { id: ReportSectionId.SEGMENT_ANALYSIS, label: 'Segment Analysis', included: true },
    { id: ReportSectionId.RECOMMENDATIONS, label: 'Recommendations', included: true },
  ];
}
