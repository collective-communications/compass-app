import type { ReactElement } from 'react';

export interface PillTab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface PillTabNavProps {
  tabs: PillTab[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
}

export function PillTabNav({ tabs, activeId, onSelect, ariaLabel }: PillTabNavProps): ReactElement {
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
