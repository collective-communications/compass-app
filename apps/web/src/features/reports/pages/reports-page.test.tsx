import { afterEach, describe, test, expect, mock } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * Tests for ReportsPage — Wave 1.8's empty-state gating.
 *
 * The "No surveys available" banner must only render when:
 *   - `surveys` has no active entries AND
 *   - `initialSurveyId` is null (no URL pin).
 * When the URL pins a survey, reports for that survey render below even if
 * the active-surveys list is empty, so the banner would be misleading.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

// Stub useReports so we don't need to mock the report-api service layer.
mock.module('../hooks/use-reports', () => ({
  useReports: () => ({
    reports: [],
    isLoading: false,
    error: null,
    refresh: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    selectedReport: null,
    selectReport: () => {},
  }),
}));

// The ExportModal renders a Dialog with side effects we don't need here.
mock.module('../components/export-modal', () => ({
  ExportModal: (): null => null,
}));

const { ReportsPage } = await import('./reports-page.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ReportsPage — empty-state gating', () => {
  afterEach(cleanup);

  test('empty surveys + no initialSurveyId → banner visible', () => {
    render(
      <ReportsPage
        userRole="client_exec"
        surveys={[]}
        initialSurveyId={null}
      />,
    );
    expect(screen.getByText('No surveys available')).toBeTruthy();
  });

  test('empty surveys + initialSurveyId present → banner HIDDEN (URL pin case)', () => {
    render(
      <ReportsPage
        userRole="client_exec"
        surveys={[]}
        initialSurveyId="survey-xyz"
      />,
    );
    expect(screen.queryByText('No surveys available')).toBeNull();
  });

  test('one active survey + matching initialSurveyId → selector shown, banner hidden', () => {
    render(
      <ReportsPage
        userRole="client_exec"
        surveys={[{ id: 'survey-active', title: 'Q1 Pulse', status: 'active' }]}
        initialSurveyId="survey-active"
      />,
    );
    expect(screen.queryByText('No surveys available')).toBeNull();
    // Selector lands in the DOM with an accessible label.
    const selector = screen.getByLabelText('Select a survey to view reports') as HTMLSelectElement;
    expect(selector).toBeTruthy();
    expect(selector.value).toBe('survey-active');
  });

  test('closed-only surveys + matching initialSurveyId → banner hidden, Previous Surveys rendered', () => {
    // Provide a report so the "Previous Surveys" grouping renders below.
    mock.module('../hooks/use-reports', () => ({
      useReports: () => ({
        reports: [
          {
            id: 'r-1',
            surveyId: 'survey-closed',
            format: 'pdf',
            status: 'completed',
            progress: 100,
            fileUrl: null,
            fileSize: 1234,
            pageCount: 12,
            sections: [],
            createdAt: '2026-01-01T00:00:00Z',
            createdBy: 'user-1',
            error: null,
            storagePath: 'reports/r-1.pdf',
          },
        ],
        isLoading: false,
        error: null,
        refresh: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        selectedReport: null,
        selectReport: () => {},
      }),
    }));

    render(
      <ReportsPage
        userRole="client_exec"
        surveys={[{ id: 'survey-closed', title: 'Q4 2025', status: 'closed' }]}
        initialSurveyId="survey-closed"
      />,
    );

    expect(screen.queryByText('No surveys available')).toBeNull();
    expect(screen.getByText('Previous Surveys')).toBeTruthy();
  });
});
