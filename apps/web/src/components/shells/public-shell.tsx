import type { ReactElement, ReactNode } from 'react';
import { BaseLayout } from './base-layout';
import { CompassLogo } from '../brand/compass-logo';

interface PublicShellProps {
  children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps): ReactElement {
  return (
    <BaseLayout
      header={
        <div className="flex h-[120px] flex-col items-center justify-center lg:hidden">
          <CompassLogo size="lg" />
          <span
            className="mt-2 text-sm font-semibold text-[var(--grey-900)]"
            style={{ fontFamily: 'var(--font-headings)' }}
          >
            Collective Culture Compass
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
