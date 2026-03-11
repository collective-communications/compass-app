import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import type { TabConfig } from '../../lib/navigation';

/**
 * Mock AppLink to render as a plain <a> tag for testing.
 * Avoids mocking @tanstack/react-router directly (bun ESM issue on Linux).
 */
mock.module('./app-link', () => ({
  AppLink: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

const { BottomTabBar } = await import('./bottom-tab-bar');

const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', href: '/dashboard' },
  { id: 'results', label: 'Results', icon: 'compass', href: '/results' },
  { id: 'reports', label: 'Reports', icon: 'file-down', href: '/reports' },
];

describe('BottomTabBar', () => {
  afterEach(cleanup);

  test('renders all tab labels', () => {
    render(<BottomTabBar tabs={TABS} activeTabId="dashboard" />);
    for (const tab of TABS) {
      expect(screen.getByText(tab.label)).toBeTruthy();
    }
  });

  test('renders a nav element', () => {
    render(<BottomTabBar tabs={TABS} activeTabId="dashboard" />);
    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  test('renders links for each non-disabled tab', () => {
    render(<BottomTabBar tabs={TABS} activeTabId="dashboard" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(TABS.length);
  });

  test('active tab has core color styling', () => {
    render(<BottomTabBar tabs={TABS} activeTabId="results" />);
    const link = screen.getByText('Results').closest('a');
    expect(link?.className).toContain('text-[var(--color-core)]');
  });

  test('inactive tabs have grey styling', () => {
    render(<BottomTabBar tabs={TABS} activeTabId="results" />);
    const link = screen.getByText('Dashboard').closest('a');
    expect(link?.className).toContain('text-[var(--grey-500)]');
  });

  test('links point to correct hrefs', () => {
    render(<BottomTabBar tabs={TABS} activeTabId="dashboard" />);
    for (const tab of TABS) {
      const link = screen.getByText(tab.label).closest('a');
      expect(link?.getAttribute('href')).toBe(tab.href);
    }
  });

  test('null activeTabId means no tab has active styling', () => {
    render(<BottomTabBar tabs={TABS} activeTabId={null} />);
    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link.className).toContain('text-[var(--grey-500)]');
    }
  });

  test('disabled tab renders as span, not link', () => {
    const tabs: TabConfig[] = [
      { id: 'a', label: 'Active', icon: 'compass', href: '/a' },
      { id: 'b', label: 'Locked', icon: 'settings', href: '/b', disabled: true },
    ];
    render(<BottomTabBar tabs={tabs} activeTabId="a" />);

    const lockedText = screen.getByText('Locked');
    expect(lockedText.closest('a')).toBeNull();

    const activeText = screen.getByText('Active');
    expect(activeText.closest('a')).toBeTruthy();
  });

  test('disabled tab has reduced opacity', () => {
    const tabs: TabConfig[] = [
      { id: 'a', label: 'Active', icon: 'compass', href: '/a' },
      { id: 'b', label: 'Locked', icon: 'settings', href: '/b', disabled: true },
    ];
    render(<BottomTabBar tabs={tabs} activeTabId="a" />);
    const lockedText = screen.getByText('Locked');
    const wrapper = lockedText.parentElement;
    expect(wrapper?.className).toContain('opacity-40');
  });

  test('renders empty list when no tabs provided', () => {
    render(<BottomTabBar tabs={[]} activeTabId={null} />);
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);
  });
});
