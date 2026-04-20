/**
 * Table of survey recipients with status badges and remove actions.
 * Shows a summary header with counts by status.
 */

import { useState, useCallback, type ReactElement } from 'react';
import type { SurveyRecipient } from '@compass/types';

export interface RecipientListProps {
  recipients: SurveyRecipient[];
  isLoading: boolean;
  onRemove: (recipientId: string) => void;
  isRemoving: boolean;
}

const STATUS_STYLES: Record<SurveyRecipient['status'], { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-[var(--grey-100)]', text: 'text-[var(--text-tertiary)]', label: 'Pending' },
  invited: { bg: 'bg-[var(--status-invited-bg)]', text: 'text-[var(--status-invited-text)]', label: 'Invited' },
  completed: { bg: 'bg-[var(--status-active-bg)]', text: 'text-[var(--status-active-text)]', label: 'Completed' },
  bounced: { bg: 'bg-[var(--status-bounced-bg)]', text: 'text-[var(--status-bounced-text)]', label: 'Bounced' },
};

function StatusBadge({ status }: { status: SurveyRecipient['status'] }): ReactElement {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function RecipientList({
  recipients,
  isLoading,
  onRemove,
  isRemoving,
}: RecipientListProps): ReactElement {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = useCallback(
    (id: string) => {
      setRemovingId(id);
      onRemove(id);
    },
    [onRemove],
  );

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
        Loading recipients...
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--grey-100)] py-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          No recipients added yet. Import a CSV or add manually.
        </p>
      </div>
    );
  }

  // Count by status
  const counts = recipients.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { pending: 0, invited: 0, completed: 0, bounced: 0 } as Record<SurveyRecipient['status'], number>,
  );

  const parts: string[] = [];
  if (counts.pending > 0) parts.push(`${counts.pending} pending`);
  if (counts.invited > 0) parts.push(`${counts.invited} invited`);
  if (counts.completed > 0) parts.push(`${counts.completed} completed`);
  if (counts.bounced > 0) parts.push(`${counts.bounced} bounced`);

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-[var(--grey-700)]">
        {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}{' '}
        <span className="font-normal text-[var(--text-secondary)]">({parts.join(', ')})</span>
      </p>

      <div className="overflow-hidden rounded-lg border border-[var(--grey-100)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--grey-50)]">
            <tr>
              <th className="px-4 py-2 font-medium text-[var(--text-tertiary)]">Name</th>
              <th className="px-4 py-2 font-medium text-[var(--text-tertiary)]">Email</th>
              <th className="px-4 py-2 font-medium text-[var(--text-tertiary)]">Status</th>
              <th className="px-4 py-2 font-medium text-[var(--text-tertiary)]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--grey-100)]">
            {recipients.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--grey-50)]">
                <td className="px-4 py-2 text-[var(--grey-900)]">
                  {r.name || <span className="text-[var(--text-tertiary)]">--</span>}
                </td>
                <td className="px-4 py-2 text-[var(--grey-700)]">{r.email}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemove(r.id)}
                    disabled={isRemoving && removingId === r.id}
                    className="text-xs font-medium text-[var(--feedback-error-text)] hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
