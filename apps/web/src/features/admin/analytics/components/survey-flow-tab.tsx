import type { ReactElement } from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { AnalyticsEventName, AnalyticsSurveyResolutionStatus } from '@compass/types';
import {
  AnalyticsCard,
  AnalyticsPill,
  BarList,
  SectionHeader,
} from './analytics-primitives';
import {
  getEventLabel,
  getResolutionStatusLabel,
} from '../lib/labels';
import {
  getCompletionEventRatio,
  getEventCount,
} from '../lib/metrics';
import type { AnalyticsTabProps } from './overview-tab';

const SURVEY_FLOW_EVENTS = [
  {
    eventName: AnalyticsEventName.SURVEY_DEPLOYMENT_RESOLVED,
    label: 'Resolved',
    description: 'Token validated',
  },
  {
    eventName: AnalyticsEventName.SURVEY_STARTED,
    label: 'Started',
    description: 'First question loaded',
  },
  {
    eventName: AnalyticsEventName.SURVEY_PROGRESS_SAVED,
    label: 'Saved',
    description: 'Progress checkpoints',
  },
  {
    eventName: AnalyticsEventName.SURVEY_RESUMED,
    label: 'Resumed',
    description: 'Returning sessions',
  },
  {
    eventName: AnalyticsEventName.SURVEY_OPEN_TEXT_SUBMITTED,
    label: 'Open text',
    description: 'Free-text submitted',
  },
  {
    eventName: AnalyticsEventName.SURVEY_COMPLETED,
    label: 'Completed',
    description: 'Final submission',
  },
] as const;

function getResolutionTone(status: string): 'healthy' | 'critical' | 'medium' | 'neutral' {
  if (status === AnalyticsSurveyResolutionStatus.VALID) return 'healthy';
  if (status === AnalyticsSurveyResolutionStatus.ERROR) return 'critical';
  if (
    status === AnalyticsSurveyResolutionStatus.CLOSED
    || status === AnalyticsSurveyResolutionStatus.EXPIRED
  ) {
    return 'medium';
  }
  return 'neutral';
}

export function SurveyFlowTab({ summary }: AnalyticsTabProps): ReactElement {
  const steps = SURVEY_FLOW_EVENTS.map((step) => ({
    ...step,
    count: getEventCount(summary, step.eventName),
  }));
  const max = Math.max(1, ...steps.map((step) => step.count));
  const skipped = getEventCount(summary, AnalyticsEventName.SURVEY_OPEN_TEXT_SKIPPED);
  const edgeStates = getEventCount(summary, AnalyticsEventName.SURVEY_EDGE_STATE_VIEWED);

  return (
    <div className="space-y-5">
      <AnalyticsCard>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            eyebrow="Lifecycle event counts"
            title="Aggregate respondent journey"
          />
          <AnalyticsPill tone="info">
            <Shield size={11} aria-hidden="true" />
            Event counts, not unique people
          </AnalyticsPill>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {steps.map((step, index) => (
            <div key={step.eventName} className="relative flex min-h-48 flex-col justify-end">
              <div className="mb-2 text-center">
                <p className="text-xl font-semibold tabular-nums text-[var(--grey-900)]">
                  {step.count.toLocaleString()}
                </p>
              </div>
              <div
                className="mx-auto w-2/3 rounded-t bg-[var(--color-interactive)]"
                style={{
                  height: `${Math.max(8, (step.count / max) * 140)}px`,
                  opacity: 0.9 - index * 0.06,
                }}
              />
              {index < steps.length - 1 && (
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="absolute right-[-14px] top-1/2 hidden text-[var(--grey-300)] xl:block"
                />
              )}
              <div className="border-t border-[var(--grey-100)] pt-3 text-center">
                <p className="text-xs font-semibold text-[var(--grey-900)]">{step.label}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  {step.description}
                </p>
                <code className="mt-1 block font-mono text-[10px] text-[var(--text-tertiary)]">
                  {step.eventName}
                </code>
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-[var(--grey-100)] pt-4 md:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Completion events / start events
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--grey-900)]">
              {(getCompletionEventRatio(summary) * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Open text skipped
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--grey-900)]">
              {skipped.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Edge-state views
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--grey-900)]">
              {edgeStates.toLocaleString()}
            </dd>
          </div>
        </dl>
      </AnalyticsCard>

      <AnalyticsCard>
        <SectionHeader
          eyebrow="Resolution statuses"
          title="Deployment link outcomes"
          hint="Aggregate counts"
        />
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          {summary.surveyResolutionStatuses.map((row) => (
            <div
              key={row.status}
              className="flex items-center justify-between gap-3 border-b border-[var(--grey-100)] py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AnalyticsPill tone={getResolutionTone(row.status)}>
                  {getResolutionStatusLabel(row.status)}
                </AnalyticsPill>
                <code className="truncate font-mono text-[11px] text-[var(--text-tertiary)]">
                  {row.status}
                </code>
              </div>
              <span className="font-semibold tabular-nums text-[var(--grey-900)]">
                {row.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {summary.surveyResolutionStatuses.length === 0 && (
          <BarList
            items={[]}
            emptyLabel={`No ${getEventLabel(AnalyticsEventName.SURVEY_DEPLOYMENT_RESOLVED).toLowerCase()} recorded for this date range.`}
          />
        )}
      </AnalyticsCard>
    </div>
  );
}
