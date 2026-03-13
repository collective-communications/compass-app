/**
 * Active deployment panel showing shareable link, copy button, dates, and days remaining.
 * Provides deactivate/close-early action.
 */

import { useState, useCallback, type ReactElement } from 'react';
import type { Deployment, Survey } from '@compass/types';
import { useRecipientStats, useSendInvitations } from '../hooks/use-recipients';

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
          <p className="text-[var(--text-secondary)]">Opens</p>
          <p className="font-medium text-[var(--grey-900)]">{formatDate(survey.opensAt)}</p>
        </div>
        <div>
          <p className="text-[var(--text-secondary)]">Closes</p>
          <p className="font-medium text-[var(--grey-900)]">{formatDate(survey.closesAt)}</p>
        </div>
      </div>

      {/* Access count */}
      <div className="mt-4 text-sm">
        <p className="text-[var(--text-secondary)]">Link accessed</p>
        <p className="font-medium text-[var(--grey-900)]">
          {deployment.accessCount} {deployment.accessCount === 1 ? 'time' : 'times'}
        </p>
      </div>

      {/* Send Invitations (email_invite deployments) */}
      {deployment.type === 'email_invite' && (
        <EmailInviteSection surveyId={survey.id} deploymentId={deployment.id} />
      )}

      {/* Deactivate */}
      <div className="mt-6 border-t border-[var(--grey-100)] pt-4">
        <button
          type="button"
          onClick={onDeactivate}
          disabled={isPending}
          className="rounded-lg border border-red-300 bg-[var(--grey-50)] px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Closing...' : 'Close Early'}
        </button>
      </div>
    </div>
  );
}

// ─── Email Invite Section ────────────────────────────────────────────────────

function EmailInviteSection({
  surveyId,
  deploymentId,
}: {
  surveyId: string;
  deploymentId: string;
}): ReactElement {
  const { data: stats } = useRecipientStats(surveyId);
  const sendMutation = useSendInvitations();
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSend = useCallback(async () => {
    const data = await sendMutation.mutateAsync({ surveyId, deploymentId });
    setResult({ sent: data.sent, failed: data.failed });
  }, [surveyId, deploymentId, sendMutation]);

  if (!stats || stats.pending === 0) return <></>;

  return (
    <div className="mt-4 border-t border-[var(--grey-100)] pt-4">
      <p className="text-sm font-medium text-[var(--grey-700)]">Email Invitations</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        {stats.pending} pending recipient{stats.pending !== 1 ? 's' : ''} ready to receive invitations
      </p>

      {result && (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
          Sent: {result.sent}{result.failed > 0 ? `, Failed: ${result.failed}` : ''}
        </p>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={sendMutation.isPending}
        className="mt-3 rounded-lg bg-[var(--color-core)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sendMutation.isPending ? 'Sending...' : `Send Invitations (${stats.pending})`}
      </button>
    </div>
  );
}
