/**
 * Insights panel — right column on desktop, stacked below on mobile.
 * Scrolls independently from main content on desktop viewports.
 */

import type { ReactElement, ReactNode } from 'react';

interface InsightsPanelProps {
  children: ReactNode;
}

export function InsightsPanel({ children }: InsightsPanelProps): ReactElement {
  return (
    <aside
      aria-label="Insights panel"
      className="w-full lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-l lg:border-[var(--grey-100)] lg:pl-6"
    >
      {children}
    </aside>
  );
}
