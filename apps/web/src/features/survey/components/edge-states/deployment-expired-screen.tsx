import type { ReactElement } from 'react';
import { formatDisplayDate } from '@compass/utils';

export interface DeploymentExpiredScreenProps {
  /** ISO 8601 close date. When provided, renders a "Closed on <date>" line. */
  closesAt?: string | null;
}

/** Screen shown when a deployment link has expired (token is no longer valid). */
export function DeploymentExpiredScreen({ closesAt }: DeploymentExpiredScreenProps = {}): ReactElement {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" data-testid="deployment-expired">
      <div className="container-survey bg-[var(--surface-card)] p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[var(--grey-900)]">
          Survey Link Expired
        </h1>
        <p className="text-[var(--text-secondary)]">
          This survey link is no longer valid. Please contact the person who shared
          it with you to request a new link.
        </p>
        {closesAt && (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Closed on {formatDisplayDate(closesAt, 'long')}
          </p>
        )}
      </div>
    </div>
  );
}
