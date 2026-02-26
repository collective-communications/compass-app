/**
 * Branding settings card.
 * Displays logo upload placeholder and read-only brand color swatches.
 */

import type { ReactElement } from 'react';
import type { SystemSettings } from '../hooks/use-system-settings';

interface BrandingCardProps {
  settings: SystemSettings;
}

const COLOR_LABELS: { key: keyof SystemSettings['brand_colors']; label: string }[] = [
  { key: 'core', label: 'Core' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'connection', label: 'Connection' },
  { key: 'collaboration', label: 'Collaboration' },
];

export function BrandingCard({ settings }: BrandingCardProps): ReactElement {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-6">
      <fieldset>
        <legend className="mb-4 text-lg font-semibold text-[var(--grey-900)]">
          Branding
        </legend>

        {/* Logo upload placeholder */}
        <div className="mb-5">
          <span className="mb-1 block text-sm font-medium text-[var(--grey-700)]">Logo</span>
          <div className="flex h-28 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E4E0] bg-[var(--grey-50)]">
            <div className="text-center">
              <svg
                className="mx-auto mb-1 h-6 w-6 text-[var(--grey-400)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-xs text-[var(--grey-500)]">Upload logo</span>
            </div>
          </div>
        </div>

        {/* Brand color swatches (read-only) */}
        <div className="mb-3">
          <span className="mb-2 block text-sm font-medium text-[var(--grey-700)]">
            Brand colors
          </span>
          <div className="flex gap-4">
            {COLOR_LABELS.map(({ key, label }) => {
              const hex = settings.brand_colors[key];
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div
                    className="h-10 w-10 rounded-lg border border-[#E5E4E0]"
                    style={{ backgroundColor: hex }}
                    aria-label={`${label}: ${hex}`}
                    role="img"
                  />
                  <span className="text-xs text-[var(--grey-600)]">{label}</span>
                  <span className="text-[10px] uppercase text-[var(--grey-400)]">{hex}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-[var(--grey-500)]">
          Per-client branding set in client settings.
        </p>
      </fieldset>
    </div>
  );
}
