/**
 * Badge displaying Core dimension health status.
 * Classifies as healthy (green), fragile (yellow), or broken (red)
 * based on the Core dimension score.
 */

import type { ReactElement } from 'react';
import { classifyCoreHealth, type CoreHealthStatus } from '@compass/scoring';

interface CoreHealthIndicatorProps {
  /** Core dimension score (0-100). */
  coreScore: number;
}

const STATUS_CONFIG: Record<CoreHealthStatus, { label: string; bg: string; text: string; dot: string }> = {
  healthy: { label: 'Healthy', bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  fragile: { label: 'Fragile', bg: 'bg-[#FFF8E1]', text: 'text-[#F9A825]', dot: 'bg-[#F9A825]' },
  broken: { label: 'Broken', bg: 'bg-[#FFEBEE]', text: 'text-[#B71C1C]', dot: 'bg-[#B71C1C]' },
};

export function CoreHealthIndicator({ coreScore }: CoreHealthIndicatorProps): ReactElement {
  const status = classifyCoreHealth(coreScore);
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${config.bg}`}
      role="status"
      aria-label={`Core health: ${config.label}, score ${Math.round(coreScore)}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${config.text}`}>
        Core: {config.label}
      </span>
      <span className={`text-sm font-semibold ${config.text}`}>
        {Math.round(coreScore)}
      </span>
    </div>
  );
}
