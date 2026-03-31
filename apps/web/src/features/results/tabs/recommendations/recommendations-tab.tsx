/**
 * RecommendationsTab — single-card focus navigation through recommendations.
 * Navigation is handled externally via RecommendationsNavContext (sidebar on
 * desktop, mobile strip on small viewports). This component renders only the
 * active recommendation card.
 *
 * Also exports RecommendationsInsightsContent for the insights panel.
 */

import { type ReactElement } from 'react';
import { useRecommendationsNav } from '../../context/recommendations-nav-context';
import { RecommendationCard } from './recommendation-card';
import { TrustLadderCard } from './trust-ladder-card';
import { ServiceLinksCard } from './service-links-card';

interface RecommendationsTabProps {
  surveyId: string;
}

/** Main Recommendations tab content. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RecommendationsTab(_props: RecommendationsTabProps): ReactElement {
  const { sortedRecommendations, activeIndex } = useRecommendationsNav();

  if (sortedRecommendations.length === 0) {
    return <EmptyState />;
  }

  const clampedIndex = Math.min(activeIndex, sortedRecommendations.length - 1);
  const activeRec = sortedRecommendations[clampedIndex]!;

  return (
    <div className="flex flex-col gap-4">
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
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6"
      style={{ borderLeftWidth: '4px', borderLeftColor: 'var(--severity-healthy-border)' }}
    >
      <p className="text-sm font-medium text-[var(--severity-healthy-text)]">
        Your organization is performing well across all dimensions.
      </p>
    </div>
  );
}

