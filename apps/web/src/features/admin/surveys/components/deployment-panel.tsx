/**
 * Active deployment panel showing shareable link, copy button, dates, and days remaining.
 * Provides deactivate/close-early action.
 */

import { useState, useCallback, type ReactElement } from 'react';
import type { Deployment, Survey } from '@compass/types';

export interface DeploymentPanelProps {
  deployment: Deployment;
  survey: Survey;
  /** Deactivate the deployment (close survey early) */
  onDeactivate: () => void;
  /** Whether a mutation is in progress */
  isPending: boolean;
}

function getDaysRemaining(closesAt: string | null): number | null {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DeploymentPanel({
  deployment,
  survey,
  onDeactivate,
  isPending,
}: DeploymentPanelProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const surveyUrl = `${window.location.origin}/s/${deployment.token}`;
  const daysRemaining = getDaysRemaining(survey.closesAt);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — select text as fallback
    }
  }, [surveyUrl]);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--grey-900)]">Active Deployment</h3>
        {daysRemaining !== null && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              daysRemaining <= 3
                ? 'bg-red-50 text-red-700'
                : daysRemaining <= 7
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-green-50 text-green-700'
            }`}
          >
            {daysRemaining === 0 ? 'Expired' : `${daysRemaining}d remaining`}
          </span>
        )}
      </div>

      {/* Survey Link */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 overflow-hidden rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 py-2">
          <p className="truncate text-sm text-[var(--grey-700)] select-all">{surveyUrl}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 py-2 text-sm font-medium text-[var(--grey-700)] hover:bg-[var(--grey-50)]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Dates */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[var(--grey-500)]">Opens</p>
          <p className="font-medium text-[var(--grey-900)]">{formatDate(survey.opensAt)}</p>
        </div>
        <div>
          <p className="text-[var(--grey-500)]">Closes</p>
          <p className="font-medium text-[var(--grey-900)]">{formatDate(survey.closesAt)}</p>
        </div>
      </div>

      {/* Access count */}
      <div className="mt-4 text-sm">
        <p className="text-[var(--grey-500)]">Link accessed</p>
        <p className="font-medium text-[var(--grey-900)]">
          {deployment.accessCount} {deployment.accessCount === 1 ? 'time' : 'times'}
        </p>
      </div>

      {/* Deactivate */}
      <div className="mt-6 border-t border-[var(--grey-100)] pt-4">
        <button
          type="button"
          onClick={onDeactivate}
          disabled={isPending}
          className="rounded-lg border border-red-200 bg-[var(--grey-50)] px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Closing...' : 'Close Early'}
        </button>
      </div>
    </div>
  );
}
