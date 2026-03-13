/**
 * Response tracking panel displaying total responses, completion rate,
 * department breakdown, and average completion time.
 */

import type { ReactElement } from 'react';
import type { ResponseMetrics } from '../services/deployment-service';
import type { ConnectionStatus } from '../hooks/use-realtime-responses';

export interface ResponseTrackerProps {
  metrics: ResponseMetrics;
  /** Realtime connection status indicator */
  connectionStatus: ConnectionStatus;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours}h ${remainingMin}m`;
}

const CONNECTION_INDICATOR: Record<ConnectionStatus, { label: string; className: string }> = {
  connected: { label: 'Live', className: 'bg-green-500' },
  polling: { label: 'Polling', className: 'bg-yellow-500' },
  disconnected: { label: 'Offline', className: 'bg-[var(--grey-400)]' },
};

export function ResponseTracker({
  metrics,
  connectionStatus,
}: ResponseTrackerProps): ReactElement {
  const {
    totalResponses,
    completedResponses,
    completionRate,
    averageCompletionTimeMs,
    departmentBreakdown,
  } = metrics;

  const indicator = CONNECTION_INDICATOR[connectionStatus];
  const maxDeptCount = Math.max(...departmentBreakdown.map((d) => d.count), 1);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--grey-900)]">Responses</h3>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${indicator.className}`} />
          <span className="text-xs text-[var(--text-secondary)]">{indicator.label}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-semibold text-[var(--grey-900)]">{totalResponses}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--grey-900)]">{completedResponses}</p>
          <p className="text-xs text-[var(--text-secondary)]">Completed</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--grey-900)]">
            {averageCompletionTimeMs !== null ? formatDuration(averageCompletionTimeMs) : '--'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Avg. Time</p>
        </div>
      </div>

      {/* Completion rate progress bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--grey-700)]">Completion Rate</span>
          <span className="font-medium text-[var(--grey-900)]">{completionRate.toFixed(1)}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--grey-100)]">
          <div
            className="h-full rounded-full bg-[var(--grey-700)] transition-all duration-300"
            style={{ width: `${Math.min(completionRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Department breakdown */}
      {departmentBreakdown.length > 0 && (
        <div className="mt-5 border-t border-[var(--grey-100)] pt-4">
          <p className="text-xs font-medium text-[var(--grey-700)]">By Department</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {departmentBreakdown.map((dept) => (
              <div key={dept.department}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--grey-700)]">{dept.department}</span>
                  <span className="font-medium text-[var(--grey-900)]">{dept.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--grey-100)]">
                  <div
                    className="h-full rounded-full bg-[var(--grey-500)] transition-all duration-300"
                    style={{ width: `${(dept.count / maxDeptCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
