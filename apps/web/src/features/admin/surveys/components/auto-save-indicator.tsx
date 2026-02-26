/**
 * Auto-save status indicator for the survey builder.
 * Shows "Saving..." during mutations and "All changes saved" when idle.
 */

import type { ReactElement } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
}

const STATUS_TEXT: Record<AutoSaveStatus, string> = {
  idle: '',
  saving: 'Saving\u2026',
  saved: 'All changes saved',
  error: 'Failed to save',
};

const STATUS_CLASS: Record<AutoSaveStatus, string> = {
  idle: 'text-transparent',
  saving: 'text-[var(--grey-500)]',
  saved: 'text-[var(--grey-500)]',
  error: 'text-red-600',
};

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps): ReactElement {
  return (
    <span
      className={`text-xs transition-colors ${STATUS_CLASS[status]}`}
      role="status"
      aria-live="polite"
    >
      {STATUS_TEXT[status]}
    </span>
  );
}
