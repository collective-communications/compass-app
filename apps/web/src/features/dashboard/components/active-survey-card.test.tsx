import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { ActiveSurveyCard } from './active-survey-card';
import type { ActiveSurvey } from '../hooks/use-dashboard-data';

function makeSurveyData(overrides: Partial<ActiveSurvey> = {}): ActiveSurvey {
  return {
    survey: {
      id: 'survey-1',
      organizationId: 'org-1',
      title: 'Q1 2026 Culture Assessment',
      description: null,
      status: 'active',
      opensAt: '2026-01-01T00:00:00Z',
      closesAt: '2026-03-31T00:00:00Z',
      settings: null,
      scoresCalculated: false,
      scoresCalculatedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    deployment: null,
    responseCount: 42,
    expectedCount: 100,
    completionPercent: 42,
    daysRemaining: 15,
    ...overrides,
  };
}

describe('ActiveSurveyCard', () => {
  afterEach(cleanup);

  test('renders the survey title', () => {
    render(<ActiveSurveyCard data={makeSurveyData()} />);
    expect(screen.getByText('Q1 2026 Culture Assessment')).toBeTruthy();
  });

  test('renders Active badge', () => {
    render(<ActiveSurveyCard data={makeSurveyData()} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  test('displays response count as "42 / 100"', () => {
    render(<ActiveSurveyCard data={makeSurveyData()} />);
    expect(screen.getByText('42 / 100')).toBeTruthy();
  });

  test('displays completion percentage', () => {
    render(<ActiveSurveyCard data={makeSurveyData({ completionPercent: 75 })} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  test('displays days remaining', () => {
    render(<ActiveSurveyCard data={makeSurveyData({ daysRemaining: 15 })} />);
    expect(screen.getByText('15')).toBeTruthy();
  });

  test('displays "--" when daysRemaining is null', () => {
    render(<ActiveSurveyCard data={makeSurveyData({ daysRemaining: null })} />);
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  test('renders progress bar with correct aria attributes', () => {
    render(<ActiveSurveyCard data={makeSurveyData()} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('42');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
    expect(progressbar.getAttribute('aria-label')).toBe('42 of 100 responses');
  });

  test('renders close date', () => {
    render(<ActiveSurveyCard data={makeSurveyData()} />);
    // formatDate produces locale-dependent output; check the "Closes" prefix exists
    expect(screen.getByText(/^Closes /)).toBeTruthy();
  });
});
