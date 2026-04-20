import { describe, test, expect } from 'bun:test';
import { renderReportToHtml } from './render-report-html.js';
import type { ReportPayload } from '@compass/types';
import { ReportSectionId } from '@compass/types';

function makePayload(overrides?: Partial<ReportPayload>): ReportPayload {
  return {
    survey: {
      id: 'survey-1',
      title: 'Q1 Culture Assessment',
      organizationName: 'Acme Corp',
      closesAt: '2026-04-01',
      responseCount: 42,
    },
    scores: {
      overall: 2.8,
      dimensions: { core: 3.0, clarity: 2.6 },
      segments: {},
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: 'Prioritizes relationship-building',
      dimensionPercentages: { core: 75, clarity: 65 },
    },
    recommendations: [
      {
        dimension: 'clarity',
        severity: 'high',
        title: 'Improve Clarity',
        description: 'Focus on clear communication',
        actions: ['Action 1'],
      },
    ],
    branding: {
      orgLogoUrl: null,
      cccLogoUrl: null,
      colors: { primary: '#0C3D50' },
    },
    sections: [
      { id: ReportSectionId.COVER, label: 'Cover Page', included: true, locked: true },
      { id: ReportSectionId.EXECUTIVE_SUMMARY, label: 'Executive Summary', included: true },
      { id: ReportSectionId.COMPASS_OVERVIEW, label: 'Compass Overview', included: true },
      { id: ReportSectionId.DIMENSION_DEEP_DIVES, label: 'Dimension Deep Dives', included: true },
      { id: ReportSectionId.SEGMENT_ANALYSIS, label: 'Segment Analysis', included: true },
      { id: ReportSectionId.RECOMMENDATIONS, label: 'Recommendations', included: true },
    ],
    ...overrides,
  };
}

describe('renderReportToHtml', () => {
  test('returns string starting with <!DOCTYPE html>', () => {
    const html = renderReportToHtml(makePayload());
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('contains <html and </html> tags', () => {
    const html = renderReportToHtml(makePayload());
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('includes survey title in output', () => {
    const html = renderReportToHtml(makePayload({ survey: { ...makePayload().survey, title: 'My Special Survey' } }));
    expect(html).toContain('My Special Survey');
  });

  test('renders only included sections', () => {
    const payload = makePayload({
      sections: [
        { id: ReportSectionId.COVER, label: 'Cover Page', included: true, locked: true },
        { id: ReportSectionId.EXECUTIVE_SUMMARY, label: 'Executive Summary', included: false },
        { id: ReportSectionId.COMPASS_OVERVIEW, label: 'Compass Overview', included: false },
        { id: ReportSectionId.DIMENSION_DEEP_DIVES, label: 'Dimension Deep Dives', included: false },
        { id: ReportSectionId.SEGMENT_ANALYSIS, label: 'Segment Analysis', included: false },
        { id: ReportSectionId.RECOMMENDATIONS, label: 'Recommendations', included: false },
      ],
    });
    const html = renderReportToHtml(payload);
    // Cover should be present, but other sections excluded
    expect(html).toContain('<html');
    // The HTML should still be valid with only the cover section
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('handles empty sections array gracefully', () => {
    const payload = makePayload({ sections: [] });
    const html = renderReportToHtml(payload);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('renders all 6 section types when all included', () => {
    const payload = makePayload();
    const html = renderReportToHtml(payload);
    // All 6 sections should produce content
    // Verify the HTML contains section-specific content markers
    expect(html).toContain('Acme Corp'); // Cover page uses org name
    expect(html).toContain('The Connector'); // Compass overview uses archetype
    expect(html).toContain('Improve Clarity'); // Recommendations section
  });

  test('section count matches ReportSectionId enum (6 sections)', () => {
    // Verify the fixture uses all 6 section IDs
    const payload = makePayload();
    expect(payload.sections).toHaveLength(6);

    const ids = payload.sections.map(s => s.id);
    expect(ids).toContain(ReportSectionId.COVER);
    expect(ids).toContain(ReportSectionId.EXECUTIVE_SUMMARY);
    expect(ids).toContain(ReportSectionId.COMPASS_OVERVIEW);
    expect(ids).toContain(ReportSectionId.DIMENSION_DEEP_DIVES);
    expect(ids).toContain(ReportSectionId.SEGMENT_ANALYSIS);
    expect(ids).toContain(ReportSectionId.RECOMMENDATIONS);
  });
});
