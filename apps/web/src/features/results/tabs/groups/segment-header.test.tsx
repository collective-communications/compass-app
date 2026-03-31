import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { SegmentHeader } from './segment-header';

afterEach(cleanup);

describe('SegmentHeader', () => {
  test('renders segment value and capitalized type as heading', () => {
    render(
      <SegmentHeader segmentValue="Engineering" segmentType="department" responseCount={42} />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(screen.getByText('Engineering Department')).toBeTruthy();
  });

  test('renders response count with plural', () => {
    render(
      <SegmentHeader segmentValue="Engineering" segmentType="department" responseCount={42} />,
    );
    expect(screen.getByText(/42 responses/)).toBeTruthy();
  });

  test('renders singular response for count of 1', () => {
    render(
      <SegmentHeader segmentValue="CEO" segmentType="role" responseCount={1} />,
    );
    expect(screen.getByText(/1 response · Subculture analysis/)).toBeTruthy();
  });

  test('renders correct type label for each segment type', () => {
    const { unmount } = render(
      <SegmentHeader segmentValue="West" segmentType="location" responseCount={10} />,
    );
    expect(screen.getByText('West Location')).toBeTruthy();
    unmount();

    render(
      <SegmentHeader segmentValue="1-3 years" segmentType="tenure" responseCount={8} />,
    );
    expect(screen.getByText('1-3 years Tenure')).toBeTruthy();
  });

  test('includes subculture analysis text', () => {
    render(
      <SegmentHeader segmentValue="Engineering" segmentType="department" responseCount={42} />,
    );
    expect(screen.getByText(/Subculture analysis/)).toBeTruthy();
  });
});
