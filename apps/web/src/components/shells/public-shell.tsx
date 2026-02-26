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
        <div className="flex h-14 items-center px-4 lg:px-6">
          <CompassLogo size="md" />
          <span
            className="ml-2 text-sm font-semibold text-[var(--grey-900)]"
            style={{ fontFamily: 'var(--font-headings)' }}
          >
            Culture Compass
          </span>
        </div>
      }
    >
      {children}
    </BaseLayout>
  );
}
