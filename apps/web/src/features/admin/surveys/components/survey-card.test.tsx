import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SurveyCard } from './survey-card';
import type { SurveyListItem } from '../services/admin-survey-service';
import type { SurveyStatus } from '@compass/types';

function makeSurvey(overrides: Partial<SurveyListItem> = {}): SurveyListItem {
  return {
    id: 'survey-1',
    organizationId: 'org-1',
    title: 'Q1 Culture Assessment',
    description: null,
    status: 'active' as SurveyStatus,
    opensAt: null,
    closesAt: null,
    settings: null,
    scoresCalculated: false,
    scoresCalculatedAt: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    createdBy: 'user-1',
    responseCount: 42,
    completionPercent: 68,
    ...overrides,
  };
}

describe('SurveyCard', () => {
  afterEach(cleanup);

  test('renders survey title', () => {
    render(<SurveyCard survey={makeSurvey()} onClick={() => {}} />);
    expect(screen.getByText('Q1 Culture Assessment')).toBeTruthy();
  });

  test('renders status badge', () => {
    render(<SurveyCard survey={makeSurvey({ status: 'draft' as SurveyStatus })} onClick={() => {}} />);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  test('renders response count', () => {
    render(<SurveyCard survey={makeSurvey({ responseCount: 42 })} onClick={() => {}} />);
    expect(screen.getByText('42 responses')).toBeTruthy();
  });

  test('renders completion percentage when > 0', () => {
    render(<SurveyCard survey={makeSurvey({ completionPercent: 68 })} onClick={() => {}} />);
    expect(screen.getByText('68% complete')).toBeTruthy();
  });

  test('does not render completion percentage when 0', () => {
    render(<SurveyCard survey={makeSurvey({ completionPercent: 0 })} onClick={() => {}} />);
    expect(screen.queryByText(/complete/)).toBeNull();
  });

  test('renders description when present', () => {
    render(
      <SurveyCard
        survey={makeSurvey({ description: 'Annual culture survey' })}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Annual culture survey')).toBeTruthy();
  });

  test('calls onClick with survey id when clicked', () => {
    const onClick = mock(() => {});
    render(<SurveyCard survey={makeSurvey({ id: 'survey-99' })} onClick={onClick} />);
    fireEvent.click(screen.getByText('Q1 Culture Assessment'));
    expect(onClick).toHaveBeenCalledWith('survey-99');
  });

  test('renders all status badge variants', () => {
    const statuses: Array<{ status: SurveyStatus; label: string }> = [
      { status: 'active' as SurveyStatus, label: 'Active' },
      { status: 'draft' as SurveyStatus, label: 'Draft' },
      { status: 'paused' as SurveyStatus, label: 'Paused' },
      { status: 'closed' as SurveyStatus, label: 'Closed' },
      { status: 'archived' as SurveyStatus, label: 'Archived' },
    ];

    for (const { status, label } of statuses) {
      const { unmount } = render(
        <SurveyCard survey={makeSurvey({ status })} onClick={() => {}} />,
      );
      expect(screen.getByText(label)).toBeTruthy();
      unmount();
    }
  });

  test('renders days remaining for future close date', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <SurveyCard survey={makeSurvey({ closesAt: futureDate })} onClick={() => {}} />,
    );
    expect(screen.getByText(/remaining/)).toBeTruthy();
  });

  test('renders Expired for past close date', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    render(
      <SurveyCard survey={makeSurvey({ closesAt: pastDate })} onClick={() => {}} />,
    );
    expect(screen.getByText('Expired')).toBeTruthy();
  });

  test('does not render days remaining when closesAt is null', () => {
    render(<SurveyCard survey={makeSurvey({ closesAt: null })} onClick={() => {}} />);
    expect(screen.queryByText(/remaining/)).toBeNull();
    expect(screen.queryByText('Expired')).toBeNull();
  });
});
