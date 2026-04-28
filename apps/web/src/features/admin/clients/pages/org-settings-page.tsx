/**
 * Per-organization settings page.
 * Composes metadata configuration, client branding, and access control
 * sections with per-section auto-save indicators.
 */

import { type ReactElement } from 'react';
import { useParams } from '@tanstack/react-router';
import { useOrgSettings, type MetadataCategory, type MetadataListItem } from '../hooks/use-org-settings';
import { useOrganization } from '../hooks/use-organization';
import { MetadataConfig } from '../components/metadata-config';
import { ClientBranding } from '../components/client-branding';
import { AccessControlToggle } from '../components/access-control-toggle';

const METADATA_SECTIONS: Array<{
  category: MetadataCategory;
  label: string;
  description: string;
}> = [
  {
    category: 'departments',
    label: 'Departments',
    description: 'Dropdown options for department selection in surveys. Respondents choose from this list.',
  },
  {
    category: 'roles',
    label: 'Roles',
    description: 'Role or job level options presented to respondents during survey intake.',
  },
  {
    category: 'locations',
    label: 'Locations',
    description: 'Office or geographic locations available as demographic segments.',
  },
  {
    category: 'tenureBands',
    label: 'Tenure Bands',
    description: 'Length-of-service ranges for segmenting survey responses.',
  },
];

export function OrgSettingsPage(): ReactElement {
  const { orgId } = useParams({ strict: false }) as { orgId: string };
  const org = useOrganization(orgId ?? '');
  const {
    settings,
    needsCreate,
    isLoading,
    metadataUsage,
    saveStatus,
    updateMetadata,
    updateBranding,
    updateClientAccess,
  } = useOrgSettings(orgId ?? '');

  if (!orgId) {
    return (
      <div className="text-sm text-[var(--text-secondary)]">
        No organization selected.
      </div>
    );
  }

  // While the query is in flight, show a lightweight skeleton. Once it settles,
  // `settings` is always defined — missing DB rows are hydrated with defaults
  // (flagged via `needsCreate`) so the form always renders.
  if (isLoading || !settings) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-busy="true">
        <div className="mb-2">
          <div className="h-7 w-64 rounded bg-[var(--grey-100)]" />
          <div className="mt-2 h-4 w-96 rounded bg-[var(--grey-100)]" />
        </div>
        <div className="h-40 rounded-lg bg-[var(--grey-100)]" />
        <div className="h-40 rounded-lg bg-[var(--grey-100)]" />
        <div className="h-40 rounded-lg bg-[var(--grey-100)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold text-[var(--grey-900)]">
          {org.data?.name ?? 'Organization'} Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Configure metadata options, branding, and access controls for this organization.
        </p>
        {needsCreate ? (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            This organization doesn&apos;t have saved settings yet — defaults shown. Saving any field will create them.
          </p>
        ) : null}
      </header>

      {/* Branding */}
      <ClientBranding
        orgId={orgId}
        branding={settings.branding}
        saveStatus={saveStatus}
        onUpdate={updateBranding}
      />

      {/* Metadata sections */}
      {METADATA_SECTIONS.map((section) => (
        <MetadataConfig
          key={section.category}
          category={section.category}
          label={section.label}
          description={section.description}
          items={settings.metadata[section.category]}
          inUseLabels={metadataUsage[section.category]}
          saveStatus={saveStatus}
          onUpdate={(items: MetadataListItem[]) => updateMetadata(section.category, items)}
        />
      ))}

      {/* Access control */}
      <AccessControlToggle
        enabled={settings.clientAccessEnabled}
        saveStatus={saveStatus}
        onToggle={updateClientAccess}
      />
    </div>
  );
}
