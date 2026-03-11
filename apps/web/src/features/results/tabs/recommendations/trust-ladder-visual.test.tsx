import { afterEach, describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { TrustLadderVisual } from './trust-ladder-visual';
import type { TrustLadderResult, TrustRungScore, TrustRungStatus } from '@compass/types';

function makeRung(overrides: Partial<TrustRungScore> = {}): TrustRungScore {
  return {
    rung: 1,
    name: 'Foundation',
    dimensionCode: 'core' as TrustRungScore['dimensionCode'],
    score: 3.2,
    maxScore: 4,
    status: 'achieved' as TrustRungStatus,
    ...overrides,
  };
}

function makeTrustLadderResult(overrides: Partial<TrustLadderResult> = {}): TrustLadderResult {
  const rungs: TrustRungScore[] = [];
  for (let i = 1; i <= 9; i++) {
    const status: TrustRungStatus =
      i <= 4 ? 'achieved' : i === 5 ? 'in_progress' : 'not_started';
    rungs.push(
      makeRung({
        rung: i,
        name: `Rung ${i}`,
        status,
        score: i <= 4 ? 3.5 : i === 5 ? 2.0 : 0,
      }),
    );
  }
  return {
    rungs,
    currentLevel: 4,
    nextActions: [],
    ...overrides,
  };
}

describe('TrustLadderVisual', () => {
  afterEach(cleanup);

  test('renders all 9 rung buttons', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(9);
  });

  test('rung order is reversed (rung 9 first in DOM, rung 1 last)', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult()} />);
    const buttons = screen.getAllByRole('button');
    // First button should be rung 9
    expect(buttons[0].textContent).toContain('9');
    // Last button should be rung 1
    expect(buttons[8].textContent).toContain('1');
  });

  test('click a rung button toggles expanded state', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult()} />);
    const button = screen.getAllByRole('button')[0];
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  test('achieved rungs have correct visual indicator', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult()} />);
    // Rung 1 is achieved — last button in DOM
    const buttons = screen.getAllByRole('button');
    const achievedButton = buttons[8]; // rung 1
    expect(achievedButton.className).toContain('bg-green-100');
  });

  test('in-progress rungs have correct visual indicator', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult()} />);
    // Rung 5 is in_progress — index 4 reversed = index 4
    const buttons = screen.getAllByRole('button');
    const inProgressButton = buttons[4]; // rung 5
    expect(inProgressButton.className).toContain('bg-yellow-100');
  });

  test('"Current" badge appears only on the rung matching currentLevel', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult({ currentLevel: 4 })} />);
    const currentBadges = screen.getAllByText('Current');
    expect(currentBadges).toHaveLength(1);
    // The button containing "Current" should also contain "4" (rung number)
    const parentButton = currentBadges[0].closest('button')!;
    expect(parentButton.textContent).toContain('4');
  });

  test('next actions alert box shows when nextActions has items', () => {
    render(
      <TrustLadderVisual
        result={makeTrustLadderResult({ nextActions: ['Improve clarity', 'Build connection'] })}
      />,
    );
    expect(screen.getByText(/Next focus:/)).toBeTruthy();
    expect(screen.getByText(/Improve clarity/)).toBeTruthy();
  });

  test('next actions alert box hidden when nextActions is empty', () => {
    render(<TrustLadderVisual result={makeTrustLadderResult({ nextActions: [] })} />);
    expect(screen.queryByText(/Next focus:/)).toBeNull();
  });
});
