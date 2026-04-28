/**
 * Client branding card for per-organization display name and logo.
 */

import { useCallback, useRef, type ReactElement, type ChangeEvent } from 'react';
import type { OrgBranding, SaveStatus } from '../hooks/use-org-settings';
import { useLogoUpload } from '../hooks/use-logo-upload';
import { AutoSaveIndicator, type AutoSaveStatus } from '../../surveys/components/auto-save-indicator';

interface ClientBrandingProps {
  orgId: string;
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
  orgId,
  branding,
  saveStatus,
  onUpdate,
}: ClientBrandingProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadLogo, isUploading, error: uploadError } = useLogoUpload(orgId);

  const handleDisplayNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      onUpdate({ displayName: e.target.value });
    },
    [onUpdate],
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      const url = await uploadLogo(file);
      if (url) {
        onUpdate({ logoUrl: url });
      }
    },
    [uploadLogo, onUpdate],
  );

  const handleUploadZoneClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveLogo = useCallback((): void => {
    onUpdate({ logoUrl: null });
  }, [onUpdate]);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      <fieldset>
        <legend className="mb-4 flex w-full items-center justify-between">
          <span className="text-lg font-semibold text-[var(--grey-900)]">Branding</span>
          <AutoSaveIndicator status={SAVE_TO_AUTOSAVE[saveStatus]} />
        </legend>

        <p className="mb-6 text-sm text-[var(--text-secondary)]">
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
            className="w-full max-w-md rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive)]"
          />
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Shown in survey headers and reports. Leave blank to use the organization name.
          </p>
        </div>

        {/* Logo */}
        <div>
          <span className="mb-1 block text-sm font-medium text-[var(--grey-700)]">Logo</span>

          {branding.logoUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={branding.logoUrl}
                alt="Organization logo"
                style={{ maxHeight: '64px', maxWidth: '200px' }}
                className="rounded-lg border border-[var(--grey-100)] object-contain"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--grey-900)]"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload organization logo"
              />
              <button
                type="button"
                onClick={handleUploadZoneClick}
                disabled={isUploading}
                className="flex h-24 w-full max-w-md cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[var(--grey-100)] bg-[var(--grey-50,#F5F5F5)] hover:border-[var(--color-interactive)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-interactive)] disabled:cursor-default disabled:opacity-60"
              >
                <span className="text-sm text-[var(--text-tertiary)]">
                  {isUploading ? 'Uploading…' : 'Click to upload logo'}
                </span>
              </button>
              {uploadError ? (
                <p className="mt-1 text-xs text-[var(--feedback-error-text,#B91C1C)]" role="alert">
                  {uploadError}
                </p>
              ) : null}
            </>
          )}
        </div>
      </fieldset>
    </div>
  );
}
