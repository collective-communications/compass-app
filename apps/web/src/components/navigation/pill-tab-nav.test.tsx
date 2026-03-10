import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PillTabNav, type PillTab } from './pill-tab-nav';

const TABS: PillTab[] = [
  { id: 'compass', label: 'Compass' },
  { id: 'survey', label: 'Survey' },
  { id: 'groups', label: 'Groups' },
  { id: 'dialogue', label: 'Dialogue' },
];

describe('PillTabNav', () => {
  afterEach(cleanup);

  test('renders all tab labels', () => {
    render(<PillTabNav tabs={TABS} activeId="compass" onSelect={() => {}} />);
    for (const tab of TABS) {
      expect(screen.getByText(tab.label)).toBeTruthy();
    }
  });

  test('renders a nav element', () => {
    render(<PillTabNav tabs={TABS} activeId="compass" onSelect={() => {}} />);
    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  test('renders buttons for each tab', () => {
    render(<PillTabNav tabs={TABS} activeId="compass" onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(TABS.length);
  });

  test('active tab has dark fill styling', () => {
    const { container } = render(
      <PillTabNav tabs={TABS} activeId="survey" onSelect={() => {}} />,
    );
    const activeButton = screen.getByText('Survey');
    expect(activeButton.className).toContain('bg-[var(--grey-900)]');
    expect(activeButton.className).toContain('text-white');
  });

  test('inactive tabs do not have dark fill styling', () => {
    render(<PillTabNav tabs={TABS} activeId="compass" onSelect={() => {}} />);
    const inactiveButton = screen.getByText('Survey');
    expect(inactiveButton.className).not.toContain('bg-[var(--grey-900)]');
    expect(inactiveButton.className).toContain('text-[var(--grey-700)]');
  });

  test('clicking inactive tab fires onSelect with tab id', () => {
    const onSelect = mock(() => {});
    render(<PillTabNav tabs={TABS} activeId="compass" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Groups'));
    expect(onSelect).toHaveBeenCalledWith('groups');
  });

  test('clicking active tab also fires onSelect', () => {
    const onSelect = mock(() => {});
    render(<PillTabNav tabs={TABS} activeId="compass" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Compass'));
    expect(onSelect).toHaveBeenCalledWith('compass');
  });

  test('disabled tab is rendered as disabled button', () => {
    const tabs: PillTab[] = [
      { id: 'a', label: 'Enabled' },
      { id: 'b', label: 'Disabled', disabled: true },
    ];
    render(<PillTabNav tabs={tabs} activeId="a" onSelect={() => {}} />);
    const disabledBtn = screen.getByText('Disabled');
    expect(disabledBtn.hasAttribute('disabled')).toBe(true);
  });

  test('disabled tab has reduced opacity styling', () => {
    const tabs: PillTab[] = [
      { id: 'a', label: 'Enabled' },
      { id: 'b', label: 'Disabled', disabled: true },
    ];
    render(<PillTabNav tabs={tabs} activeId="a" onSelect={() => {}} />);
    const disabledBtn = screen.getByText('Disabled');
    expect(disabledBtn.className).toContain('opacity-40');
  });

  test('clicking disabled tab does not fire onSelect', () => {
    const onSelect = mock(() => {});
    const tabs: PillTab[] = [
      { id: 'a', label: 'Enabled' },
      { id: 'b', label: 'Disabled', disabled: true },
    ];
    render(<PillTabNav tabs={tabs} activeId="a" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Disabled'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('renders empty list when no tabs provided', () => {
    render(<PillTabNav tabs={[]} activeId="" onSelect={() => {}} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});
