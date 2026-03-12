/**
 * Card displaying a recommendation with numbered action items.
 * Colored left border indicates severity.
 */

import { Card } from '../../../components/ui/card';

interface RecommendationCardProps {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'healthy';
  dimension: string;
  actions: string[];
}

export function RecommendationCard({
  title,
  description,
  severity,
  dimension,
  actions,
}: RecommendationCardProps): React.ReactNode {
  return (
    <Card
      severity={severity}
      data-testid="recommendation-card"
      role="article"
      aria-label={`${dimension} recommendation: ${title}`}
    >
      <h3 className="mb-2 text-base font-semibold text-[var(--grey-900)]">{title}</h3>
      <p className="mb-4 text-sm text-[var(--grey-500)]">{description}</p>
      {actions.length > 0 && (
        <div aria-live="polite">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--grey-700)]">
            {actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
