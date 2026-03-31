/**
 * Sidebar column — left navigation column on desktop, hidden on mobile.
 * Sticky positioned with independent scroll, matching InsightsPanel pattern.
 */

import type { ReactElement, ReactNode } from 'react';

interface SidebarColumnProps {
  children: ReactNode;
  /** aria-label for the sidebar landmark */
  label?: string;
}

export function SidebarColumn({ children, label }: SidebarColumnProps): ReactElement {
  return (
    <aside
      aria-label={label ?? 'Navigation sidebar'}
      className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:border-r lg:border-[var(--grey-100)] lg:pr-4"
    >
      {children}
    </aside>
  );
}
