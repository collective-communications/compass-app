import type { ReactElement, ReactNode } from 'react';
import { BaseLayout } from './base-layout';

interface PublicShellProps {
  children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps): ReactElement {
  return (
    <BaseLayout
      header={
        <div className="flex h-[120px] flex-col items-center justify-center lg:hidden">
          <img
            src="/compass-brand-panel-dark.svg"
            alt="The Collective Culture Compass"
            className="h-16 w-16"
          />
          <span
            className="mt-2 text-sm font-semibold text-[var(--grey-900)]"
            style={{ fontFamily: 'var(--font-headings)' }}
          >
            The Collective Culture Compass&#8482;
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            culture + communication
          </span>
        </div>
      }
    >
      {children}
    </BaseLayout>
  );
}
