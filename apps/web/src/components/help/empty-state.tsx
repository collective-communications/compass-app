import type { ReactElement, ReactNode } from 'react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle: string;
  actions?: EmptyStateAction[];
}

/**
 * No-data state card — centered layout with optional icon, title, subtitle, and actions.
 * Sits inside a parent container with no border of its own.
 */
export function EmptyState({ icon, title, subtitle, actions }: EmptyStateProps): ReactElement {
  return (
    <div role="status" className="flex flex-col items-center justify-center px-8 py-12 text-center">
      {icon !== undefined && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--grey-500)]">{subtitle}</p>
      {actions !== undefined && actions.length > 0 && (
        <div className="mt-6 flex gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={
                action.variant === 'outline'
                  ? 'rounded-md border border-[var(--grey-100)] px-4 py-2 text-sm font-medium text-[var(--grey-700)] hover:bg-[var(--grey-50)]'
                  : 'rounded-md bg-[var(--grey-700)] px-4 py-2 text-sm font-medium text-[var(--grey-50)] hover:bg-[var(--grey-900)]'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
