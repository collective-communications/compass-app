/**
 * TanStack Query hook for loading organization metadata configuration.
 * Returns the metadata field options (department, role, location, tenure)
 * for populating the welcome screen's metadata form.
 */
import { useQuery } from '@tanstack/react-query';
import type { MetadataConfig } from '@compass/types';
import { DEFAULT_METADATA_CONFIG } from '@compass/types';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const adapter = createSurveyEngineAdapter();

/** Load metadata config for an organization, falling back to defaults. */
export function useMetadataConfig(organizationId: string | undefined) {
  return useQuery<MetadataConfig>({
    queryKey: ['metadataConfig', organizationId],
    queryFn: () => {
      if (!organizationId) {
        return Promise.resolve({ ...DEFAULT_METADATA_CONFIG });
      }
      return adapter.getMetadataConfig(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
    placeholderData: DEFAULT_METADATA_CONFIG,
  });
}
