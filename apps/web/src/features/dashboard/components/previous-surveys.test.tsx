import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PreviousSurveys } from './previous-surveys';
import type { PreviousSurvey } from '../hooks/use-dashboard-data';

function makePreviousSurvey(id: string, title: string, responseCount = 50): PreviousSurvey {
  return {
    survey: {
      id,
      organizationId: 'org-1',
      title,
      description: null,
      status: 'completed',
      opensAt: '2025-01-01T00:00:00Z',
      closesAt: '2025-06-30T00:00:00Z',
      settings: null,
      scoresCalculated: true,
      scoresCalculatedAt: '2025-07-01T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-07-01T00:00:00Z',
    },
    responseCount,
    closedAt: '2025-06-30T00:00:00Z',
  };
}

describe('PreviousSurveys', () => {
  afterEach(cleanup);

  test('renders heading', () => {
    render(<PreviousSurveys surveys={[]} onSelectSurvey={() => {}} />);
    expect(screen.getByText('Previous Surveys')).toBeTruthy();
  });

  test('renders empty state with no survey items', () => {
    const { container } = render(<PreviousSurveys surveys={[]} onSelectSurvey={() => {}} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  test('renders a list of surveys with titles', () => {
    const surveys = [
      makePreviousSurvey('s-1', 'H1 2025 Assessment'),
      makePreviousSurvey('s-2', 'H2 2024 Assessment'),
    ];
    render(<PreviousSurveys surveys={surveys} onSelectSurvey={() => {}} />);
    expect(screen.getByText('H1 2025 Assessment')).toBeTruthy();
    expect(screen.getByText('H2 2024 Assessment')).toBeTruthy();
  });

  test('renders Complete badge for each survey', () => {
    const surveys = [makePreviousSurvey('s-1', 'Test Survey')];
    render(<PreviousSurveys surveys={surveys} onSelectSurvey={() => {}} />);
    expect(screen.getByText('Complete')).toBeTruthy();
  });

  test('displays response count text', () => {
    const surveys = [makePreviousSurvey('s-1', 'Test Survey', 73)];
    render(<PreviousSurveys surveys={surveys} onSelectSurvey={() => {}} />);
    expect(screen.getByText(/73 responses/)).toBeTruthy();
  });

  test('clicking a survey calls onSelectSurvey with the correct ID', () => {
    const onSelect = mock(() => {});
    const surveys = [
      makePreviousSurvey('s-1', 'First Survey'),
      makePreviousSurvey('s-2', 'Second Survey'),
    ];
    render(<PreviousSurveys surveys={surveys} onSelectSurvey={onSelect} />);

    fireEvent.click(screen.getByText('Second Survey'));
    expect(onSelect).toHaveBeenCalledWith('s-2');
  });

  test('clicking first survey calls onSelectSurvey with first ID', () => {
    const onSelect = mock(() => {});
    const surveys = [
      makePreviousSurvey('s-1', 'First Survey'),
      makePreviousSurvey('s-2', 'Second Survey'),
    ];
    render(<PreviousSurveys surveys={surveys} onSelectSurvey={onSelect} />);

    fireEvent.click(screen.getByText('First Survey'));
    expect(onSelect).toHaveBeenCalledWith('s-1');
  });
});
