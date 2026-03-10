/**
 * Data and security settings card.
 * Read-only data retention policy, disabled export button, and API access placeholder.
 */

import type { ReactElement } from 'react';
import { Card } from '../../../../components/ui/card';

export function DataSecurityCard(): ReactElement {
  return (
    <Card className="rounded-lg">
      <fieldset>
        <legend className="mb-4 text-lg font-semibold text-[var(--grey-900)]">
          Data &amp; Security
        </legend>

        <div className="space-y-5">
          {/* Data retention */}
          <div>
            <span className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
              Data retention
            </span>
            <p className="text-sm text-[var(--grey-600)]">
              Responses retained indefinitely.
            </p>
          </div>

          {/* Export all data */}
          <div>
            <span className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
              Export all data
            </span>
            <button
              type="button"
              aria-disabled="true"
              className="cursor-not-allowed rounded-lg border border-[var(--grey-100)] px-4 py-2 text-sm text-[var(--grey-400)]"
              onClick={(e) => e.preventDefault()}
            >
              Export all data
            </button>
            <p className="mt-1 text-xs text-[var(--grey-500)]">
              Contact support to request a full data export.
            </p>
          </div>

          {/* API access */}
          <div>
            <span className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
              API access
            </span>
            <p className="text-sm text-[var(--grey-600)]">
              Not configured.
            </p>
          </div>
        </div>
      </fieldset>
    </Card>
  );
}
