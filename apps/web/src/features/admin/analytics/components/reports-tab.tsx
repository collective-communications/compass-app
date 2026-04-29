import type { ReactElement } from 'react';
import { AnalyticsEventName, ReportFormat } from '@compass/types';
import {
  AnalyticsCard,
  BarList,
  SectionHeader,
  StackedBar,
} from './analytics-primitives';
import {
  getReportFormatLabel,
  getResultsTabLabel,
} from '../lib/labels';
import {
  getActionStatusCounts,
  getEventCount,
  getStatusSegments,
} from '../lib/metrics';
import type { AnalyticsTabProps } from './overview-tab';

function getReportFormatColor(format: string): string {
  if (format === ReportFormat.PDF) return 'var(--color-clarity)';
  if (format === ReportFormat.PPTX) return 'var(--color-rose)';
  if (format === ReportFormat.DOCX) return 'var(--color-connection)';
  return 'var(--color-interactive)';
}

export function ReportsTab({ summary }: AnalyticsTabProps): ReactElement {
  const resultsItems = summary.resultsTabs.map((row) => ({
    key: row.resultsTab,
    label: getResultsTabLabel(row.resultsTab),
    value: row.count,
    description: row.resultsTab,
  }));
  const reportFormatItems = summary.reportFormats.map((row) => ({
    key: row.reportFormat,
    label: getReportFormatLabel(row.reportFormat),
    value: row.count,
    color: getReportFormatColor(row.reportFormat),
  }));
  const generationCounts = getActionStatusCounts(
    summary,
    AnalyticsEventName.REPORT_GENERATION_REQUESTED,
  );
  const generationSegments = getStatusSegments(generationCounts);
  const reportDownloads = getEventCount(summary, AnalyticsEventName.REPORT_DOWNLOAD_REQUESTED);

  return (
    <div className="space-y-5">
      <AnalyticsCard>
        <SectionHeader
          eyebrow="Results tab usage"
          title="Where leadership lands inside results"
          hint="Sorted by count"
        />
        <BarList
          items={resultsItems}
          emptyLabel="No results tab views recorded for this date range."
        />
      </AnalyticsCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
        <AnalyticsCard>
          <SectionHeader
            eyebrow="Report generation"
            title="Outcomes of generation requests"
            hint="Counts only"
          />
          <StackedBar segments={generationSegments} heightClassName="h-3" />
          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
            {generationSegments.map((segment) => (
              <div key={segment.key} className="border-l-2 pl-3" style={{ borderColor: segment.color }}>
                <dt className="text-xs text-[var(--text-tertiary)]">{segment.label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--grey-900)]">
                  {segment.value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">
            Failures show counts only. Error messages and signed paths are not analytics data.
          </p>
        </AnalyticsCard>

        <AnalyticsCard>
          <SectionHeader eyebrow="Downloads" title="Report downloads by format" />
          <BarList
            items={reportFormatItems}
            emptyLabel="No report downloads recorded by format for this date range."
          />
          <div className="mt-4 flex items-baseline justify-between border-t border-[var(--grey-100)] pt-3">
            <span className="text-xs text-[var(--text-tertiary)]">Total downloads</span>
            <span className="text-xl font-semibold tabular-nums text-[var(--grey-900)]">
              {reportDownloads.toLocaleString()}
            </span>
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
