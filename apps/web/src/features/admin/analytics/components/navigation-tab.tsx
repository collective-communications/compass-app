import type { ReactElement } from 'react';
import { Shield } from 'lucide-react';
import {
  AnalyticsCard,
  AnalyticsPill,
  BarList,
  SectionHeader,
  StackedBar,
} from './analytics-primitives';
import { getRouteSurface, getSurfaceLabel } from '../lib/labels';
import { getAudienceSplit } from '../lib/metrics';
import type { AnalyticsTabProps } from './overview-tab';

function SplitRow({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}): ReactElement {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-[var(--grey-900)]">
        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
        {count.toLocaleString()}
      </span>
      <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-[var(--grey-900)]">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export function NavigationTab({ summary }: AnalyticsTabProps): ReactElement {
  const surfaceItems = summary.bySurface.map((row) => ({
    key: row.surface,
    label: getSurfaceLabel(row.surface),
    value: row.count,
  }));
  const split = getAudienceSplit(summary);
  const splitTotal = split.admin + split.respondent + split.other;

  return (
    <div className="space-y-5">
      <AnalyticsCard padded={false}>
        <div className="p-5 pb-3">
          <SectionHeader
            eyebrow="Route views"
            title="Ranked route templates"
            hint="Templates only"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-[var(--grey-100)]">
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Route template
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Surface
                </th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Views
                </th>
                <th className="min-w-52 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.routeViewsByRoute.map((route) => {
                const surface = getRouteSurface(route.routeTemplate);
                const share = summary.routeViews > 0 ? route.count / summary.routeViews : 0;
                return (
                  <tr key={route.routeTemplate} className="border-b border-[var(--grey-100)]">
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-[var(--grey-900)]">
                        {route.routeTemplate}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <AnalyticsPill tone={surface === 'survey' ? 'coral' : 'neutral'}>
                        {getSurfaceLabel(surface)}
                      </AnalyticsPill>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--grey-900)]">
                      {route.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto flex max-w-52 items-center justify-end gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--grey-50)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-interactive)]"
                            style={{ width: `${Math.min(100, share * 100)}%` }}
                          />
                        </div>
                        <span className="min-w-12 text-right text-xs tabular-nums text-[var(--text-secondary)]">
                          {(share * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {summary.routeViewsByRoute.length === 0 && (
            <p className="px-5 py-6 text-sm text-[var(--text-secondary)]">
              No route views recorded for this date range.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--grey-100)] px-5 py-3 text-xs text-[var(--text-tertiary)]">
          <Shield size={13} aria-hidden="true" />
          <span>Route templates only. Raw URLs, query strings, hashes, and tokens stay out.</span>
        </div>
      </AnalyticsCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AnalyticsCard>
          <SectionHeader eyebrow="Surface usage" title="Activity by product surface" />
          <BarList
            items={surfaceItems}
            emptyLabel="No surface activity recorded for this date range."
          />
        </AnalyticsCard>

        <AnalyticsCard>
          <SectionHeader eyebrow="Audience split" title="Admin vs respondent activity" />
          <StackedBar
            heightClassName="h-3.5"
            segments={[
              {
                key: 'admin',
                label: 'Admin and reports',
                value: split.admin,
                color: 'var(--color-interactive)',
              },
              {
                key: 'respondent',
                label: 'Respondent surfaces',
                value: split.respondent,
                color: 'var(--color-clarity)',
              },
              {
                key: 'other',
                label: 'Auth and other',
                value: split.other,
                color: 'var(--grey-300)',
              },
            ]}
          />
          <div className="mt-5 space-y-3">
            <SplitRow
              color="var(--color-interactive)"
              label="Admin and reports"
              count={split.admin}
              total={splitTotal}
            />
            <SplitRow
              color="var(--color-clarity)"
              label="Respondent surfaces"
              count={split.respondent}
              total={splitTotal}
            />
            <SplitRow
              color="var(--grey-300)"
              label="Auth and other"
              count={split.other}
              total={splitTotal}
            />
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
