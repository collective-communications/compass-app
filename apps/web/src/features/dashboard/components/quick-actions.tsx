/**
 * Quick action button for the active survey: copy link.
 * Shows inline "Copied!" feedback (no toast).
 */

import { useState, useCallback, type ReactElement } from 'react';
import { Link2 } from 'lucide-react';

interface QuickActionsProps {
  /** Deployment URL to copy to clipboard */
  deploymentUrl: string | null;
}

export function QuickActions({
  deploymentUrl,
}: QuickActionsProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!deploymentUrl) return;
    try {
      await navigator.clipboard.writeText(deploymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fallback
    }
  }, [deploymentUrl]);

  return (
    <div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!deploymentUrl}
        aria-label="Copy survey link to clipboard"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-3 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-50)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
