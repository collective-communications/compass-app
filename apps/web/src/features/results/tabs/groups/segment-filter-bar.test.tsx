import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SegmentFilterBar } from './segment-filter-bar';

afterEach(cleanup);

const defaultProps = {
  segmentType: 'department' as const,
  segmentValue: 'all',
  segmentValues: ['Engineering', 'Marketing', 'Sales'],
  belowThresholdValues: new Set(['Sales']),
  onTypeChange: () => {},
  onValueChange: () => {},
};

describe('SegmentFilterBar', () => {
  test('renders select with current type selected', () => {
    render(<SegmentFilterBar {...defaultProps} />);
    const select = screen.getByLabelText('Segment type') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('department');
  });

  test('all 4 segment type options are present', () => {
    render(<SegmentFilterBar {...defaultProps} />);
    const select = screen.getByLabelText('Segment type') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options).toEqual(['Department', 'Role', 'Location', 'Tenure']);
  });

  test('changing select triggers onTypeChange', () => {
    let changed: string | undefined;
    render(
      <SegmentFilterBar
        {...defaultProps}
        onTypeChange={(type) => { changed = type; }}
      />,
    );
    const select = screen.getByLabelText('Segment type');
    fireEvent.change(select, { target: { value: 'role' } });
    expect(changed).toBe('role');
  });

  test('FILTER BY label renders', () => {
    render(<SegmentFilterBar {...defaultProps} />);
    expect(screen.getByText(/filter by/i)).toBeTruthy();
  });

  test('confidentiality text renders', () => {
    render(<SegmentFilterBar {...defaultProps} />);
    expect(screen.getByText(/confidentiality/i)).toBeTruthy();
  });

  test('segment value pills render with All pill', () => {
    render(<SegmentFilterBar {...defaultProps} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Engineering')).toBeTruthy();
    expect(screen.getByText('Marketing')).toBeTruthy();
    expect(screen.getByText('Sales')).toBeTruthy();
  });

  test('below-threshold values show lock icon in aria-label', () => {
    render(<SegmentFilterBar {...defaultProps} />);
    const salesButton = screen.getByRole('radio', {
      name: /Sales — Below anonymity threshold/,
    });
    expect(salesButton).toBeTruthy();
  });

  test('All pill has active state when segmentValue is all', () => {
    render(<SegmentFilterBar {...defaultProps} segmentValue="all" />);
    const allButton = screen.getByRole('radio', { name: 'All' });
    expect(allButton.getAttribute('aria-checked')).toBe('true');
  });

  test('All pill is inactive when a specific segment is selected', () => {
    render(<SegmentFilterBar {...defaultProps} segmentValue="Engineering" />);
    const allButton = screen.getByRole('radio', { name: 'All' });
    expect(allButton.getAttribute('aria-checked')).toBe('false');

    const engButton = screen.getByRole('radio', { name: 'Engineering' });
    expect(engButton.getAttribute('aria-checked')).toBe('true');
  });
});
