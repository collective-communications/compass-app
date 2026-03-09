import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { RiskFlagCard } from './risk-flag-card';

afterEach(cleanup);

describe('RiskFlagCard', () => {
  test('renders title and description', () => {
    render(
      <RiskFlagCard
        title="Low Core Score"
        description="Core culture needs attention"
        severity="critical"
        dimension="Core"
      />,
    );
    expect(screen.getByText('Low Core Score')).toBeTruthy();
    expect(screen.getByText('Core culture needs attention')).toBeTruthy();
  });

  test('critical severity applies red left border class', () => {
    const { container } = render(
      <RiskFlagCard title="Test" description="Desc" severity="critical" dimension="Core" />,
    );
    expect(container.innerHTML).toContain('border-l-[#B71C1C]');
  });

  test('high severity applies orange left border class', () => {
    const { container } = render(
      <RiskFlagCard title="Test" description="Desc" severity="high" dimension="Clarity" />,
    );
    expect(container.innerHTML).toContain('border-l-[#E65100]');
  });

  test('medium severity applies yellow left border class', () => {
    const { container } = render(
      <RiskFlagCard title="Test" description="Desc" severity="medium" dimension="Connection" />,
    );
    expect(container.innerHTML).toContain('border-l-[#F9A825]');
  });

  test('healthy severity applies green left border class', () => {
    const { container } = render(
      <RiskFlagCard title="Test" description="Desc" severity="healthy" dimension="Collaboration" />,
    );
    expect(container.innerHTML).toContain('border-l-[#2E7D32]');
  });

  test('has accessible aria-label with severity and title', () => {
    render(
      <RiskFlagCard title="Low Score" description="Desc" severity="critical" dimension="Core" />,
    );
    expect(screen.getByRole('article', { name: /critical risk: Low Score/i })).toBeTruthy();
  });

  test('displays dimension label', () => {
    render(
      <RiskFlagCard title="Test" description="Desc" severity="high" dimension="Clarity" />,
    );
    expect(screen.getByText('Clarity')).toBeTruthy();
  });
});
