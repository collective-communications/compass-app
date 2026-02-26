/**
 * RecommendationList — filtered and severity-sorted list
 * of recommendation cards with an empty state.
 */

import type { ReactElement } from 'react';
import type { Recommendation } from '../../types';
import type { FilterValue } from './severity-filter';
import { severitySortKey } from '../../lib/severity-mapping';
import { RecommendationCard } from './recommendation-card';

interface RecommendationListProps {
  recommendations: Recommendation[];
  activeFilter: FilterValue;
}

/** Renders a filtered, severity-sorted list of recommendation cards. */
export function RecommendationList({
  recommendations,
  activeFilter,
}: RecommendationListProps): ReactElement {
  const filtered =
    activeFilter === 'all'
      ? recommendations
      : recommendations.filter((r) => r.severity === activeFilter);

  const sorted = [...filtered].sort(
    (a, b) => severitySortKey(a.severity) - severitySortKey(b.severity) || a.priority - b.priority,
  );

  if (sorted.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Recommendations">
      {sorted.map((rec) => (
        <div key={rec.id} role="listitem">
          <RecommendationCard recommendation={rec} />
        </div>
      ))}
    </div>
  );
}

/** Positive empty state when no recommendations exist. */
function EmptyState(): ReactElement {
  return (
    <div
      className="rounded-lg border border-[#E5E4E0] bg-white p-6"
      style={{ borderLeftWidth: '4px', borderLeftColor: '#2E7D32' }}
    >
      <p className="text-sm font-medium text-[#2E7D32]">
        Your organization is performing well across all dimensions.
      </p>
    </div>
  );
}
