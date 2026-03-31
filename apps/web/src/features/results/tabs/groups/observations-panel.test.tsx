import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { ObservationsPanel } from './observations-panel';
import type { SegmentObservation } from './lib/compute-deltas';

afterEach(cleanup);

const mockObservations: SegmentObservation[] = [
  {
    dimensionCode: 'core',
    title: 'Strong core alignment',
    description: 'Core is 8% above the organization average',
    dotColor: '#0A3B4F',
  },
  {
    dimensionCode: 'clarity',
    title: 'Lower clarity scores',
    description: 'Clarity is 15% below the organization average',
    dotColor: '#FF7F50',
  },
  {
    dimensionCode: 'collaboration',
    title: 'Internal dimension gap',
    description: 'Difference of 23% between Core and Clarity',
    dotColor: '#E8B4A8',
  },
];

describe('ObservationsPanel', () => {
  test('renders "Observations" heading when observations present', () => {
    render(<ObservationsPanel observations={mockObservations} />);
    expect(screen.getByText('Observations')).toBeDefined();
  });

  test('renders all observation titles and descriptions', () => {
    render(<ObservationsPanel observations={mockObservations} />);

    for (const obs of mockObservations) {
      expect(screen.getByText(obs.title)).toBeDefined();
      expect(screen.getByText(obs.description)).toBeDefined();
    }
  });

  test('returns null when observations array is empty', () => {
    const { container } = render(<ObservationsPanel observations={[]} />);
    expect(container.innerHTML).toBe('');
  });

  test('colored dots have correct background color via inline style', () => {
    render(<ObservationsPanel observations={mockObservations} />);

    const dots = document.querySelectorAll('[aria-hidden="true"]');
    expect(dots.length).toBe(mockObservations.length);

    dots.forEach((dot, i) => {
      expect((dot as HTMLElement).style.backgroundColor).toBe(
        mockObservations[i].dotColor,
      );
    });
  });
});
