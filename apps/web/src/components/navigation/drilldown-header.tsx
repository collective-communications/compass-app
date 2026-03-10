/**
 * Drilldown header for detail/sub-pages.
 * Layout: back arrow (left) | title (center-left) | actions slot (right).
 */

import type { ReactElement, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export interface DrilldownHeaderProps {
  /** Route path to navigate back to. */
  backTo: string;
  /** Accessible label for the back button. */
  backLabel: string;
  /** Page title displayed next to the back arrow. */
  title: string;
  /** Optional actions slot rendered on the right side. */
  children?: ReactNode;
}

export function DrilldownHeader({
  backTo,
  backLabel,
  title,
  children,
}: DrilldownHeaderProps): ReactElement {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void navigate({ to: backTo });
          }}
          className="flex items-center justify-center rounded-lg p-1.5 text-[var(--grey-600)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--grey-900)]"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--grey-900)]">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
