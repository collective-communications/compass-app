import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { KeyMetricsCard } from './key-metrics-card';
import type { OrganizationSummary } from '@compass/types';

function makeOrg(overrides: Partial<OrganizationSummary> = {}): OrganizationSummary {
  return {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    industry: null,
    employeeCount: null,
    logoUrl: null,
    primaryContactName: null,
    primaryContactEmail: null,
    createdAt: '2025-01-01T00:00:00Z',
    totalSurveys: 5,
    activeSurveyId: null,
    activeSurveyTitle: null,
    responseCount: null,
    completionRate: null,
    daysRemaining: null,
    lastScore: null,
    scoreTrend: null,
    assignedConsultant: null,
    ...overrides,
  };
}

describe('KeyMetricsCard', () => {
  afterEach(cleanup);

  test('renders Key Metrics heading', () => {
    render(<KeyMetricsCard organization={makeOrg()} />);
    expect(screen.getByText('Key Metrics')).toBeTruthy();
  });

  test('renders total surveys count', () => {
    render(<KeyMetricsCard organization={makeOrg({ totalSurveys: 5 })} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Total Surveys')).toBeTruthy();
  });

  test('renders singular Total Survey for count of 1', () => {
    render(<KeyMetricsCard organization={makeOrg({ totalSurveys: 1 })} />);
    expect(screen.getByText('Total Survey')).toBeTruthy();
  });

  test('renders culture score when present', () => {
    render(<KeyMetricsCard organization={makeOrg({ lastScore: 3.2 })} />);
    expect(screen.getByText(/3\.2/)).toBeTruthy();
    expect(screen.getByText('Culture Score')).toBeTruthy();
  });

  test('renders dash when no culture score', () => {
    render(<KeyMetricsCard organization={makeOrg({ lastScore: null })} />);
    expect(screen.getByText('Culture Score')).toBeTruthy();
    // Two em dashes: one for score, one for active survey status
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  test('renders Active when active survey exists', () => {
    render(
      <KeyMetricsCard
        organization={makeOrg({
          activeSurveyId: 'survey-1',
          activeSurveyTitle: 'Q1 Assessment',
        })}
      />,
    );
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Q1 Assessment')).toBeTruthy();
  });

  test('renders No Active Survey when none active', () => {
    render(<KeyMetricsCard organization={makeOrg()} />);
    expect(screen.getByText('No Active Survey')).toBeTruthy();
  });

  test('renders trend up arrow when score trending up', () => {
    render(
      <KeyMetricsCard
        organization={makeOrg({ lastScore: 3.5, scoreTrend: 'up' })}
      />,
    );
    expect(screen.getByLabelText('Score trending up')).toBeTruthy();
  });

  test('renders trend down arrow when score trending down', () => {
    render(
      <KeyMetricsCard
        organization={makeOrg({ lastScore: 2.8, scoreTrend: 'down' })}
      />,
    );
    expect(screen.getByLabelText('Score trending down')).toBeTruthy();
  });

  test('renders stable indicator when score is stable', () => {
    render(
      <KeyMetricsCard
        organization={makeOrg({ lastScore: 3.0, scoreTrend: 'stable' })}
      />,
    );
    expect(screen.getByLabelText('Score stable')).toBeTruthy();
  });

  test('does not render trend when no score', () => {
    render(<KeyMetricsCard organization={makeOrg({ lastScore: null, scoreTrend: null })} />);
    expect(screen.queryByLabelText(/Score trending/)).toBeNull();
    expect(screen.queryByLabelText('Score stable')).toBeNull();
  });
});
