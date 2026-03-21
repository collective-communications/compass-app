/**
 * Survey card for the admin survey list.
 * Displays title, status badge, response count, completion %, and days remaining.
 * Left border color indicates status severity.
 */

import type { ReactElement } from 'react';
import { Settings, Edit, Link, BarChart3, Archive } from 'lucide-react';
import type { SurveyStatus } from '@compass/types';
import type { SurveyListItem } from '../services/admin-survey-service';

interface SurveyCardProps {
  survey: SurveyListItem;
  onClick: (surveyId: string) => void;
  onConfigure?: (surveyId: string) => void;
  onEditQuestions?: (surveyId: string) => void;
  onCopyLink?: (surveyId: string) => void;
  onViewResults?: (surveyId: string) => void;
  onArchive?: (surveyId: string) => void;
}

/** Maps survey status to left border color (severity indicator) */
const STATUS_BORDER_COLOR: Record<SurveyStatus, string> = {
  draft: 'border-l-[var(--grey-400)]',
  active: 'border-l-green-500',
  paused: 'border-l-yellow-500',
  closed: 'border-l-orange-500',
  archived: 'border-l-[var(--grey-300)]',
};

/** Maps survey status to badge styling */
const STATUS_BADGE_CLASS: Record<SurveyStatus, string> = {
  draft: 'bg-[var(--grey-100)] text-[var(--grey-700)]',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-yellow-50 text-yellow-700',
  closed: 'bg-orange-50 text-orange-700',
  archived: 'bg-[var(--grey-100)] text-[var(--text-secondary)]',
};

const STATUS_LABEL: Record<SurveyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
  archived: 'Archived',
};

function getDaysRemaining(closesAt: string | null): string | null {
  if (!closesAt) return null;
  const now = new Date();
  const closes = new Date(closesAt);
  const diffMs = closes.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${days}d remaining`;
}

/** Whether View Results should be enabled for this survey status */
function canViewResults(status: SurveyStatus): boolean {
  return status === 'closed' || status === 'archived';
}

/** Whether Archive action should be shown for this survey status */
function canArchive(status: SurveyStatus): boolean {
  return status === 'draft' || status === 'closed';
}

export function SurveyCard({
  survey,
  onClick,
  onConfigure,
  onEditQuestions,
  onCopyLink,
  onViewResults,
  onArchive,
}: SurveyCardProps): ReactElement {
  const daysRemaining = getDaysRemaining(survey.closesAt);
  const resultsEnabled = canViewResults(survey.status);

  return (
    <div
      role="group"
      aria-label={survey.title}
      className={`relative w-full rounded-lg border border-[var(--grey-100)] border-l-4 bg-[var(--grey-50)] p-6 text-left transition-shadow hover:shadow-md ${STATUS_BORDER_COLOR[survey.status]}`}
    >
      {/* Stretched overlay for primary click target */}
      <button
        type="button"
        onClick={() => onClick(survey.id)}
        className="absolute inset-0 z-0 cursor-pointer rounded-lg"
        aria-label={`Open ${survey.title}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[var(--grey-900)]">
            {survey.title}
          </h3>
          {survey.description && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--text-tertiary)]">
              {survey.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[survey.status]}`}
        >
          {STATUS_LABEL[survey.status]}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
        <span>{survey.responseCount} responses</span>
        {survey.completionPercent > 0 && (
          <span>{survey.completionPercent}% complete</span>
        )}
        {daysRemaining && <span>{daysRemaining}</span>}
      </div>

      {/* Action buttons — elevated above the overlay */}
      <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-[var(--grey-100)] pt-4">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfigure?.(survey.id); }}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
          aria-label="Configure survey"
        >
          <Settings size={14} />
          Configure
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEditQuestions?.(survey.id); }}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
          aria-label="Edit questions"
        >
          <Edit size={14} />
          Edit Questions
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCopyLink?.(survey.id); }}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
          aria-label="Copy survey link"
        >
          <Link size={14} />
          Copy Link
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (resultsEnabled) onViewResults?.(survey.id); }}
          disabled={!resultsEnabled}
          title={!resultsEnabled ? 'Publish and close a survey to view results' : undefined}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-tertiary)]"
          aria-label="View results"
        >
          <BarChart3 size={14} />
          View Results
        </button>
        {canArchive(survey.status) && onArchive && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onArchive(survey.id); }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
            aria-label="Archive survey"
          >
            <Archive size={14} />
            Archive
          </button>
        )}
      </div>
    </div>
  );
}
