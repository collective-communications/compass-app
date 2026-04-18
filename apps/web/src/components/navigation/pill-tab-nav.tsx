import type { ReactElement } from 'react';

export interface PillTab {
  id: string;
  label: string;
  disabled?: boolean;
}

/**
 * Build the deterministic DOM id for the `tabpanel` matching a given tab.
 * Consumers render their `tabpanel` with `id={tabPanelId(idPrefix, tabId)}`
 * so `aria-controls` on the tab and `aria-labelledby` on the panel line up.
 *
 * @param idPrefix - The same prefix passed to `<PillTabNav idPrefix=... />`.
 * @param tabId - The id of the tab whose panel is being rendered.
 * @returns `${idPrefix}-panel-${tabId}` — the id to assign to the `tabpanel`.
 */
export function tabPanelId(idPrefix: string, tabId: string): string {
  return `${idPrefix}-panel-${tabId}`;
}

/**
 * Props for {@link PillTabNav}.
 */
interface PillTabNavProps {
  /** Ordered list of tabs to render. */
  tabs: PillTab[];
  /** `id` of the currently active tab. Must match one of `tabs[].id`. */
  activeId: string;
  /** Invoked with the `id` of the tab the user selects. */
  onSelect: (id: string) => void;
  /** Accessible label for the surrounding `<nav>`. */
  ariaLabel?: string;
  /**
   * Prefix used to generate tab DOM ids and matching `aria-controls` targets.
   * Keep this stable per instance so a11y tools can link tabs to their
   * panels. Defaults to `'tab'`. Consumers should pass a more specific
   * prefix when multiple tablists coexist on the same page.
   */
  idPrefix?: string;
}

/**
 * Horizontal scrollable pill-style tab bar used for the primary navigation tier.
 *
 * Active pill renders filled; inactive pills are text-only. Sub-tabs (drill-down)
 * use the underline `<Tabs>` component instead — pills and underlines are the
 * two distinct tiers described in the project UI philosophy.
 *
 * ARIA: each tab gets `id={idPrefix}-{tab.id}` and
 * `aria-controls={tabPanelId(idPrefix, tab.id)}`. Consumers should render
 * their tabpanel with `id={tabPanelId(idPrefix, activeId)}` and
 * `aria-labelledby={idPrefix}-{activeId}`.
 */
export function PillTabNav({
  tabs,
  activeId,
  onSelect,
  ariaLabel,
  idPrefix = 'tab',
}: PillTabNavProps): ReactElement {
  return (
    <nav className="overflow-x-auto scrollbar-hide" aria-label={ariaLabel}>
      <ul className="flex items-center gap-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const isDisabled = tab.disabled === true;

          return (
            <li key={tab.id} role="presentation">
              <button
                type="button"
                role="tab"
                id={`${idPrefix}-${tab.id}`}
                aria-controls={tabPanelId(idPrefix, tab.id)}
                aria-selected={isActive}
                disabled={isDisabled}
                onClick={() => onSelect(tab.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--grey-900)] text-[var(--grey-50)]'
                    : 'text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
                } ${isDisabled ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}
              >
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
