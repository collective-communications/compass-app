import { describe, expect, test } from 'bun:test';
import { renderReportHtml } from './render-html.ts';
import type { ReportPayload } from './assemble.ts';
import type { ReportRow } from './db.ts';

const REPORT: ReportRow = {
  id: 'report-1',
  survey_id: 'survey-1',
  organization_id: 'org-1',
  title: 'Culture Compass Report',
  format: 'pdf',
  status: 'queued',
  storage_path: null,
  sections: ['cover'],
  client_visible: true,
  triggered_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const PAYLOAD: ReportPayload = {
  survey: {
    id: 'survey-1',
    title: 'Q1 Culture Pulse',
    organizationName: 'Acme Corp',
    closesAt: '2026-03-31',
    responseCount: 25,
  },
  scores: {
    overall: 3.2,
    dimensions: {},
    segments: {},
  },
  compass: {
    archetype: 'The Connector',
    archetypeDescription: '',
    dimensionPercentages: {},
  },
  recommendations: [],
  branding: {
    orgLogoUrl: null,
    cccLogoUrl: null,
    colors: {},
  },
  sections: [
    { id: 'cover', label: 'Cover Page', included: true },
    { id: 'executive_summary', label: 'Executive Summary', included: false },
    { id: 'compass_overview', label: 'Compass Overview', included: false },
    { id: 'dimension_deep_dives', label: 'Dimension Deep Dives', included: false },
    { id: 'segment_analysis', label: 'Segment Analysis', included: false },
    { id: 'recommendations', label: 'Recommendations', included: false },
  ],
};

describe('renderReportHtml', () => {
  test('omits sections marked as excluded', () => {
    const html = renderReportHtml(PAYLOAD, REPORT);

    expect(html).toContain('Culture Compass Report');
    expect(html).not.toContain('Executive Summary');
    expect(html).not.toContain('Compass Overview');
    expect(html).not.toContain('Recommendations');
  });
});
