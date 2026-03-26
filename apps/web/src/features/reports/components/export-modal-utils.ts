/**
 * Utility functions and constants for the export modal.
 */

import { ReportFormat, type ReportSection } from '@compass/types';

export type ModalState = 'configure' | 'generating' | 'complete';

export const GENERATION_STEPS = [
  { threshold: 0, label: 'Queued' },
  { threshold: 20, label: 'Assembling data' },
  { threshold: 50, label: 'Rendering report' },
  { threshold: 80, label: 'Finalizing' },
  { threshold: 100, label: 'Complete' },
] as const;

export function getCurrentStep(progress: number): number {
  let step = 0;
  for (let i = GENERATION_STEPS.length - 1; i >= 0; i--) {
    if (progress >= GENERATION_STEPS[i]!.threshold) {
      step = i;
      break;
    }
  }
  return step;
}

export const FORMAT_DESCRIPTIONS: Record<string, string> = {
  [ReportFormat.PDF]: 'Best for printing and sharing',
  [ReportFormat.DOCX]: 'Best for editing and collaboration',
  [ReportFormat.PPTX]: 'Best for presentations',
};

/** Approximate page counts per section for the estimated page count display */
export const SECTION_PAGE_ESTIMATES: Record<string, number> = {
  cover: 1,
  executive_summary: 2,
  compass_overview: 2,
  dimension_deep_dives: 6,
  segment_analysis: 4,
  recommendations: 3,
};

export function estimatePageCount(sections: ReportSection[]): number {
  return sections
    .filter((s) => s.included)
    .reduce((total, s) => total + (SECTION_PAGE_ESTIMATES[s.id] ?? 1), 0);
}

/** Format bytes into a readable file size string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Build a filename from format and survey name */
export function buildFilename(format: ReportFormat, surveyName?: string): string {
  const base = surveyName ? surveyName.replace(/\s+/g, '-').toLowerCase() : 'report';
  return `${base}-report.${format}`;
}
