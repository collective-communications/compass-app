import type { ReactElement } from 'react';
import { tabPanelId } from './pill-tab-nav';

export interface SubTab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface SubTabNavProps {
  tabs: SubTab[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  /**
   * Prefix used to generate tab DOM ids and matching `aria-controls` targets.
   * Keep this stable per instance. Defaults to `'subtab'`. When two
   * {@link SubTabNav} instances coexist on the same page (e.g. two drill-down
   * regions), pass a more specific prefix.
   */
  idPrefix?: string;
}

/**
 * Underline-style sub-tab bar used for the drill-down navigation tier.
 *
 * ARIA: each tab gets `id={idPrefix}-{tab.id}` and
 * `aria-controls={tabPanelId(idPrefix, tab.id)}`. Consumers should render
 * their tabpanel with `id={tabPanelId(idPrefix, activeId)}` and
 * `aria-labelledby={idPrefix}-{activeId}`.
 */
export function SubTabNav({
  tabs,
  activeId,
  onSelect,
  ariaLabel,
  idPrefix = 'subtab',
}: SubTabNavProps): ReactElement {
  return (
    <nav className="border-b border-[var(--grey-300)]" aria-label={ariaLabel}>
      <ul className="flex items-center gap-4" role="tablist">
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
                className={`relative pb-2 text-sm transition-colors ${
                  isActive
                    ? 'border-b-2 border-[var(--grey-900)] text-[var(--grey-900)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--grey-700)]'
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
