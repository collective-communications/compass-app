/**
 * Server-side HTML rendering for PDF report generation.
 * Takes a ReportPayload and renders all included sections to a complete
 * HTML document using react-dom/server's renderToStaticMarkup.
 *
 * Output is a self-contained HTML string (DOCTYPE + full document)
 * ready for headless Chromium PDF capture.
 */

import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReportPayload } from '@compass/types';
import { ReportSectionId } from '@compass/types';
import { ReportLayout } from '../templates/report-layout';
import { ReportCover } from '../templates/report-cover';
import { ExecutiveSummary } from '../templates/executive-summary';
import { CompassOverview } from '../templates/compass-overview';
import { DimensionDeepDive } from '../templates/dimension-deep-dive';
import { SegmentAnalysis } from '../templates/segment-analysis';
import { RecommendationsSection } from '../templates/recommendations-section';

type SectionRenderer = (payload: ReportPayload) => ReactElement;

/** Maps section IDs to their template component constructors. */
const SECTION_RENDERERS: Record<string, SectionRenderer> = {
  [ReportSectionId.COVER]: (payload) =>
    createElement(ReportCover, { key: 'cover', payload }),
  [ReportSectionId.EXECUTIVE_SUMMARY]: (payload) =>
    createElement(ExecutiveSummary, { key: 'executive-summary', payload }),
  [ReportSectionId.COMPASS_OVERVIEW]: (payload) =>
    createElement(CompassOverview, { key: 'compass-overview', payload }),
  [ReportSectionId.DIMENSION_DEEP_DIVES]: (payload) =>
    createElement(DimensionDeepDive, { key: 'dimension-deep-dives', payload }),
  [ReportSectionId.SEGMENT_ANALYSIS]: (payload) =>
    createElement(SegmentAnalysis, { key: 'segment-analysis', payload }),
  [ReportSectionId.RECOMMENDATIONS]: (payload) =>
    createElement(RecommendationsSection, { key: 'recommendations', payload }),
};

/**
 * Renders a ReportPayload to a complete HTML document string.
 * Only sections marked as `included` in the payload are rendered.
 */
export function renderReportToHtml(payload: ReportPayload): string {
  const children: ReactElement[] = [];

  for (const section of payload.sections) {
    if (!section.included) continue;

    const renderer = SECTION_RENDERERS[section.id];
    if (renderer) {
      children.push(renderer(payload));
    }
  }

  const html = renderToStaticMarkup(
    createElement(ReportLayout, { payload, children }),
  );

  return `<!DOCTYPE html>${html}`;
}
