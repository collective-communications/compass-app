import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ClientCard } from './client-card';
import type { OrganizationSummary } from '@compass/types';

function makeOrg(overrides: Partial<OrganizationSummary> = {}): OrganizationSummary {
  return {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    industry: 'Technology',
    employeeCount: 250,
    logoUrl: null,
    primaryContactName: null,
    primaryContactEmail: null,
    createdAt: '2025-01-01T00:00:00Z',
    totalSurveys: 3,
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

describe('ClientCard', () => {
  afterEach(cleanup);

  test('renders organization name', () => {
    render(<ClientCard organization={makeOrg()} onClick={() => {}} />);
    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });

  test('renders industry and employee count', () => {
    render(<ClientCard organization={makeOrg()} onClick={() => {}} />);
    expect(screen.getByText('Technology')).toBeTruthy();
    expect(screen.getByText('250 employees')).toBeTruthy();
  });

  test('renders survey count with correct pluralization', () => {
    render(<ClientCard organization={makeOrg({ totalSurveys: 3 })} onClick={() => {}} />);
    expect(screen.getByText('3 surveys')).toBeTruthy();
  });

  test('renders singular survey label for count of 1', () => {
    render(<ClientCard organization={makeOrg({ totalSurveys: 1 })} onClick={() => {}} />);
    expect(screen.getByText('1 survey')).toBeTruthy();
  });

  test('calls onClick with org id when clicked', () => {
    const onClick = mock(() => {});
    render(<ClientCard organization={makeOrg({ id: 'org-42' })} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('org-42');
  });

  test('renders aria-label with org name', () => {
    render(<ClientCard organization={makeOrg({ name: 'TestOrg' })} onClick={() => {}} />);
    expect(screen.getByLabelText('View TestOrg')).toBeTruthy();
  });

  test('shows Active Survey badge when activeSurveyId is set', () => {
    render(
      <ClientCard
        organization={makeOrg({ activeSurveyId: 'survey-1' })}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Active Survey')).toBeTruthy();
  });

  test('does not show Active Survey badge when no active survey', () => {
    render(<ClientCard organization={makeOrg()} onClick={() => {}} />);
    expect(screen.queryByText('Active Survey')).toBeNull();
  });

  test('renders initials when no logoUrl', () => {
    const { container } = render(
      <ClientCard organization={makeOrg({ name: 'Acme Corp', logoUrl: null })} onClick={() => {}} />,
    );
    expect(container.textContent).toContain('AC');
  });

  test('renders logo image when logoUrl is provided', () => {
    render(
      <ClientCard
        organization={makeOrg({ logoUrl: 'https://example.com/logo.png' })}
        onClick={() => {}}
      />,
    );
    const img = screen.getByAltText('Acme Corp logo');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/logo.png');
  });

  test('renders last score when present', () => {
    render(
      <ClientCard organization={makeOrg({ lastScore: 3.7 })} onClick={() => {}} />,
    );
    expect(screen.getByText(/Score: 3\.7/)).toBeTruthy();
  });

  test('renders assigned consultant when present', () => {
    render(
      <ClientCard
        organization={makeOrg({ assignedConsultant: 'Jane Doe' })}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Consultant: Jane Doe')).toBeTruthy();
  });

  test('renders trend arrow for upward trend', () => {
    render(
      <ClientCard
        organization={makeOrg({ lastScore: 3.5, scoreTrend: 'up' })}
        onClick={() => {}}
      />,
    );
    expect(screen.getByLabelText('Score trending up')).toBeTruthy();
  });

  test('applies green border for healthy active survey', () => {
    const { container } = render(
      <ClientCard
        organization={makeOrg({
          activeSurveyId: 'survey-1',
          daysRemaining: 10,
          completionRate: 50,
        })}
        onClick={() => {}}
      />,
    );
    expect(container.innerHTML).toContain('border-l-[#2E7D32]');
  });

  test('applies orange border when days remaining <= 3', () => {
    const { container } = render(
      <ClientCard
        organization={makeOrg({
          activeSurveyId: 'survey-1',
          daysRemaining: 2,
          completionRate: 50,
        })}
        onClick={() => {}}
      />,
    );
    expect(container.innerHTML).toContain('border-l-[#E65100]');
  });
});
