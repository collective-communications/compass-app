import { afterEach, describe, expect, test, mock, beforeEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * Tests for DashboardPage — client access gating logic.
 *
 * The "View Full Results" button in the Latest Results card should only
 * appear when BOTH:
 *   1. activeSurvey.survey.scoresCalculated === true
 *   2. useClientAccess returns true (CC+C has enabled results for this org)
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

mock.module('../../../hooks/use-app-navigate', () => ({
  useAppNavigate: () => () => {},
}));

/** AppShell pass-through — just render children */
mock.module('../../../components/shells/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/** Default mock user */
const defaultUser = {
  id: 'user-1',
  email: 'client@example.com',
  fullName: 'Jane Doe',
  organizationId: 'org-1',
  role: 'client_admin',
};

let mockUser: typeof defaultUser | null = defaultUser;

mock.module('../../../stores/auth-store', () => ({
  useAuthStore: (selector: (state: { user: typeof defaultUser | null }) => unknown) =>
    selector({ user: mockUser }),
}));

/** Dashboard data mock state */
interface MockDashboardData {
  activeSurvey: {
    survey: {
      id: string;
      scoresCalculated: boolean;
      title: string;
      status: string;
    };
    deployment: { token: string } | null;
    responseCount: number;
    expectedCount: number;
    completionPercent: number;
    daysRemaining: number | null;
  } | null;
  previousSurveys: unknown[];
  isLoading: boolean;
  error: Error | null;
}

let mockDashboardData: MockDashboardData = {
  activeSurvey: null,
  previousSurveys: [],
  isLoading: false,
  error: null,
};

mock.module('../hooks/use-dashboard-data', () => ({
  useDashboardData: () => mockDashboardData,
}));

let mockClientAccess = false;

mock.module('../hooks/use-client-access', () => ({
  useClientAccess: () => mockClientAccess,
}));

/** Stub child components to isolate the page logic */
mock.module('../components/active-survey-card', () => ({
  ActiveSurveyCard: () => <div data-testid="active-survey-card" />,
}));

mock.module('../components/previous-surveys', () => ({
  PreviousSurveys: () => <div data-testid="previous-surveys" />,
}));

const { DashboardPage } = await import('./dashboard-page.js');

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeActiveSurvey(overrides?: { scoresCalculated?: boolean }) {
  return {
    survey: {
      id: 'survey-1',
      title: 'Q1 Culture Assessment',
      status: 'active',
      scoresCalculated: overrides?.scoresCalculated ?? false,
    },
    deployment: { token: 'abc123' },
    responseCount: 25,
    expectedCount: 50,
    completionPercent: 50,
    daysRemaining: 7,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DashboardPage — client access gating', () => {
  beforeEach(() => {
    mockUser = defaultUser;
    mockClientAccess = false;
    mockDashboardData = {
      activeSurvey: null,
      previousSurveys: [],
      isLoading: false,
      error: null,
    };
  });

  afterEach(cleanup);

  test('shows View Full Results when scores calculated AND client access enabled', () => {
    mockDashboardData = {
      activeSurvey: makeActiveSurvey({ scoresCalculated: true }),
      previousSurveys: [],
      isLoading: false,
      error: null,
    };
    mockClientAccess = true;

    render(<DashboardPage />);

    expect(screen.getByText('View Full Results')).toBeTruthy();
  });

  test('hides View Full Results when scores calculated but client access disabled', () => {
    mockDashboardData = {
      activeSurvey: makeActiveSurvey({ scoresCalculated: true }),
      previousSurveys: [],
      isLoading: false,
      error: null,
    };
    mockClientAccess = false;

    render(<DashboardPage />);

    expect(screen.queryByText('View Full Results')).toBeNull();
  });

  test('hides View Full Results when scores not calculated (regardless of client access)', () => {
    mockDashboardData = {
      activeSurvey: makeActiveSurvey({ scoresCalculated: false }),
      previousSurveys: [],
      isLoading: false,
      error: null,
    };
    mockClientAccess = true;

    render(<DashboardPage />);

    expect(screen.queryByText('View Full Results')).toBeNull();
  });

  test('displays welcome greeting with first name', () => {
    mockDashboardData = {
      activeSurvey: makeActiveSurvey(),
      previousSurveys: [],
      isLoading: false,
      error: null,
    };

    render(<DashboardPage />);

    expect(screen.getByText('Welcome back, Jane')).toBeTruthy();
  });

  test('shows loading state', () => {
    mockDashboardData = {
      activeSurvey: null,
      previousSurveys: [],
      isLoading: true,
      error: null,
    };

    render(<DashboardPage />);

    expect(screen.getByText('Loading dashboard...')).toBeTruthy();
  });
});
