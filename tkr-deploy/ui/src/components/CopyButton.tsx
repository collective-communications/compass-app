/**
 * CopyButton — copies `getText()` to the clipboard and shows a 2s "Copied"
 * confirmation in-place. Preserves the aria-live announcement from the
 * legacy component so screen readers still get feedback.
 *
 * @module components/CopyButton
 */

import type { JSX } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

export interface CopyButtonProps {
  getText: () => string;
  /** Label shown when idle. Default "Copy". */
  idleLabel?: string;
}

type Phase = 'idle' | 'copied' | 'failed';

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Copy',
  copied: 'Copied',
  failed: 'Failed',
};

const PHASE_ANNOUNCEMENTS: Record<Phase, string> = {
  idle: '',
  copied: 'Copied to clipboard',
  failed: 'Copy failed',
};

// Inline style constants — these are screen-reader-only positioning that the
// design system does not expose as CSS tokens.
const SR_ONLY_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
} as const;

export function CopyButton(props: CopyButtonProps): JSX.Element {
  const { getText, idleLabel } = props;
  const [phase, setPhase] = useState<Phase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getText());
      setPhase('copied');
    } catch {
      setPhase('failed');
    }
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase('idle'), 2000);
  };

  const label = phase === 'idle' ? (idleLabel ?? PHASE_LABELS.idle) : PHASE_LABELS[phase];

  return (
    <button
      type="button"
      class="btn btn--secondary"
      aria-label="Copy to clipboard"
      onClick={() => void onClick()}
    >
      <span class="btn__label">{label}</span>
      <span aria-live="polite" role="status" style={SR_ONLY_STYLE}>
        {PHASE_ANNOUNCEMENTS[phase]}
      </span>
    </button>
  );
}
