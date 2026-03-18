import type { ReactElement } from 'react';

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
}

export function SubTabNav({ tabs, activeId, onSelect, ariaLabel }: SubTabNavProps): ReactElement {
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
