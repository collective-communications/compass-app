/**
 * Shared Card container component.
 * Default: white card with grey border, rounded corners, padding.
 * Optional severity prop adds a colored left border and background fill.
 */

import type { ReactNode, HTMLAttributes } from 'react';

type Severity = 'critical' | 'high' | 'medium' | 'healthy';

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'border-l-4 border-l-[#D32F2F] bg-[#FFEBEE]',
  high: 'border-l-4 border-l-[#F57C00] bg-[#FFF3E0]',
  medium: 'border-l-4 border-l-[#FBC02D] bg-[#FFFDE7]',
  healthy: 'border-l-4 border-l-[#388E3C] bg-[#E8F5E9]',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  severity?: Severity;
  children: ReactNode;
  className?: string;
}

export function Card({ severity, children, className, ...rest }: CardProps): ReactNode {
  const base = 'bg-white border border-[var(--grey-200,#E5E4E0)] rounded-lg p-6';
  const severityClass = severity ? SEVERITY_STYLES[severity] : '';
  const classes = [base, severityClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
