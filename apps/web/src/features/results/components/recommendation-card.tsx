/**
 * Card displaying a recommendation with numbered action items.
 * Colored left border indicates severity.
 */

interface RecommendationCardProps {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'healthy';
  dimension: string;
  actions: string[];
}

const SEVERITY_BORDERS: Record<string, string> = {
  critical: 'border-l-[#B71C1C]',
  high: 'border-l-[#E65100]',
  medium: 'border-l-[#F9A825]',
  healthy: 'border-l-[#2E7D32]',
};

export function RecommendationCard({
  title,
  description,
  severity,
  dimension,
  actions,
}: RecommendationCardProps): React.ReactNode {
  return (
    <div
      data-testid="recommendation-card"
      className={`rounded-lg border border-[#E5E4E0] border-l-4 bg-white p-6 ${SEVERITY_BORDERS[severity]}`}
      role="article"
      aria-label={`${dimension} recommendation: ${title}`}
    >
      <h3 className="mb-2 text-base font-semibold text-[#212121]">{title}</h3>
      <p className="mb-4 text-sm text-[#616161]">{description}</p>
      {actions.length > 0 && (
        <div aria-live="polite">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-[#424242]">
            {actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
