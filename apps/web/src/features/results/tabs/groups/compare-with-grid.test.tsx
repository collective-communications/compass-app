import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CompareWithGrid } from './compare-with-grid';

afterEach(cleanup);

const defaultProps = {
  segmentValues: ['Engineering', 'Marketing', 'Operations', 'Sales', 'Executives', 'Remote'],
  currentValue: 'Engineering',
  belowThresholdValues: new Set(['Executives']),
  onSelect: () => {},
};

describe('CompareWithGrid', () => {
  test('renders "Compare With" heading', () => {
    render(<CompareWithGrid {...defaultProps} />);
    expect(screen.getByText('Compare With')).toBeDefined();
  });

  test('renders all segment values as buttons', () => {
    render(<CompareWithGrid {...defaultProps} />);

    for (const value of defaultProps.segmentValues) {
      expect(screen.getByText(value)).toBeDefined();
    }
  });

  test('current value has active styling with aria-pressed', () => {
    render(<CompareWithGrid {...defaultProps} />);

    const activeButton = screen.getByRole('button', { pressed: true });
    expect(activeButton.textContent).toContain('Engineering');
  });

  test('below-threshold values show lock icon via aria-label', () => {
    render(<CompareWithGrid {...defaultProps} />);

    const lockedButton = screen.getByLabelText(/Below anonymity threshold/);
    expect(lockedButton).toBeDefined();
    expect(lockedButton.textContent).toContain('Executives');
  });

  test('click fires onSelect with correct value', () => {
    const values: string[] = [];
    const onSelect = (v: string): void => {
      values.push(v);
    };

    render(<CompareWithGrid {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Marketing'));
    expect(values).toEqual(['Marketing']);
  });

  test('click on below-threshold value still fires onSelect', () => {
    const values: string[] = [];
    const onSelect = (v: string): void => {
      values.push(v);
    };

    render(<CompareWithGrid {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Executives'));
    expect(values).toEqual(['Executives']);
  });
});
