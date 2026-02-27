/**
 * RecommendationsTab — displays actionable recommendations sorted by severity.
 * Also exports RecommendationsInsightsContent for the insights panel.
 */

import { useState, useMemo, type ReactElement } from 'react';
import type { RiskSeverity } from '@compass/scoring';
import { useRecommendations } from '../../hooks/use-recommendations';
import { SEVERITY_ORDER } from '../../lib/severity-mapping';
import { SeverityFilter, type FilterValue } from './severity-filter';
import { RecommendationList } from './recommendation-list';
import { TrustLadderCard } from './trust-ladder-card';
import { ServiceLinksCard } from './service-links-card';

interface RecommendationsTabProps {
  surveyId: string;
}

/** Main Recommendations tab content. */
export function RecommendationsTab({ surveyId }: RecommendationsTabProps): ReactElement {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const { data: recommendations, isLoading } = useRecommendations(surveyId);

  const counts = useMemo(() => {
    const map: Record<RiskSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      healthy: 0,
    };
    for (const rec of recommendations ?? []) {
      if (rec.severity in map) {
        map[rec.severity as RiskSeverity]++;
      }
    }
    return map;
  }, [recommendations]);

  const totalCount = recommendations?.length ?? 0;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SeverityFilter
        activeFilter={activeFilter}
        counts={counts}
        totalCount={totalCount}
        onFilterChange={setActiveFilter}
      />
      <RecommendationList
        recommendations={recommendations ?? []}
        activeFilter={activeFilter}
      />
    </div>
  );
}

/** Insights panel content for the Recommendations tab. */
export function RecommendationsInsightsContent(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <TrustLadderCard />
      <ServiceLinksCard />
    </div>
  );
}

/** Loading skeleton matching the tab layout. */
function LoadingSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-10 animate-pulse rounded-lg bg-[var(--grey-50)]" />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
        />
      ))}
    </div>
  );
}
