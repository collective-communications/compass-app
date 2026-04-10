/**
 * System settings page for CC+C administrators.
 * Route: /settings (admin bottom tab "Settings")
 * Mobile: single-column stack. Desktop: two-column grid.
 */

import type { ReactElement } from 'react';
import { useSystemSettings } from '../hooks/use-system-settings';
import { SurveyDefaultsCard } from '../components/survey-defaults-card';
import { BrandingCard } from '../components/branding-card';
import { EmailTemplatesCard } from '../components/email-templates-card';
import { DataSecurityCard } from '../components/data-security-card';

export function SystemSettingsPage(): ReactElement {
  const { settings, saveStatus, updateField, query } = useSystemSettings();

  if (query.isLoading) {
    return (
      <div>
        <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
          Loading settings...
        </div>
      </div>
    );
  }

  if (query.error) {
    return (
      <div>
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          Failed to load settings. Please try again.
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div>
        <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
          No settings found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--grey-900)]">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <SurveyDefaultsCard
            settings={settings}
            saveStatus={saveStatus}
            onUpdateField={updateField}
          />
          <BrandingCard settings={settings} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <EmailTemplatesCard />
          <DataSecurityCard />
        </div>
      </div>
    </div>
  );
}
