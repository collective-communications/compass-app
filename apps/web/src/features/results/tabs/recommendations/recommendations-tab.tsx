/**
 * RecommendationsTab — single-card focus navigation through recommendations.
 * Pill buttons at the top select which recommendation is displayed.
 * Also exports RecommendationsInsightsContent for the insights panel.
 */

import { useState, useMemo, type ReactElement } from 'react';
import { useRecommendations } from '../../hooks/use-recommendations';
import { severitySortKey } from '../../lib/severity-mapping';
import { RecommendationNav } from './severity-filter';
import { RecommendationCard } from './recommendation-card';
import { TrustLadderCard } from './trust-ladder-card';
import { ServiceLinksCard } from './service-links-card';

interface RecommendationsTabProps {
  surveyId: string;
}

/** Main Recommendations tab content. */
export function RecommendationsTab({ surveyId }: RecommendationsTabProps): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: recommendations, isLoading } = useRecommendations(surveyId);

  const sorted = useMemo(() => {
    if (!recommendations) return [];
    return [...recommendations].sort(
      (a, b) => severitySortKey(a.severity) - severitySortKey(b.severity) || a.priority - b.priority,
    );
  }, [recommendations]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (sorted.length === 0) {
    return <EmptyState />;
  }

  const clampedIndex = Math.min(activeIndex, sorted.length - 1);
  const activeRec = sorted[clampedIndex]!;

  return (
    <div className="flex flex-col gap-4">
      <RecommendationNav
        recommendations={sorted}
        activeIndex={clampedIndex}
        onSelect={setActiveIndex}
      />
      <RecommendationCard recommendation={activeRec} />
    </div>
  );
}

interface RecommendationsInsightsContentProps {
  surveyId: string;
}

/** Insights panel content for the Recommendations tab. */
export function RecommendationsInsightsContent({ surveyId }: RecommendationsInsightsContentProps): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <TrustLadderCard surveyId={surveyId} />
      <ServiceLinksCard />
    </div>
  );
}

/** Positive empty state when no recommendations exist. */
function EmptyState(): ReactElement {
  return (
    <div
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6"
      style={{ borderLeftWidth: '4px', borderLeftColor: 'var(--severity-healthy-border)' }}
    >
      <p className="text-sm font-medium text-[var(--severity-healthy-text)]">
        Your organization is performing well across all dimensions.
      </p>
    </div>
  );
}

/** Loading skeleton matching the tab layout. */
function LoadingSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-10 animate-pulse rounded-lg bg-[var(--grey-50)]" />
      <div className="h-28 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]" />
    </div>
  );
}
