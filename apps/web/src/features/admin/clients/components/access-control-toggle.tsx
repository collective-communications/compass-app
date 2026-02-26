/**
 * Access control toggle card for enabling/disabling client access to results.
 * Implements PB-005 presentation flow: when enabled, client users can view
 * results only after a CC+C consultant has reviewed and released them.
 */

import { useCallback, type ReactElement } from 'react';
import type { SaveStatus } from '../hooks/use-org-settings';
import { AutoSaveIndicator, type AutoSaveStatus } from '../../surveys/components/auto-save-indicator';

interface AccessControlToggleProps {
  enabled: boolean;
  saveStatus: SaveStatus;
  onToggle: (enabled: boolean) => void;
}

const SAVE_TO_AUTOSAVE: Record<SaveStatus, AutoSaveStatus> = {
  saved: 'saved',
  saving: 'saving',
  error: 'error',
};

export function AccessControlToggle({
  enabled,
  saveStatus,
  onToggle,
}: AccessControlToggleProps): ReactElement {
  const handleToggle = useCallback((): void => {
    onToggle(!enabled);
  }, [enabled, onToggle]);

  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-6">
      <fieldset>
        <legend className="mb-4 flex w-full items-center justify-between">
          <span className="text-lg font-semibold text-[var(--grey-900)]">Client Access</span>
          <AutoSaveIndicator status={SAVE_TO_AUTOSAVE[saveStatus]} />
        </legend>

        {/* Toggle row */}
        <div className="mb-4 flex items-center justify-between">
          <label
            htmlFor="client-access-toggle"
            className="text-sm font-medium text-[var(--grey-700)]"
          >
            Enable client access to results
          </label>
          <button
            id="client-access-toggle"
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`Client access is ${enabled ? 'enabled' : 'disabled'}`}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              enabled ? 'bg-[var(--color-core,#0A3B4F)]' : 'bg-[var(--grey-300,#D4D4D4)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Info panel explaining PB-005 presentation flow */}
        <div className="rounded-lg border border-[#E5E4E0] bg-[var(--grey-50,#F5F5F5)] p-4">
          <p className="mb-2 text-sm font-medium text-[var(--grey-700)]">
            How client access works (PB-005)
          </p>
          <ul className="space-y-2 text-sm text-[var(--grey-600)]">
            <li className="flex gap-2">
              <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--grey-400)]" aria-hidden="true" />
              <span>
                When enabled, client users with the appropriate role can access the results dashboard for this organization.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--grey-400)]" aria-hidden="true" />
              <span>
                Results are only visible after a CC+C consultant reviews the data and explicitly releases them for client viewing.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--grey-400)]" aria-hidden="true" />
              <span>
                Disabling this setting immediately revokes client access. Previously shared results will no longer be viewable.
              </span>
            </li>
          </ul>
        </div>
      </fieldset>
    </div>
  );
}
