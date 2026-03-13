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
}

export function SubTabNav({ tabs, activeId, onSelect }: SubTabNavProps): ReactElement {
  return (
    <nav className="border-b border-[var(--grey-300)]">
      <ul className="flex items-center gap-4">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const isDisabled = tab.disabled === true;

          return (
            <li key={tab.id}>
              <button
                type="button"
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
