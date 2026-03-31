import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QuickActions } from './quick-actions';

afterEach(cleanup);

const defaultProps = {
  segmentValue: 'Engineering',
  segmentType: 'department' as const,
  segmentValues: ['Administration', 'Engineering', 'Marketing', 'Sales'],
  onCompare: () => {},
  onViewByType: () => {},
  onExportReport: () => {},
};

describe('QuickActions', () => {
  test('renders 3 buttons when multiple segment values available', () => {
    render(<QuickActions {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  test('compare button shows next segment name in alphabetical order', () => {
    render(<QuickActions {...defaultProps} />);
    // Alphabetical order: Administration, Engineering, Marketing, Sales
    // Current is Engineering, next is Marketing
    expect(screen.getByText(/Compare to Marketing/)).toBeTruthy();
  });

  test('view by button shows next segment type label', () => {
    render(<QuickActions {...defaultProps} />);
    // Current type is department, next in cycle is role
    expect(screen.getByText(/View by role/)).toBeTruthy();
  });

  test('export button renders "Export report"', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText(/Export report/)).toBeTruthy();
  });

  test('click compare fires onCompare with correct value', () => {
    let compared: string | undefined;
    render(
      <QuickActions
        {...defaultProps}
        onCompare={(value) => { compared = value; }}
      />,
    );
    fireEvent.click(screen.getByText(/Compare to Marketing/));
    expect(compared).toBe('Marketing');
  });

  test('click view-by fires onViewByType with next type', () => {
    let viewedType: string | undefined;
    render(
      <QuickActions
        {...defaultProps}
        onViewByType={(type) => { viewedType = type; }}
      />,
    );
    fireEvent.click(screen.getByText(/View by role/));
    expect(viewedType).toBe('role');
  });

  test('click export fires onExportReport', () => {
    let exported = false;
    render(
      <QuickActions
        {...defaultProps}
        onExportReport={() => { exported = true; }}
      />,
    );
    fireEvent.click(screen.getByText(/Export report/));
    expect(exported).toBe(true);
  });

  test('hides compare button when only 1 segment value', () => {
    render(
      <QuickActions
        {...defaultProps}
        segmentValues={['Engineering']}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
    // No compare button should exist
    expect(screen.queryByText(/Compare to/)).toBeNull();
  });
});
