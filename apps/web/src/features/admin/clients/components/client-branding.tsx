/**
 * Client branding card for per-organization display name and logo.
 * Logo upload is a placeholder — file upload integration is deferred.
 */

import { useCallback, type ReactElement, type ChangeEvent } from 'react';
import type { OrgBranding, SaveStatus } from '../hooks/use-org-settings';
import { AutoSaveIndicator, type AutoSaveStatus } from '../../surveys/components/auto-save-indicator';

interface ClientBrandingProps {
  branding: OrgBranding;
  saveStatus: SaveStatus;
  onUpdate: (branding: Partial<OrgBranding>) => void;
}

const SAVE_TO_AUTOSAVE: Record<SaveStatus, AutoSaveStatus> = {
  saved: 'saved',
  saving: 'saving',
  error: 'error',
};

export function ClientBranding({
  branding,
  saveStatus,
  onUpdate,
}: ClientBrandingProps): ReactElement {
  const handleDisplayNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      onUpdate({ displayName: e.target.value });
    },
    [onUpdate],
  );

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <fieldset>
        <legend className="mb-4 flex w-full items-center justify-between">
          <span className="text-lg font-semibold text-[var(--grey-900)]">Branding</span>
          <AutoSaveIndicator status={SAVE_TO_AUTOSAVE[saveStatus]} />
        </legend>

        <p className="mb-6 text-sm text-[var(--grey-500)]">
          Controls how this organization appears to survey respondents and in client-facing reports.
        </p>

        {/* Display name */}
        <div className="mb-5">
          <label
            htmlFor="org-display-name"
            className="mb-1 block text-sm font-medium text-[var(--grey-700)]"
          >
            Display name
          </label>
          <input
            id="org-display-name"
            type="text"
            value={branding.displayName}
            onChange={handleDisplayNameChange}
            aria-label="Organization display name"
            className="w-full max-w-md rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core-text)]"
          />
          <p className="mt-1 text-xs text-[var(--grey-500)]">
            Shown in survey headers and reports. Leave blank to use the organization name.
          </p>
        </div>

        {/* Logo placeholder */}
        <div>
          <span className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
            Logo
          </span>
          {branding.logoUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={branding.logoUrl}
                alt="Organization logo"
                className="h-12 w-12 rounded-lg border border-[var(--grey-100)] object-contain"
              />
              <span className="text-xs text-[var(--grey-500)]">
                Logo upload management coming soon.
              </span>
            </div>
          ) : (
            <div className="flex h-24 w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-[var(--grey-100)] bg-[var(--grey-50,#F5F5F5)]">
              <span className="text-sm text-[var(--grey-400)]">
                Logo upload coming soon
              </span>
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}
