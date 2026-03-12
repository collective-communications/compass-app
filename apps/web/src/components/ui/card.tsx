/**
 * Shared Card container component.
 * Default: white card with grey border, rounded corners, padding.
 * Optional severity prop adds a colored left border and background fill.
 */

import type { ReactNode, HTMLAttributes } from 'react';

type Severity = 'critical' | 'high' | 'medium' | 'healthy';

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'border-l-4 border-l-[var(--severity-critical-border)] bg-[var(--severity-critical-bg)]',
  high: 'border-l-4 border-l-[var(--severity-high-border)] bg-[var(--severity-high-bg)]',
  medium: 'border-l-4 border-l-[var(--severity-medium-border)] bg-[var(--severity-medium-bg)]',
  healthy: 'border-l-4 border-l-[var(--severity-healthy-border)] bg-[var(--severity-healthy-bg)]',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  severity?: Severity;
  children: ReactNode;
  className?: string;
}

export function Card({ severity, children, className, ...rest }: CardProps): ReactNode {
  const base = 'bg-[var(--surface-card)] border border-[var(--grey-200,#E5E4E0)] rounded-lg p-6';
  const severityClass = severity ? SEVERITY_STYLES[severity] : '';
  const classes = [base, severityClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
