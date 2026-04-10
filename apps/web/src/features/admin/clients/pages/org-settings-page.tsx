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

  if (!settings) {
    return (
      <div className="text-sm text-[var(--text-secondary)]">
        Loading organization settings...
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
      </header>

      {/* Branding */}
      <ClientBranding
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
